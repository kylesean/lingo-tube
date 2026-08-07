/**
 * Webview 内容生成器 - 负责生成 Webview 的 HTML 内容
 */

import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { UI_TEXT } from '../constants/prompts';

function getNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * 生成 Webview 的完整 HTML 内容
 * @param webview Webview instance for resource URI generation
 * @param extensionUri Extension root URI for local resource access
 */
export function generateWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = getNonce();

  // Get local resource URIs
  const markedUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'marked.min.js')
  );

  // CSP: Allow local scripts (vscode-webview:), inline scripts with nonce, and media from https
  const csp = [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    `script-src 'nonce-${nonce}'`,
    "media-src https: blob:",
    "img-src https: data:"
  ].join('; ');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>${UI_TEXT.watch}</title>
  <script nonce="${nonce}" src="${markedUri}"></script>
  <style>${getStyles()}</style>
</head>
<body>
  ${getSearchSection()}
  <div class="ai-toolbar">
    <button id="aiSummarizeBtn">${UI_TEXT.summarize}</button>
    <div class="speed-control">
      <span class="speed-label">${UI_TEXT.speed}:</span>
      <select id="speedSelect">
        <option value="0.5">0.5x</option>
        <option value="0.75">0.75x</option>
        <option value="1" selected>1x</option>
        <option value="1.25">1.25x</option>
        <option value="1.5">1.5x</option>
        <option value="2">2x</option>
      </select>
    </div>
    <button id="vocabBtn" class="vocab-toggle" title="${UI_TEXT.vocabulary}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      <span id="vocabCount">0</span>
    </button>
  </div>
  <div id="ai-result-panel">
    <div class="panel-header"><span>AI Result</span><button class="panel-close" data-target="ai-result-panel">x</button></div>
    <div class="panel-content"></div>
  </div>
  <div id="vocab-panel">
    <div class="panel-header"><span>${UI_TEXT.vocabulary}</span><button class="panel-close" data-target="vocab-panel">x</button></div>
    <div class="panel-content" id="vocabList">
      <div class="vocab-empty">${UI_TEXT.noVocabulary}</div>
    </div>
  </div>
  <div class="video-container" id="player">
    <div style="color:var(--vscode-descriptionForeground); text-align:center; padding-top:15%">${UI_TEXT.videoPlaceholder}</div>
  </div>
  <div class="subtitle-panel">
    <div id="subtitlePanel" class="subtitle-list"></div>
    <div id="translateTooltip" class="translate-tooltip">
      <div class="tooltip-header">
        <span>Translation</span>
        <div class="tooltip-actions">
          <button class="tooltip-save" id="tooltipSave" title="${UI_TEXT.saveWord}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </button>
          <button class="tooltip-close" id="tooltipClose">x</button>
        </div>
      </div>
      <div class="tooltip-content"></div>
    </div>
  </div>
  <script nonce="${nonce}">${getScript()}</script>
</body>
</html>`;
}

function getStyles(): string {
  return `
:root {
  --bg-main: var(--vscode-sideBar-background);
  --bg-editor: var(--vscode-editor-background);
  --fg-main: var(--vscode-foreground);
  --fg-desc: var(--vscode-descriptionForeground);
  --accent: var(--vscode-button-background);
  --accent-hover: var(--vscode-button-hoverBackground);
  --border: var(--vscode-divider);
  --radius: 4px;
  --font-size-ui: 12px;
  --font-size-sub: 14px;
}

body {
  font-family: var(--vscode-font-family);
  color: var(--fg-main);
  display: flex;
  flex-direction: column;
  height: 100vh;
  margin: 0;
  background-color: var(--bg-main);
  overflow: hidden;
}

.search-container {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-bottom: 1px solid var(--border);
}

.input-group {
  display: flex;
  gap: 8px;
}

input {
  flex: 1;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  padding: 6px 12px;
  border-radius: 2px;
  font-size: var(--font-size-ui);
  outline: none;
}

input:focus { border-color: var(--vscode-focusBorder); }

