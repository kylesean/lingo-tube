import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import { IAIService, SubtitleLine } from '../types';
import { SYSTEM_PROMPTS, ERROR_MESSAGES, CONFIG_KEYS, DEFAULT_CONFIG } from '../constants/prompts';
import { logger } from './logger';

const API_REQUEST_TIMEOUT = 60000;

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
      const lines: SubtitleLine[] = typeof subs === 'string' ? JSON.parse(subs) : (subs as SubtitleLine[]);
      this._currentSubs = lines.map(s => s.text).join(' ').replace(/\s+/g, ' ').trim();
    } catch {
      this._currentSubs = String(subs);
    }
  }

  async translate(text: string, context?: string): Promise<string> {
    const cleanText = text.replace(/>>/g, '').replace(/\[.*?\]/g, '').trim();
    const cleanContext = context?.replace(/>>/g, '').replace(/\[.*?\]/g, '').trim();

    const isSingleWord = !/\s/.test(cleanText) && cleanText.length < 20;

    let prompt: string;
    if (isSingleWord) {
      prompt = `Translate this word: "${cleanText}"\nGive: phonetic (IPA), part of speech, Chinese meaning, one example sentence with Chinese translation.\nNo numbered lists. No bullet points. Just plain text, one item per line.`;
    } else {
      prompt = cleanContext
        ? `Translate to Chinese: "${cleanText}"\nContext: ${cleanContext}\nJust give the translation.`
        : `Translate to Chinese: "${cleanText}"\nJust give the translation.`;
    }

    const result = await this.callAI(prompt, SYSTEM_PROMPTS.translate);
    return this.postProcessTranslation(result);
  }

  /**
   * Post-process AI translation output to ensure clean formatting.
   * Removes numbered lists, bullet points, and normalizes whitespace.
   * Works even when small models (Gemma 4B etc.) ignore format instructions.
   */
  private postProcessTranslation(text: string): string {
    if (!text) {
      return text;
    }

    let result = text;

    // Remove numbered list markers (1. 2. 3. etc.) at start of lines
    result = result.replace(/^\s*\d+[\.\)、]\s*/gm, '');

    // Remove bullet point markers
    result = result.replace(/^\s*[-•*]\s*/gm, '');

    // Remove "Phonetic:", "POS:", "Meaning:" etc. labels that some models add
    result = result.replace(/^(phonetic|pos|part\s*of\s*speech|meaning|definition|example|translation|音标|词性|释义|例句|翻译)\s*[:：]\s*/gim, '');

    // Remove markdown heading markers
    result = result.replace(/^#+\s*/gm, '');

    // Remove bold/italic markers
    result = result.replace(/\*\*/g, '');
    result = result.replace(/\*/g, '');

    // Normalize whitespace: collapse multiple blank lines into one
    result = result.replace(/\n{3,}/g, '\n\n');

    // Trim each line and remove empty lines at start/end
    result = result.split('\n').map(l => l.trim()).filter(l => l.length > 0).join('\n');

    return result.trim();
  }

  async analyzeSpecific(text: string): Promise<string> {
    return this.callAI(`请分析句子的语法结构: "${text}"`, SYSTEM_PROMPTS.analyze);
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
    systemPrompt: string
  ): Promise<string> {
    const config = vscode.workspace.getConfiguration(CONFIG_KEYS.namespace);
    const apiKey = config.get<string>(CONFIG_KEYS.apiKey);
    const baseUrl = config.get<string>(CONFIG_KEYS.baseUrl);

    if (apiKey || (baseUrl && !baseUrl.includes('openai.com'))) {
      return this.callCustomAPI(prompt, systemPrompt);
    }

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

      const cts = new vscode.CancellationTokenSource();
      try {
        const request = await model.sendRequest(messages, {}, cts.token);
        let result = '';
        for await (const chunk of request.text) {
          result += chunk;
        }
        return result;
      } finally {
        cts.dispose();
      }
    } catch (err) {
      logger.error('Built-in AI failed:', err);
      return ERROR_MESSAGES.aiConfigMissing;
    }
  }

  private async callCustomAPI(
    prompt: string,
    systemPrompt: string
  ): Promise<string> {
    const config = vscode.workspace.getConfiguration(CONFIG_KEYS.namespace);
    const apiKey = config.get<string>(CONFIG_KEYS.apiKey);
    const baseUrl = config.get<string>(CONFIG_KEYS.baseUrl) || DEFAULT_CONFIG.baseUrl;
    const model = config.get<string>(CONFIG_KEYS.model) || DEFAULT_CONFIG.model;

    return new Promise((resolve, reject) => {
      const isHttps = baseUrl.startsWith('https');
      const client = isHttps ? https : http;
      const url = `${baseUrl}/chat/completions`.replace(/\/+chat\//, '/chat/');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const options = { method: 'POST', headers };

      const req = client.request(url, options, (res) => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          let errorBody = '';
          res.on('data', (chunk) => errorBody += chunk.toString());
          res.on('end', () => {
            const msg = `API 请求失败 (HTTP ${res.statusCode}): ${errorBody.substring(0, 200)}`;
            logger.error(msg);
            reject(new Error(msg));
          });
          return;
        }

        let result = '';
        let buffer = '';

        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === 'data: [DONE]') { continue; }

            if (trimmedLine.startsWith('data: ')) {
              try {
                const data = JSON.parse(trimmedLine.slice(6));
                const content = data.choices[0]?.delta?.content || data.choices[0]?.message?.content;
                if (content) {
                  result += content;
                }
              } catch {
                // Ignore parse errors from incomplete SSE chunks
              }
            }
          }
        });
        res.on('end', () => resolve(result));
      });

      req.on('error', (err) => {
        logger.error('API Request Error:', err);
        reject(err);
      });

      req.setTimeout(API_REQUEST_TIMEOUT, () => {
        logger.warn('API 请求超时，已取消');
        req.destroy(new Error('API request timeout'));
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
    });
  }
}
