/**
 * YouTube Watcher 类型定义
 */

import * as vscode from 'vscode';

/** Webview 消息类型 */
export interface WebviewMessage {
  type: 'search' | 'translate' | 'aiAction' | 'openExternal' | 'camouflageState';
  value?: string | boolean;
  id?: string;
  text?: string;
  context?: string; // 翻译时的句子上下文
}

/** 视频流信息 */
export interface VideoStreamInfo {
  streamUrl: string;
  title: string;
  subtitles?: SubtitleData;
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

/** AI 服务接口 */
export interface IAIService {
  updateContext(title: string, subs: unknown): void;
  translate(text: string, context?: string): Promise<string>;
  analyzeSpecific(text: string): Promise<string>;
  getSummarySimple(): Promise<string>;
  getAnalyzeSimple(): Promise<string>;
  handleSummarize(stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<void>;
  handleAnalyze(prompt: string, stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<void>;
  handleGeneralChat(prompt: string, stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<void>;
}

/** 视频服务接口 */
export interface IVideoService {
  getStreamInfo(videoId: string): Promise<VideoStreamInfo | null>;
  extractVideoId(input: string): string | null;
}