button {
  background: var(--accent);
  color: var(--vscode-button-foreground);
  border: none;
  padding: 6px 16px;
  border-radius: 2px;
  cursor: pointer;
  font-size: var(--font-size-ui);
  font-weight: 500;
}

button:hover { background: var(--accent-hover); }

.video-container {
  width: 100%;
  aspect-ratio: 16/9;
  background: #000;
  flex-shrink: 0;
  position: relative;
}

#video-player { width: 100%; height: 100%; }

/* Hide redundant view title from package.json */
.search-container {
}

/* Listening Mode - Just hide video, keep UI normal */
.listening-mode .video-container {
  aspect-ratio: unset;
  height: 32px;
  background: var(--bg-editor);
  border-bottom: 1px solid var(--border);
}

.listening-mode #video-player {
  opacity: 0;
  height: 0;
  position: absolute;
}

.listening-mode .stealth-placeholder {
  display: none !important;
}

/* Camouflage Mode - Full Boss Key Style */
.camouflage-mode .video-container {
  aspect-ratio: unset;
  height: 24px;
  background: var(--bg-editor);
  border-bottom: 1px solid var(--border);
}

.camouflage-mode #video-player {
  opacity: 0;
  height: 0;
  position: absolute;
}

.camouflage-mode .search-container,
.camouflage-mode .ai-toolbar {
  display: none !important;
}

.camouflage-mode .stealth-placeholder {
  display: flex;
}

.camouflage-mode .stealth-placeholder::before {
  content: "> System: ";
  opacity: 0.7;
}

.camouflage-mode .subtitle-line {
  font-family: 'Consolas', 'Courier New', monospace !important;
  font-size: 11px !important;
  color: #6A9955 !important;
  padding: 1px 16px !important;
  line-height: 1.2 !important;
}

.camouflage-mode .subtitle-time {
  color: #6A9955 !important;
  opacity: 0.6 !important;
}

.camouflage-mode .subtitle-line::before {
  content: "// ";
  opacity: 0.8;
}

.camouflage-mode .subtitle-line.active {
  background: rgba(106, 153, 85, 0.08) !important;
  color: #85c46c !important;
}

.camouflage-mode .translate-tooltip,
.camouflage-mode #ai-result-panel {
  border: 1px solid #6A9955 !important;
  box-shadow: none !important;
}

.camouflage-mode .tooltip-content,
.camouflage-mode .panel-content {
  color: #6A9955 !important;
  font-family: 'Consolas', monospace !important;
  font-size: 11px !important;
}

.stealth-placeholder {
  display: none;
  align-items: center;
  justify-content: flex-start;
  padding-left: 12px;
  gap: 8px;
  height: 100%;
  color: var(--fg-desc);
  font-size: 10px;
  font-family: 'Consolas', monospace;
}

.stealth-toggle {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--fg-desc);
  padding: 4px 8px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.2s;
}

.stealth-toggle:hover {
  background: var(--vscode-toolbar-hoverBackground);
  color: var(--fg-main);
}

.stealth-toggle.active {
  background: transparent;
  border-color: var(--vscode-focusBorder);
  color: var(--vscode-focusBorder);
}

.ai-toolbar {
  padding: 8px 12px;
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--border);
  align-items: center;
}

.ai-toolbar button {
  flex: 1;
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  padding: 4px;
  font-size: 11px;
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.speed-label {
  font-size: 11px;
  color: var(--fg-desc);
}

.speed-control select {
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  padding: 2px 4px;
  font-size: 11px;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.vocab-toggle {
  flex: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px !important;
  font-size: 11px;
}

.vocab-toggle.active {
  border-color: var(--vscode-focusBorder);
  color: var(--vscode-focusBorder);
}

#vocab-panel {
  margin: 8px 12px;
  padding: 0;
  background: var(--bg-editor);
  border: 1px solid var(--border);
  border-left: 4px solid #d4a017;
  border-radius: var(--radius);
  font-size: var(--font-size-ui);
  display: none;
  max-height: 280px;
  overflow: hidden;
}

.vocab-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
}

.vocab-item:last-child { border-bottom: none; }

.vocab-word {
  font-weight: 600;
  color: var(--vscode-textLink-foreground);
}

