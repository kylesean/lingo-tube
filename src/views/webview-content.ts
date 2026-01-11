/**
 * Webview 内容生成器 - 负责生成 Webview 的 HTML 内容
 */

import * as vscode from 'vscode';
import { UI_TEXT } from '../constants/prompts';

/**
 * 生成 Webview 的完整 HTML 内容
 */
export function generateWebviewContent(_webview: vscode.Webview): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${UI_TEXT.watch}</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>${getStyles()}</style>
</head>
<body>
  ${getSearchSection()}
  <div class="ai-toolbar">
    <button onclick="sendAIAction('summarize')">${UI_TEXT.summarize}</button>
  </div>
  <div id="ai-result-panel"></div>
  <div id="translation-info"></div>
  <div class="video-container" id="player">
    <div style="color:var(--vscode-descriptionForeground); text-align:center; padding-top:15%">${UI_TEXT.videoPlaceholder}</div>
  </div>
  <div class="subtitle-panel">
    <div id="subtitlePanel" class="subtitle-list"></div>
  </div>
  <script>${getScript()}</script>
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
}

#video-player { width: 100%; height: 100%; }

.ai-toolbar {
  padding: 8px 12px;
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--border);
}

.ai-toolbar button {
  flex: 1;
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  padding: 4px;
  font-size: 11px;
}

#ai-result-panel, #translation-info {
  margin: 8px 12px;
  padding: 12px;
  background: var(--bg-editor);
  border: 1px solid var(--border);
  border-left: 4px solid var(--vscode-focusBorder);
  border-radius: var(--radius);
  font-size: var(--font-size-ui);
  display: none;
  max-height: 200px;
  overflow-y: auto;
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
  padding: 8px 20px;
  cursor: pointer;
  font-size: var(--font-size-sub);
  line-height: 1.6;
  border-left: 3px solid transparent;
}

.subtitle-line:hover { background: var(--vscode-list-hoverBackground); }
.subtitle-line.active {
  background: var(--vscode-list-activeSelectionBackground);
  color: var(--vscode-list-activeSelectionForeground);
  border-left-color: var(--vscode-focusBorder);
  font-weight: 500;
}

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
`;
}

function getSearchSection(): string {
  return `
<div class="search-container">
  <div class="input-group">
    <input type="text" id="videoInput" placeholder="${UI_TEXT.inputPlaceholder}">
    <button id="watchBtn">${UI_TEXT.watch}</button>
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
  transPanel: document.getElementById('translation-info'),
  aiPanel: document.getElementById('ai-result-panel')
};

let state = {
  subs: [],
  videoId: null,
  streamUrl: null,
  activeIndex: -1,
  currentTime: 0
};

marked.setOptions({ gfm: true, breaks: true });

const saved = vscode.getState();
if (saved) {
  state = { ...state, ...saved };
  els.input.value = state.inputValue || '';
  if (state.streamUrl) {
    loadVideo(state.streamUrl, state.videoId, state.subs, state.currentTime);
  }
}

function save() {
  const v = document.getElementById('video-player');
  state.currentTime = v ? v.currentTime : 0;
  state.inputValue = els.input.value;
  vscode.setState(state);
}

function loadVideo(url, id, subs, start) {
  state.streamUrl = url;
  state.videoId = id;
  els.player.innerHTML = '<video id="video-player" controls preload="auto"><source src="' + url + '" type="video/mp4"></video>';
  const v = document.getElementById('video-player');
  
  if (start) v.currentTime = start;
  if (subs && subs.length > 0) {
    state.subs = subs;
    renderSubs();
    updateActiveSub(start || 0);
  }
  
  v.ontimeupdate = () => {
    const t = v.currentTime;
    updateActiveSub(t);
    if (Math.floor(t) % 5 === 0) save();
  };

  v.onpause = save;
  if (!start) v.play().catch(() => {});
}

