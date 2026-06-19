/**
 * Webview 视图提供者 - 负责创建和管理 Webview 视图
 */

import * as vscode from 'vscode';
import { WebviewMessage, VideoContext, IAIService, IVideoService } from '../types';
import { ERROR_MESSAGES } from '../constants/prompts';
import { generateWebviewContent } from '../views/webview-content';
import { logger } from '../services/logger';

export class WebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'lingoTube.youtubeView';

  private _view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly aiService: IAIService,
    private readonly videoService: IVideoService,
    private readonly context: vscode.ExtensionContext
  ) { }

  /**
   * 解析 Webview 视图
   */
  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;
    webviewView.title = ''; // Hide the view title programmatically

    // 配置 Webview 选项
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };

    // 设置 HTML 内容
    webviewView.webview.html = generateWebviewContent(webviewView.webview, this.extensionUri);

    // 恢复视频上下文
    this.restoreVideoContext();

    // 监听 Webview 消息
    webviewView.webview.onDidReceiveMessage(
      (message: WebviewMessage) => this.handleMessage(message)
    );
  }

  /**
   * 触发 AI 操作（供外部命令调用）
   */
  async triggerAI(action: string, targetText?: string): Promise<void> {
    if (!this._view) {
      vscode.window.showWarningMessage('请先打开 YouTube 学习助手面板');
      return;
    }

    try {
      let result = '';

      if (action === 'summarize') {
        result = await this.aiService.getSummarySimple();
      } else if (action === 'analyze') {
        result = targetText
          ? await this.aiService.analyzeSpecific(targetText)
          : await this.aiService.getAnalyzeSimple();
      }

      this._view.webview.postMessage({
        type: 'aiResponse',
        content: result
      });
    } catch (error) {
      this._view.webview.postMessage({
        type: 'aiResponse',
        content: ` 错误: ${String(error)}`
      });
    }
  }

  /**
   * 处理来自 Webview 的消息
   */
  private async handleMessage(message: WebviewMessage): Promise<void> {
    logger.info('收到 Webview 消息:', message.type);

    switch (message.type) {
      case 'search':
        await this.handleSearch(typeof message.value === 'string' ? message.value : '');
        break;

      case 'translate':
        await this.handleTranslate(message.text || '', message.context);
        break;

      case 'aiAction':
        await this.triggerAI(typeof message.value === 'string' ? message.value : '', message.text);
        break;

      case 'camouflageState':
        if (this._view) {
          // 当开启伪装模式时，将标题改为极其普通的 "Output"
          this._view.title = message.value ? 'Output' : 'LingoTube';
        }
        break;

      case 'openExternal':
        this.openInBrowser(message.id || '');
        break;
    }
  }

  /**
   * 处理视频搜索请求
   */
  private async handleSearch(input: string): Promise<void> {
    const videoId = this.videoService.extractVideoId(input);

    if (!videoId) {
      vscode.window.showErrorMessage(ERROR_MESSAGES.invalidVideoId);
      return;
    }

    logger.info('开始获取视频:', videoId);
    this._view?.webview.postMessage({ type: 'loading' });

    try {
      const result = await this.videoService.getStreamInfo(videoId);

      if (result) {
        logger.info('视频获取成功:', result.title);

        // 更新 AI 上下文
        this.aiService.updateContext(result.title, result.subtitles);

        // 保存视频上下文
        this.saveVideoContext(result.title, result.subtitles);

        // 发送播放消息
        this._view?.webview.postMessage({
          type: 'playStream',
          url: result.streamUrl,
          id: videoId,
          subs: result.subtitles
        });
      } else {
        logger.warn('视频获取失败');
        this._view?.webview.postMessage({
          type: 'error',
          message: ERROR_MESSAGES.streamFailed
        });
      }
    } catch (error) {
      logger.error('视频获取错误:', error);
      this._view?.webview.postMessage({
        type: 'error',
        message: String(error)
      });
    }
  }

  /**
   * 处理翻译请求
   * @param text 要翻译的文本
   * @param context 可选的句子上下文，用于更准确的翻译
   */
  private async handleTranslate(text: string, context?: string): Promise<void> {
    if (!text) {
      return;
    }

    try {
      const result = await this.aiService.translate(text, context);
      this._view?.webview.postMessage({
        type: 'translationResult',
        original: text,
        translation: result
      });
    } catch (error) {
      this._view?.webview.postMessage({
        type: 'translationResult',
        original: text,
        translation: `翻译失败: ${String(error)}`
      });
    }
  }

  /**
   * 在浏览器中打开视频
   */
  private openInBrowser(videoId: string): void {
    if (videoId) {
      vscode.env.openExternal(
        vscode.Uri.parse(`https://www.youtube.com/watch?v=${videoId}`)
      );
    }
  }

  /**
   * 保存视频上下文到存储
   */
  private saveVideoContext(title: string, subs: unknown): void {
    const context: VideoContext = {
      title,
      subs: typeof subs === 'string' ? subs : JSON.stringify(subs)
    };
    this.context.globalState.update('lingoTube.videoContext', context);
    logger.info('视频上下文已保存');
  }

  /**
   * 恢复视频上下文
   */
  private restoreVideoContext(): void {
    const savedContext = this.context.globalState.get<VideoContext>('lingoTube.videoContext');
    if (savedContext) {
      logger.info('恢复视频上下文:', savedContext.title);
      this.aiService.updateContext(savedContext.title, savedContext.subs);
    }
  }
}
