/**
 * YouTube 学习助手 - VSCode 扩展入口
 * 
 * 这是一个帮助用户通过 YouTube 视频学习英语的扩展。
 * 主要功能：
 * - 在 VSCode 中播放 YouTube 视频
 * - 显示同步字幕，支持点击单词翻译
 * - AI 驱动的视频摘要和语法分析
 */

import * as vscode from 'vscode';
import { WebviewProvider } from './providers/webview-provider';
import { AIService } from './services/ai-service';
import { VideoService } from './services/video-service';
import { logger } from './services/logger';
import { UI_TEXT } from './constants/prompts';

/**
 * 扩展激活入口
 */
export function activate(context: vscode.ExtensionContext): void {
  logger.info('LingoTube 正在激活...');

  // Initialize services
  const aiService = new AIService();
  const videoService = new VideoService();

  // Create Webview provider
  const provider = new WebviewProvider(
    context.extensionUri,
    aiService,
    videoService,
    context
  );

  // Register Webview view
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      WebviewProvider.viewType,
      provider
    )
  );

  // Register global commands
  registerCommands(context, provider);

  logger.info('LingoTube 激活成功');
  vscode.window.showInformationMessage(UI_TEXT.welcomeMessage);
}

/**
 * 注册全局命令
 */
function registerCommands(
  context: vscode.ExtensionContext,
  provider: WebviewProvider
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'lingoTube.aiSummarize',
      () => provider.triggerAI('summarize')
    )
  );
}

/**
 * 扩展停用 - 清理资源
 */
export function deactivate(): void {
  logger.info('LingoTube 已停用');
  logger.dispose();
}