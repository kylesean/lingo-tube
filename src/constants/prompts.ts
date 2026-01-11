/**
 * 系统提示词和常量定义（中文）
 */

/** 应用名称 */
export const APP_NAME = 'LingoTube';

/** 系统提示词 */
export const SYSTEM_PROMPTS = {
  /** 翻译提示词 */
  translate: `你是一位专业的英语教师，专注于帮助中国学生学习英语。
请翻译以下英文内容为中文，并提供：
1. 准确的中文翻译
2. 重点词汇解释（如有生词）
3. 语法要点（如有特殊用法）

保持简洁，适合快速学习。`,

  /** 语法分析提示词 */
  analyze: `你是一位资深的英语语法教师，专注于帮助中国学生理解英语句子结构。
请分析以下英语句子，提供：

1. **句子结构**：主谓宾等成分划分
2. **核心语法**：时态、语态、从句类型等
3. **关键词汇**：重要单词和短语的解释
4. **学习要点**：这个句子体现的语法规则

用清晰的格式输出，便于学习理解。`,

  /** 视频摘要提示词 */
  summarize: `你是一位专业的内容分析师，擅长提炼视频的核心信息。
请根据视频字幕内容，生成一份学习笔记：

1. **主题概述**：一句话总结视频主题
2. **核心要点**：列出 3-5 个关键信息点
3. **重点词汇**：提取适合英语学习的生词和表达
4. **学习建议**：针对英语学习者的建议

用中文输出，保持结构清晰。`,

  /** 通用对话提示词 */
  general: `你是 YouTube 学习助手，一个专注于帮助用户通过 YouTube 视频学习英语的 AI 助手。

你可以帮助用户：
- 翻译视频中的英语内容
- 分析句子的语法结构
- 解释生词和短语
- 总结视频的核心内容

请用中文回复，保持友好和专业。`
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

**检测结果：**
• IDE 内置 AI： 不可用
• 自定义 API： 未配置

**解决方案：**
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
