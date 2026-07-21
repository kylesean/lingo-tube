# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.2] - 2026-07-22

### Changed
- Updated documentation and improved project presentation.


## [1.3.1] - 2026-07-22

### Fixed
- **Official VS Code Audio/Video Playback**: Resolved audio/video playback failure in official VS Code caused by missing proprietary AAC/H.264 codecs. Updated format selection in `yt-dlp` to prioritize open codecs (**WebM/VP9 video + WebM/Opus audio**) without requiring `ffmpeg`. Implemented synchronized playback via dual `<video>` and hidden `<audio>` media elements in the Webview.
- **Media MIME Types**: Correctly set source MIME types according to container formats (WebM/MP4) to prevent WebM streams from being rejected.
- **URL Handling**: Added `--no-playlist` parameter to `yt-dlp` invocations to handle video URLs containing playlist parameters (`list=`).

## [1.3.0] - 2026-07-22

### Changed
- **Subtitle System Refactoring**: Introduced `SubtitleService` to handle subtitle parsing on the extension host side. Added natural phrase segmentation based on speech pauses (>=600ms), punctuation, and maximum word limit (15 words/line).

### Security
- Replaced `innerHTML` concatenation with native DOM creation APIs (`createElement`) to prevent potential XSS vectors.
- Upgraded HTML sanitizer from blacklist to strict whitelist strategy.
- Switched CSP nonce generator from `Math.random()` to `crypto.randomBytes()`.
- Avoided sending `Authorization: Bearer none` headers when API keys are omitted.

### Refactored
- Modified `VideoService` error paths to return rejected promises instead of resolving with `null`.
- Added friendly error detection and prompt when `yt-dlp` binary is missing (`ENOENT`).
- Removed unused methods in `IAIService`.

### Added
- Added unit test suites for `SubtitleService` and `VideoService.extractVideoId()`.

## [1.2.3] - 2026-06-19

### Fixed
- **Webview Startup Crash**: Fixed `InvalidStateError: Failed to register a ServiceWorker` when restoring Webview state. Deferred state restoration logic to the `DOMContentLoaded` event to avoid triggering media requests while document state is still loading.

## [1.2.2] - 2026-01-13

### Documentation
- Updated documentation with usage details for the `Alt+Q` keyboard shortcut and reference links to the changelog.

## [1.2.1] - 2026-01-12

### Changed
- Simplified display name and description for better visual clarity.

## [1.2.0] - 2026-01-12

### Added
- **Dual Privacy Modes**:
  - **Listening Mode**: Hide video playback container while maintaining subtitle stream.
  - **Camouflage Mode**: Toggle code-styled disguise using **Alt+Q** shortcut.

### Changed
- Changed privacy shortcut from `Alt+B` to `Alt+Q` to reduce shortcut collisions.

## [1.1.0] - 2026-01-12

### Security
- Localized `marked.js` library to eliminate external CDN dependencies and supply chain risks.
- Implemented nonce-based Content Security Policy (CSP) headers for Webview panels.

## [1.0.2] - 2026-01-12

### Added
- Initial release with AI-assisted YouTube subtitle translation and syntax analysis.
