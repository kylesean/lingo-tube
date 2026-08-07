import { execFile } from 'child_process';
import * as https from 'https';
import { VideoStreamInfo, SubtitleData, SubtitleLine, IVideoService, YtDlpOutput, YtDlpSubtitleTrack } from '../types';
import { SubtitleService } from './subtitle-service';
import { logger } from './logger';

export class VideoService implements IVideoService {
  private readonly timeout = 30000;
  private readonly subtitleTimeout = 10000;
  /**
   * 格式选择：仅使用 MP4 渐进式单流（itag 22/18，H.264+AAC 内嵌音轨）。
   * 单文件、音画合成，浏览器原生播放无需 JS 双流同步，兼容性最好、最稳定。
   *
   * 注意：LingoTube 暂不支持官方 VS Code（其 Chromium 内核去除了 AAC/H.264
   * 解码器，无法播放 MP4）。本插件面向内置专有解码器的 fork IDE
   * （如 Antigravity / Cursor / Qoder 等）。
   */
  private readonly formatSelector = '22/18';
  private readonly subtitleLangPriority = ['en', 'zh-Hans', 'zh-Hant', 'zh', 'en-orig'];
  private readonly subtitleService = new SubtitleService();

  async getStreamInfo(videoId: string): Promise<VideoStreamInfo | null> {
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    return new Promise((resolve, reject) => {
      execFile(
        'yt-dlp',
        ['-f', this.formatSelector, '--no-playlist', '-j', url],
        { timeout: this.timeout },
        async (error, stdout) => {
          if (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
              const msg = 'yt-dlp 未安装。请先安装 yt-dlp：https://github.com/yt-dlp/yt-dlp';
              logger.error(msg);
              reject(new Error(msg));
            } else {
              logger.error('yt-dlp 错误:', error.message);
              reject(error);
            }
            return;
          }

          try {
            const info: YtDlpOutput = JSON.parse(stdout);
            const title = info.title || '';

            // 渐进式单流：音画内嵌于同一文件，url 位于 JSON 顶层。
            const streamUrl = info.url;

            if (!streamUrl) {
              resolve(null);
              return;
            }

            const rawSubtitles = await this.fetchSubtitles(info);
            const subtitles: SubtitleLine[] | undefined =
              rawSubtitles ? this.subtitleService.parseSubtitles(rawSubtitles) : undefined;

            resolve({
              streamUrl,
              title,
              subtitles,
              container: info.ext
            });
          } catch (e) {
            logger.error('JSON 解析错误:', e);
            reject(e);
          }
        }
      );
    });
  }

  extractVideoId(input: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
    const match = input.match(regex);

    if (match) {
      return match[1];
    }

    if (input.trim().length === 11 && /^[a-zA-Z0-9_-]+$/.test(input.trim())) {
      return input.trim();
    }

    return null;
  }

  private async fetchSubtitles(videoInfo: YtDlpOutput): Promise<SubtitleData | undefined> {
    const hasManualSubs = videoInfo.subtitles && Object.keys(videoInfo.subtitles).length > 0;
    const subSource = hasManualSubs ? videoInfo.subtitles! : (videoInfo.automatic_captions || {});

    let selectedSub: YtDlpSubtitleTrack | null = null;
    for (const lang of this.subtitleLangPriority) {
      if (subSource[lang]) {
        const found = subSource[lang].find((s: YtDlpSubtitleTrack) => s.ext === 'json3');
        if (found) {
          selectedSub = found;
          break;
        }
      }
    }

    if (!selectedSub) {
      const firstLang = Object.keys(subSource)[0];
      if (firstLang) {
        selectedSub = subSource[firstLang].find((s: YtDlpSubtitleTrack) => s.ext === 'json3') || null;
      }
    }

    if (!selectedSub?.url) {
      return undefined;
    }

    const subtitleUrl = selectedSub.url;

    return new Promise((resolve, reject) => {
      const req = https.get(subtitleUrl, (resp) => {
        let data = '';
        resp.on('data', (chunk: Buffer) => data += chunk.toString());
        resp.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', (err) => {
        logger.error('字幕获取失败:', err.message);
        reject(err);
      });

      req.setTimeout(this.subtitleTimeout, () => {
        logger.warn('字幕下载超时，已取消请求');
        req.destroy();
        reject(new Error('Subtitle download timeout'));
      });
    });
  }
}
