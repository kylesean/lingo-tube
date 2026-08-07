# LingoTube - YouTube English Learning Assistant for VS Code Forks

**English** | [中文](README.md)

LingoTube is an extension designed for VS Code forks (such as Antigravity, Cursor, Qoder, etc.), enabling you to practice English listening and learning directly within your editor.

Practice listening, lookup vocabulary, and analyze syntax in the sidebar during AI code generation or build wait times, without switching context to external browser windows.

### Normal Mode
![LingoTube Normal Mode](media/usage_demo.png)

### Camouflage Mode
![LingoTube Camouflage Mode](media/stealth_mode.png)

> **Playback Compatibility**: LingoTube extracts **MP4 progressive single-stream (itag 22/18, H.264+AAC)** via `yt-dlp`, with audio and video embedded in a single file for native browser playback — the most compatible and stable path. **Official VS Code is not supported**: its built-in Chromium kernel omits the proprietary AAC/H.264 decoders and cannot decode the MP4 streams LingoTube uses. Please use a fork IDE with built-in proprietary decoders (e.g. Antigravity, Cursor, Qoder) for the best playback experience.

## Features

- **Native IDE Playback**: Play YouTube videos in the Activity Bar or Editor Sidebar without leaving the editor.
- **Smart Synchronized Subtitles**: Automatically fetch and scroll subtitles with improved sentence breaking based on speech pauses and punctuation.
- **Smart Lookup**: Click any word in the subtitles to get instant AI-generated phonetic transcriptions, definitions, and usage examples.
- **AI Video Summary**: Extract video highlights and practical language expressions with a single click.
- **Grammar Analysis**: Break down complex sentence structures and analyze key grammatical points using AI.
- **Dual Privacy Modes**:
  - **Listening Mode**: Hide the video container while retaining audio and subtitles.
  - **Camouflage Mode**: Press **Alt+Q** to instantly disguise the subtitle interface as VS Code code comments.
- **Flexible AI Provider**: Use built-in IDE AI models or custom OpenAI-compatible endpoints (such as DeepSeek, Ollama, etc.).

## Prerequisites

Ensure [yt-dlp](https://github.com/yt-dlp/yt-dlp) is installed on your system before using this extension:

- **macOS**: `brew install yt-dlp`
- **Linux**: `sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp`
- **Windows**: `scoop install yt-dlp` or `winget install yt-dlp`

## Getting Started

1. **Launch Extension**: Click the **LingoTube** icon in the Activity Bar.
2. **Load Video**: Paste a YouTube video URL or ID into the input field and press Enter.
3. **Toggle Privacy Modes**:
   - Use the toggle button for **Listening Mode** (hides video).
   - Press **`Alt + Q`** to instantly activate **Camouflage Mode** (code view disguise).
4. **AI Assistance**: Click subtitle words to look up definitions, or click **AI Summary** for content highlights.

## AI Configuration

By default, LingoTube uses the IDE's built-in AI. To configure a custom API endpoint, add the following to your `settings.json`:

```json
{
  "lingoTube.ai.apiKey": "your-api-key",
  "lingoTube.ai.baseUrl": "http://localhost:11434/v1",
  "lingoTube.ai.model": "qwen2.5:7b"
}
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

[MIT License](./LICENSE)
