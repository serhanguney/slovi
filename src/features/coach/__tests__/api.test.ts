import { describe, expect, it, vi } from 'vitest';

// api.ts imports the Supabase client, which needs env; the stream helpers don't.
vi.mock('@/api/client', () => ({ supabase: {} }));

const { parseEvent, splitLines } = await import('../api');

describe('coach stream helpers', () => {
  it('splits complete NDJSON lines and keeps the partial one', () => {
    expect(splitLines('{"type":"done"}\n{"type":"te')).toEqual({
      lines: ['{"type":"done"}'],
      rest: '{"type":"te',
    });
    expect(splitLines('\n\n')).toEqual({ lines: [], rest: '' });
  });

  it('parses known events and ignores anything else', () => {
    expect(parseEvent('{"type":"text","delta":"Ahoj"}')).toEqual({ type: 'text', delta: 'Ahoj' });
    expect(
      parseEvent(
        JSON.stringify({
          type: 'corrections',
          submissionId: 1,
          errors: [
            {
              id: 2,
              original: 'koupil jsem',
              corrected: 'jsem koupil',
              error_type: 'clitic_order',
              explanation: 'jsem goes second.',
              lemma: 'koupit',
              root_word_id: null,
            },
          ],
          missingWords: ['koupit'],
        })
      )
    ).toMatchObject({ type: 'corrections', missingWords: ['koupit'] });
    expect(parseEvent('{"type":"mystery"}')).toBeNull();
    expect(parseEvent('not json')).toBeNull();
  });
});
