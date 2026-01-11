/**
 * YouTube 学习助手 - Antigravity 扩展入口
 * 
 * 这是一个帮助用户通过 YouTube 视频学习英语的扩展。
 * 主要功能：
 * - 在 Antigravity 中播放 YouTube 视频
 * - 显示同步字幕，支持点击单词翻译
 * - AI 驱动的视频摘要和语法分析
 */

import * as vscode from 'vscode';
import { WebviewProvider } from './providers/webview-provider';
import { AIService } from './services/ai-service';
import { VideoService } from './services/video-service';
import { UI_TEXT } from './constants/prompts';

/**
 * 扩展激活入口
 */
export function activate(context: vscode.ExtensionContext): void {
    console.log(UI_TEXT.activating);

    // 初始化服务
    const aiService = new AIService();
    const videoService = new VideoService();

    // 创建 Webview 提供者
    const provider = new WebviewProvider(
        context.extensionUri,
        aiService,
        videoService,
        context
    );

    // 注册 Webview 视图
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            WebviewProvider.viewType,
            provider
        )
    );

    // 注册全局命令
    registerCommands(context, provider);

    console.log(UI_TEXT.activated);
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
 * 扩展停用
 */
export function deactivate(): void {
    console.log('[@yt] YouTube 学习助手已停用');
}