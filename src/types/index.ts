/**
 * YouTube Watcher 类型定义
 */

import * as vscode from 'vscode';

/** Webview 消息类型 */
export interface WebviewMessage {
  type: 'search' | 'translate' | 'aiAction' | 'openExternal' | 'camouflageState' | 'saveVocabulary';
  value?: string | boolean;
  id?: string;
  text?: string;
  context?: string;
  vocabulary?: VocabularyItem[];
}

/** 生词本条目 */
export interface VocabularyItem {
  word: string;
  meaning: string;
}

/** 视频流信息 */
export interface VideoStreamInfo {
  streamUrl: string;
  title: string;
  subtitles?: SubtitleLine[];
  /** 独立音频流 URL（如 Opus/WebM）。存在时需与视频流分离同步播放 */
  audioUrl?: string;
  /** 视频流容器扩展名，如 'webm' | 'mp4'，用于设置正确的 MIME 类型 */
  container?: string;
  /** 音频流容器扩展名，如 'webm' | 'm4a' */
  audioContainer?: string;
}

/** 字幕数据 */
export interface SubtitleData {
  events?: SubtitleEvent[];
}

/** 字幕事件 */
export interface SubtitleEvent {
  tStartMs: number;
  dDurationMs?: number;
  segs?: SubtitleSegment[];
}

/** 字幕片段 */
export interface SubtitleSegment {
  utf8: string;
}

/** 解析后的字幕行 */
export interface SubtitleLine {
  start: number;
  duration: number;
  text: string;
}

/** AI 配置 */
export interface AIConfig {
  apiKey?: string;
  baseUrl: string;
  model: string;
  autoSelectFamilyTimeout: number;
}

/** 视频上下文（用于持久化） */
export interface VideoContext {
  title: string;
  subs: string;
}

/** yt-dlp 选中的单个格式条目（requested_formats 元素） */
export interface YtDlpRequestedFormat {
  url?: string;
  ext?: string;
  /** 视频编码，如 'vp9'；纯音频流为 'none' */
  vcodec?: string;
  /** 音频编码，如 'opus'；纯视频流为 'none' */
  acodec?: string;
  height?: number;
}

/** yt-dlp JSON output (partial - only fields used by VideoService) */
export interface YtDlpOutput {
  url?: string;
  /** 单一（合并）格式的容器扩展名，如 'mp4' | 'webm' */
  ext?: string;
  title?: string;
  /** 选择 "video+audio" 组合格式时，yt-dlp 在此返回分离的流列表 */
  requested_formats?: YtDlpRequestedFormat[];
  subtitles?: Record<string, Array<{ ext: string; url: string }>>;
  automatic_captions?: Record<string, Array<{ ext: string; url: string }>>;
}

/** Subtitle track entry from yt-dlp output */
export interface YtDlpSubtitleTrack {
  ext: string;
  url: string;
}

/** AI 服务接口 */
export interface IAIService {
  updateContext(title: string, subs: unknown): void;
  translate(text: string, context?: string): Promise<string>;
  analyzeSpecific(text: string): Promise<string>;
  getSummarySimple(): Promise<string>;
  getAnalyzeSimple(): Promise<string>;
}

/** 视频服务接口 */
export interface IVideoService {
  getStreamInfo(videoId: string): Promise<VideoStreamInfo | null>;
  extractVideoId(input: string): string | null;
}