.vocab-meaning {
  color: var(--fg-desc);
  font-size: 11px;
  flex: 1;
  margin-left: 8px;
}

.vocab-remove {
  background: none;
  border: none;
  color: var(--fg-desc);
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
  flex-shrink: 0;
}

.vocab-remove:hover { color: var(--vscode-errorForeground); }

.vocab-empty {
  padding: 20px;
  text-align: center;
  color: var(--fg-desc);
  font-size: 12px;
}

#ai-result-panel, #translation-info {
  margin: 8px 12px;
  padding: 0;
  background: var(--bg-editor);
  border: 1px solid var(--border);
  border-left: 4px solid var(--vscode-focusBorder);
  border-radius: var(--radius);
  font-size: var(--font-size-ui);
  display: none;
  max-height: 280px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: var(--vscode-toolbar-hoverBackground);
  border-bottom: 1px solid var(--border);
  font-size: 11px;
  color: var(--fg-desc);
}

.panel-close {
  background: transparent;
  border: none;
  color: var(--fg-desc);
  cursor: pointer;
  padding: 2px 6px;
  font-size: 14px;
  line-height: 1;
  border-radius: 2px;
}

.panel-close:hover {
  background: var(--vscode-toolbar-hoverBackground);
  color: var(--fg-main);
}

.panel-content {
  padding: 10px;
  max-height: 240px;
  overflow-y: auto;
}

/* Compact markdown styles for AI output */
.panel-content .markdown-body {
  line-height: 1.5;
}

.panel-content .markdown-body p {
  margin: 0 0 0.5em 0;
}

.panel-content .markdown-body p:last-child {
  margin-bottom: 0;
}

.panel-content .markdown-body h1,
.panel-content .markdown-body h2,
.panel-content .markdown-body h3,
.panel-content .markdown-body h4 {
  margin: 0.6em 0 0.3em 0;
  font-size: 1em;
  font-weight: 600;
}

.panel-content .markdown-body h1:first-child,
.panel-content .markdown-body h2:first-child,
.panel-content .markdown-body h3:first-child {
  margin-top: 0;
}

.panel-content .markdown-body ul,
.panel-content .markdown-body ol {
  margin: 0.3em 0;
  padding-left: 1.5em;
}

.panel-content .markdown-body li {
  margin: 0.15em 0;
}

.panel-content .markdown-body strong {
  color: var(--vscode-textLink-foreground);
}

.panel-content .markdown-body code {
  background: var(--vscode-textCodeBlock-background);
  padding: 0.1em 0.3em;
  border-radius: 2px;
  font-size: 0.9em;
}

.subtitle-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-editor);
  overflow: hidden;
}

.subtitle-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.subtitle-line {
  display: flex;
  padding: 6px 16px;
  cursor: pointer;
  font-size: var(--font-size-sub);
  line-height: 1.6;
  border-radius: 4px;
  margin: 0 8px;
}

.subtitle-line:hover { background: var(--vscode-list-hoverBackground); }
.subtitle-line.active {
  background: rgba(130, 100, 220, 0.15);
  border-radius: 4px;
}

.subtitle-time {
  flex-shrink: 0;
  width: 52px;
  color: var(--vscode-descriptionForeground);
  font-size: 11px;
  font-family: 'Consolas', 'Courier New', monospace;
  padding-top: 2px;
  user-select: none;
}

.subtitle-text {
  flex: 1;
  padding-left: 8px;
}

.sub-repeat {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--fg-desc);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  opacity: 0;
  transition: opacity 0.15s;
  border-radius: 2px;
}

.subtitle-line:hover .sub-repeat { opacity: 0.6; }
.sub-repeat:hover { opacity: 1 !important; color: var(--vscode-focusBorder); }

.word { border-radius: 2px; padding: 0 2px; }
.word:hover { background: var(--vscode-textLink-activeForeground); color: white; }