function renderSubs() {
  els.subPanel.innerHTML = state.subs.map((s, i) => {
    const words = s.text.split(/(\\s+)/).map(seg => {
      if (seg.trim()) {
        const clean = seg.replace(/[^a-zA-Z0-9']/g, '');
        return '<span class="word" data-word="' + clean + '" data-line="' + i + '">' + seg + '</span>';
      }
      return seg;
    }).join('');
    return '<div class="subtitle-line" id="sub-' + i + '" data-time="' + s.start + '">' + words + '</div>';
  }).join('');
}

function updateActiveSub(t) {
  const offset = 0.2;
  const idx = state.subs.findIndex(s => (t + offset) >= s.start && (t + offset) < (s.start + (s.duration || 2)));
  if (idx !== -1 && idx !== state.activeIndex) {
    const old = document.getElementById('sub-' + state.activeIndex);
    if (old) old.classList.remove('active');
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
    state.activeIndex = i;
    v.play().catch(() => {});
    save();
  }
}

els.subPanel.onmouseup = () => {
  const sel = window.getSelection();
  const text = sel.toString().trim();
  if (text) {
    els.transPanel.style.display = 'block';
    els.transPanel.innerHTML = '<div class="loading-spinner"></div>';
    
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
  }
};

els.subPanel.onclick = (e) => {
  if (window.getSelection().toString().trim()) return;

  const w = e.target.closest('.word');
  if (w) {
    const txt = w.dataset.word;
    const line = w.dataset.line;
    els.transPanel.style.display = 'block';
    els.transPanel.innerHTML = '<div class="loading-spinner"></div>';
    vscode.postMessage({ type: 'translate', text: txt, context: state.subs[line]?.text });
    return;
  }
  const l = e.target.closest('.subtitle-line');
  if (l) {
    const id = l.id.split('-')[1];
    jump(parseFloat(l.dataset.time), parseInt(id));
  }
};

els.btn.onclick = () => vscode.postMessage({ type: 'search', value: els.input.value });
window.sendAIAction = (a) => {
  els.aiPanel.style.display = 'block';
  els.aiPanel.innerHTML = '<div class="loading-spinner"></div>';
  vscode.postMessage({ type: 'aiAction', value: a });
};

window.addEventListener('message', e => {
  const m = e.data;
  if (m.type === 'playStream') {
    const v = document.getElementById('video-player');
    loadVideo(m.url, m.id, parseSubs(m.subs), (v && v.currentTime > 0) ? v.currentTime : 0);
  } else if (m.type === 'translationResult') {
    els.transPanel.innerHTML = '<div class="markdown-body">' + (marked.parse ? marked.parse(m.translation) : m.translation) + '</div>';
  } else if (m.type === 'aiResponse') {
    els.aiPanel.style.display = 'block';
    els.aiPanel.innerHTML = '<div class="markdown-body">' + (marked.parse ? marked.parse(m.content) : m.content) + '</div>';
  } else if (m.type === 'loading') {
    els.player.innerHTML = '<div class="loading-spinner"></div>';
  } else if (m.type === 'error') {
    els.player.innerHTML = '<div style="color:red;padding:20px">' + m.message + '</div>';
  }
});

function parseSubs(content) {
  try {
    const d = typeof content === 'string' ? JSON.parse(content) : content;
    if (!d || !d.events) return [];
    
    let lines = [];
    d.events.forEach(e => {
      if (!e.segs || e.segs.length === 0) return;
      
      const startTime = e.tStartMs / 1000;
      const eventDuration = (e.dDurationMs || 0) / 1000;
      
      const fullText = e.segs.map(s => s.utf8).join('');
      const textParts = fullText.split('\\n').filter(p => p.trim());
      
      if (textParts.length > 1) {
        textParts.forEach((part, idx) => {
          lines.push({
            start: startTime + (idx * (eventDuration / textParts.length)),
            duration: Math.max(eventDuration / textParts.length, 1.2),
            text: part.trim()
          });
        });
      } else if (textParts.length === 1) {
        lines.push({
          start: startTime,
          duration: Math.max(eventDuration, 1.2),
          text: textParts[0].trim()
        });
      }
    });

    return lines
      .filter(l => l.text.length > 0)
      .sort((a, b) => a.start - b.start);
  } catch (e) { 
    return []; 
  }
}
`;
}
