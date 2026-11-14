import { describe, expect, it } from 'vitest';
import { segmentSentence } from '../aspectSentence';

describe('segmentSentence', () => {
  it('marks the answer and the signal in sentence order', () => {
    expect(segmentSentence('Celý večer jsem dělal úkoly.', 'dělal', 'Celý večer')).toEqual([
      { text: 'Celý večer', kind: 'signal' },
      { text: ' jsem ', kind: 'plain' },
      { text: 'dělal', kind: 'answer' },
      { text: ' úkoly.', kind: 'plain' },
    ]);
  });

  it('matches whole words only and ignores case', () => {
    expect(segmentSentence('Dělala to, co dělal on.', 'dělal', 'xyz')).toEqual([
      { text: 'Dělala to, co ', kind: 'plain' },
      { text: 'dělal', kind: 'answer' },
      { text: ' on.', kind: 'plain' },
    ]);
    expect(segmentSentence('Udělám to zítra.', 'udělám', 'zítra')[0]).toEqual({
      text: 'Udělám',
      kind: 'answer',
    });
  });

  it('drops a signal that overlaps the answer', () => {
    expect(segmentSentence('Konečně pochopil.', 'pochopil', 'Konečně pochopil')).toEqual([
      { text: 'Konečně ', kind: 'plain' },
      { text: 'pochopil', kind: 'answer' },
      { text: '.', kind: 'plain' },
    ]);
  });
});
