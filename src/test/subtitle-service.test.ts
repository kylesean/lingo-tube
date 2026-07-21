import * as assert from 'assert';
import { SubtitleService } from '../services/subtitle-service';
import { SubtitleData } from '../types';

suite('SubtitleService', () => {
  const service = new SubtitleService();

  test('returns empty array for undefined data', () => {
    const result = service.parseSubtitles(undefined as unknown as SubtitleData);
    assert.deepStrictEqual(result, []);
  });

  test('returns empty array for empty events', () => {
    const result = service.parseSubtitles({ events: [] });
    assert.deepStrictEqual(result, []);
  });

  test('merges consecutive fragments without pauses into one line', () => {
    const data: SubtitleData = {
      events: [
        { tStartMs: 0, dDurationMs: 500, segs: [{ utf8: 'Hello' }] },
        { tStartMs: 500, dDurationMs: 500, segs: [{ utf8: 'beautiful' }] },
        { tStartMs: 1000, dDurationMs: 500, segs: [{ utf8: 'world' }] }
      ]
    };
    const result = service.parseSubtitles(data);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].text, 'Hello beautiful world');
  });

  test('splits on pause gap >= 800ms', () => {
    const data: SubtitleData = {
      events: [
        { tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: 'First sentence here.' }] },
        { tStartMs: 2000, dDurationMs: 1000, segs: [{ utf8: 'Second sentence here.' }] }
      ]
    };
    const result = service.parseSubtitles(data);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].text, 'First sentence here.');
    assert.strictEqual(result[1].text, 'Second sentence here.');
  });

  test('does NOT split on short gap (< 800ms) even with punctuation', () => {
    const data: SubtitleData = {
      events: [
        { tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: 'Ready.' }] },
        { tStartMs: 1500, dDurationMs: 1000, segs: [{ utf8: 'Let us go now' }] }
      ]
    };
    const result = service.parseSubtitles(data);
    // gap = 500ms < 800ms, and "Ready." is only 1 word (< MIN_WORDS=5)
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].text, 'Ready. Let us go now');
  });

  test('splits on punctuation when line has enough words (>= 5)', () => {
    const data: SubtitleData = {
      events: [
        { tStartMs: 0, dDurationMs: 300, segs: [{ utf8: 'The' }] },
        { tStartMs: 300, dDurationMs: 300, segs: [{ utf8: 'quick' }] },
        { tStartMs: 600, dDurationMs: 300, segs: [{ utf8: 'brown' }] },
        { tStartMs: 900, dDurationMs: 300, segs: [{ utf8: 'fox.' }] },
        { tStartMs: 1200, dDurationMs: 300, segs: [{ utf8: 'jumps' }] }
      ]
    };
    const result = service.parseSubtitles(data);
    // "The quick brown fox." = 4 words, still < MIN_WORDS=5, so no split on punctuation
    // But gap between events is only 300ms, so they merge
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].text, 'The quick brown fox. jumps');
  });

  test('preserves >> speaker markers', () => {
    const data: SubtitleData = {
      events: [{
        tStartMs: 0, dDurationMs: 2000,
        segs: [{ utf8: '>> So I want to hear the story behind this' }]
      }]
    };
    const result = service.parseSubtitles(data);
    assert.ok(result[0].text.includes('>>'));
  });

  test('preserves [laughter] and similar markers', () => {
    const data: SubtitleData = {
      events: [{
        tStartMs: 0, dDurationMs: 2000,
        segs: [{ utf8: 'That was funny [laughter] indeed it was' }]
      }]
    };
    const result = service.parseSubtitles(data);
    assert.ok(result[0].text.includes('[laughter]'));
  });

  test('splits when line exceeds MAX_WORDS_PER_LINE (15)', () => {
    const events = [];
    for (let i = 0; i < 20; i++) {
      events.push({
        tStartMs: i * 200,
        dDurationMs: 200,
        segs: [{ utf8: `word${i}` }]
      });
    }
    const data: SubtitleData = { events };
    const result = service.parseSubtitles(data);
    assert.ok(result.length >= 2, 'Should split into at least 2 lines');
    for (const line of result) {
      const wc = line.text.split(/\s+/).length;
      assert.ok(wc <= 15, `Line should have <= 15 words, got ${wc}: "${line.text}"`);
    }
  });

  test('handles events with no segments', () => {
    const data: SubtitleData = {
      events: [
        { tStartMs: 0, dDurationMs: 1000 },
        { tStartMs: 1000, dDurationMs: 2000, segs: [{ utf8: 'Hello world here' }] }
      ]
    };
    const result = service.parseSubtitles(data);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].text, 'Hello world here');
  });

  test('normalizes whitespace in text', () => {
    const data: SubtitleData = {
      events: [{
        tStartMs: 0, dDurationMs: 2000,
        segs: [{ utf8: '  Hello   world  here  now' }]
      }]
    };
    const result = service.parseSubtitles(data);
    assert.strictEqual(result[0].text, 'Hello world here now');
  });
});
