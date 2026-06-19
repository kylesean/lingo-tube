# 更新日志

本项目所有的显著变更都将记录在本文档中。

## [1.2.3] - 2026-06-19

### 修复
- **Webview 启动崩溃**：修复插件 Webview 在恢复上次状态时偶发 `InvalidStateError: Failed to register a ServiceWorker: The document is in an invalid state` 错误。根本原因是顶层脚本在 `document.readyState` 仍为 `loading` 时就直接调用 `loadVideo()`，导致 Chromium 在文档未就绪期间触发媒体/网络请求。现已将状态恢复逻辑延迟至 `DOMContentLoaded` 事件后执行，彻底消除该竞态问题，无需再通过清除缓存来规避。

## [1.2.2] - 2026-01-13

### 优化
- **文档完善**：在 README.md 中增加了 `Alt + Q` 快捷键的使用说明及 CHANGELOG.md 的引用链接。

## [1.2.1] - 2026-01-12

### 优化
- **品牌简化**：精简了插件显示名称和描述，提升视觉整洁度。

## [1.2.0] - 2026-01-12

### 新增
- **双隐私模式系统**：
  - **听力模式 (Listening Mode)**：点击眼睛图标隐藏画面，保持原有学习 UI。
  - **伪装模式 (Camouflage Mode)**：新增快捷键 **Alt + Q**，瞬间进入 Boss Key 状态，字幕伪装为代码注释样式。

### 优化
- **UI 净化**：利用代码逻辑彻底隐藏了视图标题（视频播放器）及无意义的占位文本。
- **快捷键优化**：由 Alt + B 改为更顺手且低冲突的 Alt + Q。

## [1.1.0] - 2026-01-12

### 新增
- **隐蔽模式**：点击眼睛图标可隐藏视频画面，只保留音频播放和字幕显示，让你在 IDE 中安心"学习"

### 安全
- 移除外部 CDN 依赖（marked.js 本地化），消除供应链攻击风险
- 添加 Nonce-based Content Security Policy，增强 Webview 安全性

## [1.0.2] - 2026-01-12

- 统一中文界面提示词
- 规范化 CHANGELOG 记录