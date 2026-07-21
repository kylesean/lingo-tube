import * as assert from 'assert';
import { VideoService } from '../services/video-service';

suite('VideoService.extractVideoId', () => {
  const service = new VideoService();

  test('extracts ID from standard YouTube URL', () => {
    assert.strictEqual(
      service.extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
      'dQw4w9WgXcQ'
    );
  });

  test('extracts ID from short youtu.be URL', () => {
    assert.strictEqual(
      service.extractVideoId('https://youtu.be/dQw4w9WgXcQ'),
      'dQw4w9WgXcQ'
    );
  });

  test('extracts ID from embed URL', () => {
    assert.strictEqual(
      service.extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ'),
      'dQw4w9WgXcQ'
    );
  });

  test('extracts ID from shorts URL', () => {
    assert.strictEqual(
      service.extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'),
      'dQw4w9WgXcQ'
    );
  });

  test('extracts ID from URL with extra query parameters', () => {
    assert.strictEqual(
      service.extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42&list=PLtest'),
      'dQw4w9WgXcQ'
    );
  });

  test('extracts raw 11-character video ID', () => {
    assert.strictEqual(
      service.extractVideoId('dQw4w9WgXcQ'),
      'dQw4w9WgXcQ'
    );
  });

  test('handles ID with hyphens and underscores', () => {
    assert.strictEqual(
      service.extractVideoId('abc-_DEF1234'),
      'abc-_DEF1234'
    );
  });

  test('returns null for invalid input', () => {
    assert.strictEqual(service.extractVideoId('not-a-video'), null);
  });

  test('returns null for empty string', () => {
    assert.strictEqual(service.extractVideoId(''), null);
  });

  test('returns null for too-short input', () => {
    assert.strictEqual(service.extractVideoId('abc'), null);
  });

  test('trims whitespace from raw ID input', () => {
    assert.strictEqual(
      service.extractVideoId('  dQw4w9WgXcQ  '),
      'dQw4w9WgXcQ'
    );
  });
});
