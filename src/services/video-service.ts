import { execFile } from 'child_process';
import * as https from 'https';
import { VideoStreamInfo, SubtitleData, SubtitleLine, IVideoService, YtDlpOutput, YtDlpSubtitleTrack } from '../types';
import { SubtitleService } from './subtitle-service';
import { logger } from './logger';

export class VideoService implements IVideoService {
  private readonly timeout = 30000;
  private readonly subtitleTimeout = 10000;
  /**
   * 格式选择策略（按优先级）：
   * 1. WebM/VP9 视频 + WebM/Opus 音频（分离流）—— 全部为免专利开放编码，
   *    官方 VS Code 等去除了 AAC/H.264 解码器的 Chromium 内核也能正常播放；
   * 2. WebM 单文件渐进式流（itag 43 等，VP8+Vorbis）；
   * 3. WebM 视频 + 任意最佳音频（个别视频无 Opus 时的兜底）；
   * 4. 经典 MP4 渐进式流（itag 22/18）—— 供内置专有解码器的 fork（Cursor 等）兜底。
   *
   * 注意：选择 "video+audio" 组合时 yt-dlp 在 `-j` 模式下仅输出 JSON
   * （不下载、不合并，因此无需安装 ffmpeg），分离的流地址位于
   * 输出 JSON 的 requested_formats 字段中，由 Webview 侧做 A/V 同步。
   */
  private readonly formatSelector =
    'bestvideo[ext=webm][height<=720]+bestaudio[ext=webm]' +
    '/best[ext=webm][vcodec!=none][acodec!=none]' +
    '/bestvideo[ext=webm][height<=720]+bestaudio' +
    '/22/18';
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

            // 组合选择（video+audio）时 yt-dlp 返回 requested_formats 分离流；
            // 单一渐进式格式时 url 在顶层。
            const formats = info.requested_formats ?? [];
            const videoTrack = formats.find(f => f.url && f.vcodec && f.vcodec !== 'none');
            const audioTrack = formats.find(f => f.url && f.acodec && f.acodec !== 'none');

            const streamUrl = videoTrack?.url ?? info.url;

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
              audioUrl: audioTrack?.url,
              container: videoTrack?.ext ?? info.ext,
              audioContainer: audioTrack?.ext
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
