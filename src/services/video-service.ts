/**
 * 视频服务 - 负责获取 YouTube 视频流和字幕
 */

import { exec } from 'child_process';
import * as https from 'https';
import { VideoStreamInfo, SubtitleData, IVideoService } from '../types';

export class VideoService implements IVideoService {
  /** yt-dlp 命令超时时间（毫秒） */
  private readonly timeout = 30000;

  /** 视频格式选择（优先高清，退回标清） */
  private readonly formatSelector = '22/18';

  /** 字幕语言优先级 */
  private readonly subtitleLangPriority = ['en', 'zh-Hans', 'zh-Hant', 'zh', 'en-orig'];

  /**
   * 获取视频流信息
   * @param videoId YouTube 视频 ID
   * @returns 视频流信息，包括 URL、标题和字幕
   */
  async getStreamInfo(videoId: string): Promise<VideoStreamInfo | null> {
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    return new Promise((resolve) => {
      exec(
        `yt-dlp -f "${this.formatSelector}" -j "${url}"`,
        { timeout: this.timeout },
        async (error, stdout) => {
          if (error) {
            console.error('[@yt] yt-dlp 错误:', error.message);
            resolve(null);
            return;
          }

          try {
            const info = JSON.parse(stdout);
            const streamUrl = info.url;
            const title = info.title || '';

            if (!streamUrl) {
              resolve(null);
              return;
            }

            // 获取字幕
            const subtitles = await this.fetchSubtitles(info);

            resolve({
              streamUrl,
              title,
              subtitles
            });
          } catch (e) {
            console.error('[@yt] JSON 解析错误:', e);
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
    // 匹配各种 YouTube URL 格式 (包括 standard, short, embed, shorts)
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = input.match(regex);

    if (match) {
      return match[1];
    }

    // 如果输入本身就是 11 位字符，视为视频 ID
    if (input.trim().length === 11 && /^[a-zA-Z0-9_-]+$/.test(input.trim())) {
      return input.trim();
    }

    return null;
  }

  /**
   * 获取视频字幕
   */
  private async fetchSubtitles(videoInfo: any): Promise<SubtitleData | undefined> {
    const hasManualSubs = videoInfo.subtitles && Object.keys(videoInfo.subtitles).length > 0;
    const subSource = hasManualSubs ? videoInfo.subtitles : (videoInfo.automatic_captions || {});

    // 按优先级查找字幕
    let selectedSub = null;
    for (const lang of this.subtitleLangPriority) {
      if (subSource[lang]) {
        selectedSub = subSource[lang].find((s: any) => s.ext === 'json3');
        if (selectedSub) {
          break;
        }
      }
    }

    // 如果没有找到优先语言，使用第一个可用的
    if (!selectedSub) {
      const firstLang = Object.keys(subSource)[0];
      if (firstLang) {
        selectedSub = subSource[firstLang].find((s: any) => s.ext === 'json3');
      }
    }

    if (!selectedSub?.url) {
      return undefined;
    }

    // 下载字幕内容
    return new Promise((resolve) => {
      https.get(selectedSub.url, (resp) => {
        let data = '';
        resp.on('data', (chunk: Buffer) => data += chunk.toString());
        resp.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(undefined);
          }
        });
      }).on('error', (err) => {
        console.error('[@yt] 字幕获取失败:', err.message);
        resolve(undefined);
      });
    });
  }
}
