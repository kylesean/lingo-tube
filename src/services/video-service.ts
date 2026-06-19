/**
 * 视频服务 - 负责获取 YouTube 视频流和字幕
 */

import { execFile } from 'child_process';
import * as https from 'https';
import { VideoStreamInfo, SubtitleData, IVideoService, YtDlpOutput, YtDlpSubtitleTrack } from '../types';
import { logger } from './logger';

export class VideoService implements IVideoService {
  /** yt-dlp command timeout (ms) */
  private readonly timeout = 30000;

  /** Subtitle download timeout (ms) */
  private readonly subtitleTimeout = 10000;

  /** Video format selector (prefer HD, fallback to SD) */
  private readonly formatSelector = '22/18';

  /** Subtitle language priority */
  private readonly subtitleLangPriority = ['en', 'zh-Hans', 'zh-Hant', 'zh', 'en-orig'];

  /**
   * 获取视频流信息
   * @param videoId YouTube 视频 ID
   * @returns 视频流信息，包括 URL、标题和字幕
   */
  async getStreamInfo(videoId: string): Promise<VideoStreamInfo | null> {
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    return new Promise((resolve) => {
      execFile(
        'yt-dlp',
        ['-f', this.formatSelector, '-j', url],
        { timeout: this.timeout },
        async (error, stdout) => {
          if (error) {
            logger.error('yt-dlp 错误:', error.message);
            resolve(null);
            return;
          }

          try {
            const info: YtDlpOutput = JSON.parse(stdout);
            const streamUrl = info.url;
            const title = info.title || '';

            if (!streamUrl) {
              resolve(null);
              return;
            }

            // Fetch subtitles
            const subtitles = await this.fetchSubtitles(info);

            resolve({
              streamUrl,
              title,
              subtitles
            });
          } catch (e) {
            logger.error('JSON 解析错误:', e);
            resolve(null);
          }
        }
      );
    });
  }

  /**
   * 从输入中提取 YouTube 视频 ID
   * @param input YouTube 链接或视频 ID
   * @returns 视频 ID，无效输入返回 null
   */
  extractVideoId(input: string): string | null {
    // Match various YouTube URL formats (standard, short, embed, shorts)
    const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
    const match = input.match(regex);

    if (match) {
      return match[1];
    }

    // If input itself is 11 characters, treat as video ID
    if (input.trim().length === 11 && /^[a-zA-Z0-9_-]+$/.test(input.trim())) {
      return input.trim();
    }

    return null;
  }

  /**
   * 获取视频字幕
   */
  private async fetchSubtitles(videoInfo: YtDlpOutput): Promise<SubtitleData | undefined> {
    const hasManualSubs = videoInfo.subtitles && Object.keys(videoInfo.subtitles).length > 0;
    const subSource = hasManualSubs ? videoInfo.subtitles! : (videoInfo.automatic_captions || {});

    // Find subtitle by language priority
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

    // If no preferred language found, use the first available
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

    // Download subtitle content (with timeout)
    return new Promise((resolve) => {
      const req = https.get(subtitleUrl, (resp) => {
        let data = '';
        resp.on('data', (chunk: Buffer) => data += chunk.toString());
        resp.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(undefined);
          }
        });
      });

      req.on('error', (err) => {
        logger.error('字幕获取失败:', err.message);
        resolve(undefined);
      });

      req.setTimeout(this.subtitleTimeout, () => {
        logger.warn('字幕下载超时，已取消请求');
        req.destroy();
        resolve(undefined);
      });
    });
  }
}
