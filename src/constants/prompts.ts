/**
 * 系统提示词和常量定义（中文）
 */

/** 应用名称 */
export const APP_NAME = 'LingoTube';

/** 系统提示词 */
export const SYSTEM_PROMPTS = {
  /** 翻译提示词 */
  translate: `你是英汉翻译助手。将用户提供的英文内容翻译成中文：
- 单词：给出音标、词性、中文释义
- 短语/句子：直接给出流畅的中文翻译
必须用中文回复，保持简洁。`,

  /** 语法分析提示词 */
  analyze: `你是英语语法专家。分析句子结构时：
1. 拆解句子成分（主/谓/宾等）
2. 说明核心语法点（时态、从句等）
3. 解释难点词汇（如有）
输出紧凑，适合快速阅读。`,

  /** 视频摘要提示词 */
  summarize: `你是内容分析师。根据字幕提炼视频要点：
- 主题：一句话概括
- 要点：3-5 个核心内容（简短陈述）
- 表达：值得学习的英文表达及中文释义
直接输出内容。`,

  /** 通用对话提示词 */
  general: `你是英语学习助手，帮助用户理解视频中的英语内容。回复简洁实用。`
};

/** 用户界面文本 */
export const UI_TEXT = {
  // 按钮文本
  watch: '播放',
  summarize: 'AI 摘要',
  analyze: 'AI 语法分析',
  openInBrowser: '在浏览器中打开',

  // 占位符文本
  inputPlaceholder: '输入 YouTube 视频链接或 ID',
  subtitlePlaceholder: '字幕将在此处显示...',
  videoPlaceholder: '粘贴 YouTube 链接开始学习',

  // 状态提示
  loading: '加载中...',
  aiThinking: 'AI 正在分析中...',
  aiResult: 'AI 分析结果',

  // 功能文本
  loopSentence: '循环当前句',

  // 激活消息
  activating: '[@yt] LingoTube 正在激活...',
  activated: '[@yt] LingoTube 激活成功！',

  // 欢迎消息
  welcomeMessage: 'LingoTube 助手已就绪！打开侧边栏开始学习。'
};

/** 错误消息 */
export const ERROR_MESSAGES = {
  invalidVideoId: '无效的 YouTube 视频链接或 ID',
  streamFailed: '获取视频流失败',
  aiConfigMissing: ` AI 配置缺失

  ** 检测结果：**
• IDE 内置 AI： 不可用
• 自定义 API： 未配置

  ** 解决方案：**
    请在设置中配置自定义 API 密钥。`,
  noVideoContext: '请先播放一个视频',
  networkError: '网络请求失败，请检查网络连接'
};

/** 配置键名 */
export const CONFIG_KEYS = {
  namespace: 'lingoTube',
  apiKey: 'ai.apiKey',
  baseUrl: 'ai.baseUrl',
  model: 'ai.model',
  timeout: 'ai.autoSelectFamilyTimeout'
};

/** 默认配置值 */
export const DEFAULT_CONFIG = {
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  timeout: 1000
};
