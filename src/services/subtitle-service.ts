import { SubtitleData, SubtitleEvent, SubtitleLine } from '../types';

const MAX_WORDS_PER_LINE = 15;
const MIN_WORDS_BEFORE_PUNCTUATION_BREAK = 5;
const PAUSE_THRESHOLD_MS = 800;

export class SubtitleService {
  /**
   * Parse raw json3 subtitle data into naturally-timed subtitle lines.
   *
   * Design principles (referenced from Netflix, YouTube, FluentU):
   * - Each line should be a semantically complete phrase or clause (5-15 words)
   * - Lines shorter than ~5 words feel fragmented; longer than ~15 are hard to read
   * - Speech pauses (>= 800ms) indicate natural boundaries between thoughts
   * - Sentence punctuation (.!?) can break a line only when it's long enough
   */
  parseSubtitles(data: SubtitleData): SubtitleLine[] {
    if (!data?.events?.length) {
      return [];
    }

    const fragments = this.extractFragments(data.events);
    if (fragments.length === 0) {
      return [];
    }

    return this.mergeIntoLines(fragments);
  }

  private extractFragments(events: SubtitleEvent[]): Array<{ start: number; end: number; text: string }> {
    const fragments: Array<{ start: number; end: number; text: string }> = [];

    for (const event of events) {
      if (!event.segs?.length) {
        continue;
      }

      const start = event.tStartMs / 1000;
      const duration = (event.dDurationMs || 0) / 1000;
      const end = start + duration;

      let text = event.segs.map(s => s.utf8).join('')
        .replace(/\\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (text.length > 0) {
        fragments.push({ start, end, text });
      }
    }

    return fragments;
  }

  private mergeIntoLines(
    fragments: Array<{ start: number; end: number; text: string }>
  ): SubtitleLine[] {
    const lines: SubtitleLine[] = [];
    let currentText = fragments[0].text;
    let currentStart = fragments[0].start;
    let currentEnd = fragments[0].end;
    let wordCount = this.countWords(currentText);

    for (let i = 1; i < fragments.length; i++) {
      const frag = fragments[i];
      const prevFrag = fragments[i - 1];
      const gap = frag.start - prevFrag.end;
      const fragWords = this.countWords(frag.text);

      const isPause = gap * 1000 >= PAUSE_THRESHOLD_MS;
      const endsSentence = /[.!?]\s*$/.test(currentText);
      const isLongEnough = wordCount >= MIN_WORDS_BEFORE_PUNCTUATION_BREAK;
      const wouldOverflow = wordCount + fragWords > MAX_WORDS_PER_LINE;

      const shouldBreak = isPause ||
        (endsSentence && isLongEnough) ||
        wouldOverflow;

      if (shouldBreak && wordCount > 0) {
        lines.push({
          start: currentStart,
          duration: Math.max(currentEnd - currentStart, 0.5),
          text: currentText
        });
        currentText = frag.text;
        currentStart = frag.start;
        currentEnd = frag.end;
        wordCount = fragWords;
      } else {
        currentText += ' ' + frag.text;
        currentEnd = frag.end;
        wordCount += fragWords;
      }
    }

    if (currentText.trim().length > 0) {
      lines.push({
        start: currentStart,
        duration: Math.max(currentEnd - currentStart, 1.5),
        text: currentText
      });
    }

    return lines;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  }
}
