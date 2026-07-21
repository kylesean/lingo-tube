/**
 * System prompts and UI constants for LingoTube.
 * UI text is in English; AI prompts instruct the model to reply in Chinese
 * for translation/learning purposes.
 */

export const APP_NAME = 'LingoTube';

/** System prompts for AI interactions */
export const SYSTEM_PROMPTS = {
  /** Word/phrase translation — optimized for small models like Gemma/Ollama */
  translate: `You are an English-Chinese dictionary. Translate the user's text. Reply in Chinese.

IMPORTANT: Do NOT use numbered lists (1. 2. 3.). Do NOT use bullet points.

For a single word, output EXACTLY in this format (4 lines, no numbers):
/phonetic/ pos.
Chinese meaning
Example: an English sentence.
Chinese translation of the example.

For a phrase or sentence, just output the Chinese translation directly.

Be concise. No extra text.`,

  /** Grammar analysis — detailed but scannable */
  analyze: `You are an English grammar expert helping a Chinese-speaking learner. Analyze the given sentence:

1. **Sentence structure**: Break down subject, verb, object, clauses
2. **Key grammar points**: Tense, voice, clause type, special constructions
3. **Vocabulary notes**: Explain any difficult words or idioms
4. **Paraphrase**: Rewrite the sentence in simpler English (optional)

Use Chinese for explanations. Keep it structured and easy to scan.`,

  /** Video summary — learning-focused */
  summarize: `You are a content analyst helping an English learner. Based on the video subtitles, provide:

## Summary
- **Topic**: One-sentence overview
- **Key Points**: 3-5 bullet points of core content

## Language Learning
- **Useful Expressions**: 3-5 notable English phrases/idioms from the video, each with:
  - The original English expression
  - Chinese meaning
  - Brief usage note

Reply in Chinese. Be concise and practical.`,

  /** General chat */
  general: `You are an English learning assistant. Help the user understand English content from videos. Reply in Chinese. Be concise and practical.`
};

/** UI text (English) */
export const UI_TEXT = {
  // Buttons
  watch: 'Play',
  summarize: 'AI Summary',
  analyze: 'Grammar Analysis',
  openInBrowser: 'Open in Browser',
  repeat: 'Repeat',
  saveWord: 'Save',

  // Placeholders
  inputPlaceholder: 'Paste a YouTube link or video ID',
  subtitlePlaceholder: 'Subtitles will appear here...',
  videoPlaceholder: 'Paste a YouTube link to start learning',

  // Status
  loading: 'Loading...',
  aiThinking: 'AI is analyzing...',
  aiResult: 'AI Result',

  // Features
  loopSentence: 'Loop Sentence',
  speed: 'Speed',
  vocabulary: 'Vocabulary',
  noVocabulary: 'No saved words yet. Click the star icon when translating a word to save it.',

  // Activation
  activating: 'LingoTube is activating...',
  activated: 'LingoTube activated successfully!',
  welcomeMessage: 'LingoTube is ready! Open the sidebar to start learning.'
};

/** Error messages */
export const ERROR_MESSAGES = {
  invalidVideoId: 'Invalid YouTube link or video ID',
  streamFailed: 'Failed to fetch video stream',
  aiConfigMissing: `AI configuration missing.

**Detected:**
- Built-in IDE AI: Not available
- Custom API: Not configured

**Solution:**
Please configure a custom API key in settings.`,
  noVideoContext: 'Please play a video first',
  networkError: 'Network request failed. Please check your connection.'
};

/** Configuration keys */
export const CONFIG_KEYS = {
  namespace: 'lingoTube',
  apiKey: 'ai.apiKey',
  baseUrl: 'ai.baseUrl',
  model: 'ai.model',
  timeout: 'ai.timeout'
};

/** Default configuration values */
export const DEFAULT_CONFIG = {
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  timeout: 1000
};