.loading-spinner {
  width: 20px;
  height: 20px;
  margin: 10px auto;
  border: 2px solid var(--fg-desc);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Floating translation tooltip */
.translate-tooltip {
  position: absolute;
  z-index: 1000;
  max-width: 340px;
  min-width: 220px;
  background: var(--bg-editor);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  font-size: 12px;
  display: none;
}

.translate-tooltip.visible {
  display: block;
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: var(--vscode-toolbar-hoverBackground);
  border-bottom: 1px solid var(--border);
  border-radius: 6px 6px 0 0;
  font-size: 10px;
  color: var(--fg-desc);
}

.tooltip-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tooltip-save {
  background: none;
  border: none;
  color: var(--fg-desc);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  border-radius: 2px;
}

.tooltip-save:hover { color: #d4a017; }
.tooltip-save.saved { color: #d4a017; }

.tooltip-close {
  background: none;
  border: none;
  color: var(--fg-desc);
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
  line-height: 1;
}

.tooltip-close:hover {
  color: var(--fg-main);
}

.tooltip-content {
  padding: 10px;
  line-height: 1.5;
  max-height: 220px;
  overflow-y: auto;
}

.tooltip-content .loading-spinner {
  margin: 5px auto;
}

/* Markdown styling inside tooltip */
.tooltip-content .markdown-body h3 {
  margin: 0 0 4px 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--vscode-textLink-foreground);
}

.tooltip-content .markdown-body h3:first-child {
  margin-top: 0;
}

.tooltip-content .markdown-body p {
  margin: 4px 0;
  font-size: 12px;
}

.tooltip-content .markdown-body strong {
  color: var(--fg-main);
}

.tooltip-content .markdown-body em {
  color: var(--fg-desc);
  font-style: italic;
}

.tooltip-content .markdown-body code {
  background: var(--vscode-textCodeBlock-background);
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 11px;
}
`;
}

function getSearchSection(): string {
  return `
<div class="search-container">
  <div class="input-group">
    <input type="text" id="videoInput" placeholder="${UI_TEXT.inputPlaceholder}">
    <button id="watchBtn">${UI_TEXT.watch}</button>
    <button id="listeningBtn" class="stealth-toggle" title="听力模式 - 仅隐藏画面">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    </button>
    <button id="camouflageBtn" class="stealth-toggle" title="伪装模式 - 极致隐蔽 (Alt+Q)">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
    </button>
  </div>
</div>`;
}

function getScript(): string {
  return `
const vscode = acquireVsCodeApi();
const els = {
  input: document.getElementById('videoInput'),
  btn: document.getElementById('watchBtn'),
  player: document.getElementById('player'),
  subPanel: document.getElementById('subtitlePanel'),
  tooltip: document.getElementById('translateTooltip'),
  tooltipContent: document.querySelector('#translateTooltip .tooltip-content'),
  aiPanel: document.getElementById('ai-result-panel'),
  vocabPanel: document.getElementById('vocab-panel'),
  vocabList: document.getElementById('vocabList'),
  vocabCount: document.getElementById('vocabCount'),
  speedSelect: document.getElementById('speedSelect')
};

let lastEventPos = { x: 0, y: 0 };
let currentTranslateText = '';

let state = {
  subs: [],
  videoId: null,
  streamUrl: null,
  container: '',
  activeIndex: -1,
  currentTime: 0,
  listeningMode: false,
  camouflageMode: false,
  vocabulary: []
};

let lastSaveTime = 0;

marked.setOptions({ gfm: true, breaks: true });

// Escape HTML special characters to prevent XSS in text content
function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return str.replace(/[&<>"']/g, c => map[c]);
}

// Whitelist-based HTML sanitizer for rendered markdown output
function sanitizeHtml(html) {
  var allowedTags = { p:1,br:1,hr:1,h1:1,h2:1,h3:1,h4:1,h5:1,h6:1,
    strong:1,b:1,em:1,i:1,u:1,code:1,pre:1,ul:1,ol:1,li:1,
    blockquote:1,a:1,span:1,div:1,table:1,thead:1,tbody:1,tr:1,th:1,td:1 };
  html = html.replace(/<(script|iframe|form|object|embed|style|link|meta)[\\s\\S]*?<\\/\\1>/gi, '');
  html = html.replace(/<(script|iframe|form|object|embed|style|link|meta)[^>]*\\/?>/gi, '');
  html = html.replace(/\\s+on\\w+\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+)/gi, '');
  html = html.replace(/(?:href|src|action)\\s*=\\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '');
  html = html.replace(/<\\/?([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*>/g, function(match, tag) {
    return allowedTags[tag.toLowerCase()] ? match.replace(/\\s+(style|class)\\s*=\\s*(?:"[^"]*"|'[^']*')/gi, '') : '';
  });
  return html;
}

// Restore persisted state only after the document is fully ready.
// This prevents the "InvalidStateError: Failed to register a ServiceWorker:
// The document is in an invalid state" error that occurs when media loading
// is triggered before the Webview document has fully initialized.
function restoreState() {
  const saved = vscode.getState();
  if (!saved) return;

  state = { ...state, ...saved };
  els.input.value = state.inputValue || '';

  if (state.listeningMode) {
    document.body.classList.add('listening-mode');
    document.getElementById('listeningBtn').classList.add('active');
  }
  if (state.camouflageMode) {
    document.body.classList.add('camouflage-mode');
    document.getElementById('camouflageBtn').classList.add('active');
    // Notify extension on load to sync title
    vscode.postMessage({ type: 'camouflageState', value: true });
  }
  if (state.streamUrl) {
    loadVideo(state.streamUrl, state.videoId, state.subs, state.currentTime, state.container);
  }
}

// Use DOMContentLoaded to ensure the document is in a valid state before
// restoring video/UI state. Falls back to immediate execution if already ready.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', restoreState);
} else {
  restoreState();
}

// Listening mode toggle (Just hide video)
document.getElementById('listeningBtn').onclick = () => {
  state.listeningMode = !state.listeningMode;
  document.body.classList.toggle('listening-mode', state.listeningMode);
  document.getElementById('listeningBtn').classList.toggle('active', state.listeningMode);
  save();
};

// Camouflage mode toggle (Full Boss Key)
const toggleCamouflage = () => {
  state.camouflageMode = !state.camouflageMode;
  document.body.classList.toggle('camouflage-mode', state.camouflageMode);
  document.getElementById('camouflageBtn').classList.toggle('active', state.camouflageMode);

  // Notify extension to change side bar title
  vscode.postMessage({ type: 'camouflageState', value: state.camouflageMode });

  save();
};

document.getElementById('camouflageBtn').onclick = toggleCamouflage;

// Keyboard shortcut: Alt+Q (Quick) for Camouflage
// Alt+Q is easier to press and less likely to conflict with core IDE shortcuts
window.addEventListener('keydown', (e) => {
  if (e.altKey && e.key.toLowerCase() === 'q') {
    toggleCamouflage();
    e.preventDefault();
  }
});

function save() {
  const v = document.getElementById('video-player');
  state.currentTime = v ? v.currentTime : 0;
  state.inputValue = els.input.value;
  vscode.setState(state);
}

function loadVideo(url, id, subs, start, container) {
  state.streamUrl = url;
  state.videoId = id;
  state.container = container || '';
  const fileExt = '.mp4';
  const fileName = id ? 'video_' + id.substring(0, 8) + fileExt : 'stream_input' + fileExt;

  // Use DOM API to prevent HTML injection via URL
  const video = document.createElement('video');
  video.id = 'video-player';
  video.controls = true;
  video.preload = 'auto';
  video.playsInline = true;
  const source = document.createElement('source');
  source.src = url;
  source.type = 'video/mp4';
  video.appendChild(source);

  const placeholder = document.createElement('div');
  placeholder.className = 'stealth-placeholder';
  const filenameSpan = document.createElement('span');
  filenameSpan.id = 'stealth-filename';
  filenameSpan.textContent = fileName;
  placeholder.appendChild(filenameSpan);

  els.player.innerHTML = '';
  els.player.appendChild(video);
  els.player.appendChild(placeholder);

  const v = document.getElementById('video-player');

  if (start) v.currentTime = start;

  if (subs && subs.length > 0) {
    state.subs = subs;
    renderSubs();
    updateActiveSub(start || 0);
  } else {
    // No subtitles available
    state.subs = [];
    els.subPanel.innerHTML = '<div style="color:var(--fg-desc);text-align:center;padding:20px;font-size:12px;">No subtitles available for this video.<br>Try another video with captions enabled.</div>';
  }

  v.ontimeupdate = () => {
    const t = v.currentTime;
    updateActiveSub(t);
    const now = Date.now();
    if (now - lastSaveTime > 5000) {
      save();
      lastSaveTime = now;
    }
  };

  v.onpause = save;
  if (!start) v.play().catch(() => {});
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function renderSubs() {
  els.subPanel.innerHTML = state.subs.map((s, i) => {
    const words = s.text.split(/(\\s+)/).map(seg => {
      if (seg.trim()) {
        const clean = seg.replace(/[^a-zA-Z0-9'\\[\\]>]/g, '');
        return '<span class="word" data-word="' + escapeHtml(clean) + '" data-line="' + i + '">' + escapeHtml(seg) + '</span>';
      }
      return escapeHtml(seg);
    }).join('');
    return '<div class="subtitle-line" id="sub-' + i + '" data-time="' + s.start + '">' +
      '<span class="subtitle-time">' + formatTime(s.start) + '</span>' +
      '<span class="subtitle-text">' + words + '</span>' +
      '<button class="sub-repeat" data-idx="' + i + '" title="Repeat">&#x21BB;</button></div>';
  }).join('');
}

function updateActiveSub(t) {
  // Use next subtitle's start as the end boundary to eliminate gaps
  const idx = state.subs.findIndex((s, i) => {
    const endBound = (i + 1 < state.subs.length) ? state.subs[i + 1].start : s.start + s.duration;
    return t >= s.start && t < endBound;
  });

  if (idx !== -1 && idx !== state.activeIndex) {
    const prev = document.getElementById('sub-' + state.activeIndex);
    if (prev) prev.classList.remove('active');

    state.activeIndex = idx;
    const cur = document.getElementById('sub-' + idx);
    if (cur) {
      cur.classList.add('active');
      cur.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

function jump(t, i) {
  const v = document.getElementById('video-player');
  if (v) {
    v.currentTime = t;
    const prev = document.getElementById('sub-' + state.activeIndex);
    if (prev) prev.classList.remove('active');

    state.activeIndex = i;
    const cur = document.getElementById('sub-' + i);
    if (cur) cur.classList.add('active');

    v.play().catch(() => {});
    save();
  }
}

// Show tooltip at specified position
function showTooltip(x, y) {
  const panel = els.subPanel.getBoundingClientRect();
  const tooltip = els.tooltip;

  // Position tooltip near click, but keep it within the panel
  let left = x - panel.left;
  let top = y - panel.top + 20;  // 20px below click

  // Ensure tooltip doesn't overflow right edge
  if (left + 200 > panel.width) {
    left = Math.max(10, panel.width - 210);
  }

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';

  els.tooltipContent.innerHTML = '<div class="loading-spinner"></div>';
  tooltip.classList.add('visible');
}

// Hide tooltip
function hideTooltip() {
  els.tooltip.classList.remove('visible');
}

// Flag to track if we just made a selection (to prevent click from interfering)
let justSelected = false;

// Clear previous selection when starting a new selection
els.subPanel.onmousedown = () => {
  window.getSelection().removeAllRanges();
  hideTooltip();
};

// Text selection handler
els.subPanel.onmouseup = (e) => {
  const sel = window.getSelection();
  const text = sel.toString().trim();
  if (text) {
    justSelected = true;
    showTooltip(e.clientX, e.clientY);

    let context = '';
    if (sel.anchorNode && sel.anchorNode.parentElement) {
       const line = sel.anchorNode.parentElement.closest('.subtitle-line');
       if (line) {
         const idx = parseInt(line.id.split('-')[1]);
         if (!isNaN(idx) && state.subs[idx]) {
           context = state.subs[idx].text;
         }
       }
    }

    vscode.postMessage({ type: 'translate', text: text, context: context });

    // Reset flag after a short delay (to allow click event to check it first)
    setTimeout(() => { justSelected = false; }, 50);
  }
};

// Word click handler
els.subPanel.onclick = (e) => {
  // If we just made a selection, don't process click
  if (justSelected) return;

  // Clear previous selection when clicking (not selecting)
  const sel = window.getSelection();
  if (sel.toString().trim()) {
    sel.removeAllRanges();
    hideTooltip();
    return;
  }

  const w = e.target.closest('.word');
  if (w) {
    const txt = w.dataset.word;
    const line = w.dataset.line;
    showTooltip(e.clientX, e.clientY);
    vscode.postMessage({ type: 'translate', text: txt, context: state.subs[line]?.text });
    return;
  }

  // Click on repeat button
  const r = e.target.closest('.sub-repeat');
  if (r) {
    e.stopPropagation();
    const idx = parseInt(r.dataset.idx);
    const sub = state.subs[idx];
    if (sub) {
      const v = document.getElementById('video-player');
      if (v) { v.currentTime = sub.start; v.play().catch(() => {}); }
    }
    return;
  }

  // Click on subtitle line to jump
  const l = e.target.closest('.subtitle-line');
  if (l) {
    hideTooltip();
    const id = l.id.split('-')[1];
    jump(parseFloat(l.dataset.time), parseInt(id));
  }
};

// Close tooltip button
document.getElementById('tooltipClose').onclick = () => {
  hideTooltip();
  window.getSelection().removeAllRanges();
};

els.btn.onclick = () => vscode.postMessage({ type: 'search', value: els.input.value });

// AI action buttons
document.getElementById('aiSummarizeBtn').onclick = () => {
  els.aiPanel.style.display = 'block';
  els.aiPanel.querySelector('.panel-content').innerHTML = '<div class="loading-spinner"></div>';
  vscode.postMessage({ type: 'aiAction', value: 'summarize' });
};

// Playback speed control
els.speedSelect.onchange = () => {
  const v = document.getElementById('video-player');
  if (v) v.playbackRate = parseFloat(els.speedSelect.value);
};

// Vocabulary panel toggle
document.getElementById('vocabBtn').onclick = () => {
  const visible = els.vocabPanel.style.display === 'block';
  els.vocabPanel.style.display = visible ? 'none' : 'block';
  document.getElementById('vocabBtn').classList.toggle('active', !visible);
};

// Save text to vocabulary (supports words, phrases, and sentences)
document.getElementById('tooltipSave').onclick = () => {
  if (!currentTranslateText) return;
  const text = currentTranslateText.trim();
  const meaning = els.tooltipContent.textContent || '';

  // Check if already saved
  if (state.vocabulary.find(v => v.word.toLowerCase() === text.toLowerCase())) {
    return;
  }

  state.vocabulary.push({ word: text, meaning: meaning.substring(0, 120) });
  vscode.postMessage({ type: 'saveVocabulary', vocabulary: state.vocabulary });
  renderVocabulary();

  // Visual feedback
  document.getElementById('tooltipSave').classList.add('saved');
  setTimeout(() => document.getElementById('tooltipSave').classList.remove('saved'), 1000);
};

function renderVocabulary() {
  els.vocabCount.textContent = state.vocabulary.length;
  if (state.vocabulary.length === 0) {
    els.vocabList.innerHTML = '<div class="vocab-empty">No saved items yet. Click the star icon when translating any text to save it.</div>';
    return;
  }
  els.vocabList.innerHTML = state.vocabulary.map((v, i) =>
    '<div class="vocab-item">' +
    '<span class="vocab-word" title="' + escapeHtml(v.word) + '">' + escapeHtml(v.word.length > 30 ? v.word.substring(0, 30) + '...' : v.word) + '</span>' +
    '<span class="vocab-meaning" title="' + escapeHtml(v.meaning) + '">' + escapeHtml(v.meaning.length > 50 ? v.meaning.substring(0, 50) + '...' : v.meaning) + '</span>' +
    '<button class="vocab-remove" data-idx="' + i + '" title="Remove">x</button>' +
    '</div>'
  ).join('');

  els.vocabList.querySelectorAll('.vocab-remove').forEach(btn => {
    btn.onclick = () => {
      state.vocabulary.splice(parseInt(btn.dataset.idx), 1);
      vscode.postMessage({ type: 'saveVocabulary', vocabulary: state.vocabulary });
      renderVocabulary();
    };
  });
}

// Close button handlers
document.querySelectorAll('.panel-close').forEach(btn => {
  btn.onclick = () => {
    const targetId = btn.dataset.target;
    document.getElementById(targetId).style.display = 'none';
    if (targetId === 'vocab-panel') {
      document.getElementById('vocabBtn').classList.remove('active');
    }
  };
});

window.addEventListener('message', e => {
  const m = e.data;
  if (m.type === 'playStream') {
    const v = document.getElementById('video-player');
    loadVideo(m.url, m.id, m.subs, (v && v.currentTime > 0) ? v.currentTime : 0, m.container);
  } else if (m.type === 'translationResult') {
    currentTranslateText = m.original || '';
    els.tooltipContent.innerHTML = '<div class="markdown-body">' + sanitizeHtml(marked.parse ? marked.parse(m.translation) : escapeHtml(m.translation)) + '</div>';
    // Reset save button state
    document.getElementById('tooltipSave').classList.remove('saved');
  } else if (m.type === 'aiResponse') {
    els.aiPanel.style.display = 'block';
    els.aiPanel.querySelector('.panel-content').innerHTML = '<div class="markdown-body">' + sanitizeHtml(marked.parse ? marked.parse(m.content) : escapeHtml(m.content)) + '</div>';
  } else if (m.type === 'loading') {
    els.player.innerHTML = '<div class="loading-spinner"></div>';
  } else if (m.type === 'error') {
    els.player.innerHTML = '<div style="color:red;padding:20px">' + escapeHtml(m.message) + '</div>';
  } else if (m.type === 'vocabulary') {
    state.vocabulary = m.vocabulary || [];
    renderVocabulary();
  }
});

// Repeat current subtitle line
function repeatCurrentLine() {
  const sub = state.subs[state.activeIndex];
  if (!sub) return;
  const v = document.getElementById('video-player');
  if (v) {
    v.currentTime = sub.start;
    v.play().catch(() => {});
  }
}

function parseSubs(content) {
  try {
    const d = typeof content === 'string' ? JSON.parse(content) : content;
    if (!d || !d.events) return [];

    // Step 1: Extract and clean all fragments
    const fragments = [];
    d.events.forEach(e => {
      if (!e.segs || e.segs.length === 0) return;

      const startTime = e.tStartMs / 1000;
      const endTime = startTime + (e.dDurationMs || 0) / 1000;

      let text = e.segs.map(s => s.utf8).join('');
      text = text
        .replace(/>>/g, '')
        .replace(/\\[.*?\\]/g, '')
        .replace(/\\n/g, ' ')
        .trim();

      if (text.length > 0) {
        fragments.push({ start: startTime, end: endTime, text });
      }
    });

    if (fragments.length === 0) return [];

    // Step 2: Merge fragments into complete sentences
    const sentences = [];
    let current = { start: fragments[0].start, end: fragments[0].end, text: fragments[0].text };

    for (let i = 1; i < fragments.length; i++) {
      const frag = fragments[i];
      const prevText = current.text.trim();

      // Check if previous fragment ends a sentence
      const endsWithPunctuation = /[.!?]$/.test(prevText);
      const isLongEnough = prevText.length >= 40;

      if (endsWithPunctuation && isLongEnough) {
        // Flush current sentence
        sentences.push({
          start: current.start,
          duration: current.end - current.start,
          text: current.text.replace(/\\s+/g, ' ').trim()
        });
        // Start new sentence
        current = { start: frag.start, end: frag.end, text: frag.text };
      } else {
        // Append to current sentence
        current.text += ' ' + frag.text;
        current.end = frag.end;
      }
    }

    // Don't forget the last sentence
    if (current.text.trim().length > 0) {
      sentences.push({
        start: current.start,
        duration: Math.max(current.end - current.start, 1.5),
        text: current.text.replace(/\\s+/g, ' ').trim()
      });
    }

    return sentences;
  } catch (e) {
    return [];
  }
}
`;
}
