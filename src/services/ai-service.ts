/**
 * AI 服务 - 负责与 AI 模型交互，提供翻译、摘要、分析等功能
 */

import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import { IAIService, SubtitleData, SubtitleEvent } from '../types';
import { SYSTEM_PROMPTS, ERROR_MESSAGES, CONFIG_KEYS, DEFAULT_CONFIG } from '../constants/prompts';

export class AIService implements IAIService {
  private _currentVideoTitle = '';
  private _currentSubs = '';

  updateContext(title: string, subs: unknown): void {
    this._currentVideoTitle = title;
    if (!subs) {
      this._currentSubs = '';
      return;
    }
    try {
      const data: SubtitleData = typeof subs === 'string' ? JSON.parse(subs) : (subs as SubtitleData);
      this._currentSubs = (data.events || [])
        .filter((e: SubtitleEvent) => e.segs)
        .map((e: SubtitleEvent) => e.segs!.map(s => s.utf8).join(''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch {
      this._currentSubs = String(subs);
    }
  }

  async translate(text: string, context?: string): Promise<string> {
    const prompt = context
      ? `请翻译选中的内容 "${text}"。语境为: "${context}"。直接给出翻译和简单的用法说明。`
      : `请翻译内容: "${text}"。如果是单词，给出音标、词性和中文含义。`;
    return this.callAI(prompt, SYSTEM_PROMPTS.translate);
  }

  async analyzeSpecific(text: string): Promise<string> {
    return this.callAI(`请分析句子的语法结构: "${text}"`, SYSTEM_PROMPTS.analyze);
  }

  async handleSummarize(stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<void> {
    if (!this._currentSubs) {
      stream.markdown(ERROR_MESSAGES.noVideoContext);
      return;
    }
    const prompt = `视频标题: ${this._currentVideoTitle}\n字幕: ${this._currentSubs.substring(0, 5000)}`;
    await this.callAI(prompt, SYSTEM_PROMPTS.summarize, stream, token);
  }

  async handleAnalyze(prompt: string, stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<void> {
    await this.callAI(prompt, SYSTEM_PROMPTS.analyze, stream, token);
  }

  async handleGeneralChat(prompt: string, stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<void> {
    await this.callAI(prompt, SYSTEM_PROMPTS.general, stream, token);
  }

  async getSummarySimple(): Promise<string> {
    if (!this._currentSubs) {
      return ERROR_MESSAGES.noVideoContext;
    }
    const prompt = `视频标题: ${this._currentVideoTitle}\n字幕: ${this._currentSubs.substring(0, 3000)}`;
    return this.callAI(prompt, SYSTEM_PROMPTS.summarize);
  }

  async getAnalyzeSimple(): Promise<string> {
    if (!this._currentSubs) {
      return ERROR_MESSAGES.noVideoContext;
    }
    const prompt = `分析字幕中的语法要点: ${this._currentSubs.substring(0, 2000)}`;
    return this.callAI(prompt, SYSTEM_PROMPTS.analyze);
  }

  private async callAI(
    prompt: string,
    systemPrompt: string,
    stream?: vscode.ChatResponseStream,
    token?: vscode.CancellationToken
  ): Promise<string> {
    const config = vscode.workspace.getConfiguration(CONFIG_KEYS.namespace);
    const apiKey = config.get<string>(CONFIG_KEYS.apiKey);
    const baseUrl = config.get<string>(CONFIG_KEYS.baseUrl);

    // 如果配置了 API Key 或指定了非默认的 Base URL（如本地 Ollama），使用自定义 API
    if (apiKey || (baseUrl && !baseUrl.includes('openai.com'))) {
      return this.callCustomAPI(prompt, systemPrompt, stream, token);
    }

    // 否则尝试使用内置 AI
    try {
      const models = await vscode.lm.selectChatModels();
      const model = models[0];

      if (!model) {
        throw new Error('No AI model available');
      }

      const messages = [
        vscode.LanguageModelChatMessage.User(systemPrompt),
        vscode.LanguageModelChatMessage.User(prompt)
      ];

      const request = await model.sendRequest(messages, {}, token || new vscode.CancellationTokenSource().token);
      let result = '';
      for await (const chunk of request.text) {
        stream?.markdown(chunk);
        result += chunk;
      }
      return result;
    } catch (err) {
      console.error('Built-in AI failed:', err);
      return ERROR_MESSAGES.aiConfigMissing;
    }
  }

  private async callCustomAPI(
    prompt: string,
    systemPrompt: string,
    stream?: vscode.ChatResponseStream,
    token?: vscode.CancellationToken
  ): Promise<string> {
    const config = vscode.workspace.getConfiguration(CONFIG_KEYS.namespace);
    const apiKey = config.get<string>(CONFIG_KEYS.apiKey) || 'none';
    const baseUrl = config.get<string>(CONFIG_KEYS.baseUrl) || DEFAULT_CONFIG.baseUrl;
    const model = config.get<string>(CONFIG_KEYS.model) || DEFAULT_CONFIG.model;

    return new Promise((resolve, reject) => {
      const isHttps = baseUrl.startsWith('https');
      const client = isHttps ? https : http;
      const url = `${baseUrl}/chat/completions`.replace(/\/+chat\//, '/chat/');

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      };

      const req = client.request(url, options, (res) => {
        let result = '';
        let buffer = '';

        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

            if (trimmedLine.startsWith('data: ')) {
              try {
                const data = JSON.parse(trimmedLine.slice(6));
                const content = data.choices[0]?.delta?.content || data.choices[0]?.message?.content;
                if (content) {
                  result += content;
                  stream?.markdown(content);
                }
              } catch (e) {
                // 忽略解析错误（可能是 incomplete chunk）
              }
            }
          }
        });
        res.on('end', () => resolve(result));
      });

      req.on('error', (err) => {
        console.error('[@yt] API Request Error:', err);
        reject(err);
      });

      req.write(JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        stream: true
      }));
      req.end();
      token?.onCancellationRequested(() => req.destroy());
    });
  }
}
