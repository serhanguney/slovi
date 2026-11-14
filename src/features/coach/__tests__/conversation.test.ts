import { describe, expect, it } from 'vitest';
import type { Correction } from '../api';
import { attachCorrections, missedWordIds } from '../conversation';

const correction = (id: number, rootWordId: number | null): Correction => ({
  id,
  original: 'a',
  corrected: 'b',
  error_type: 'case',
  explanation: 'rule',
  lemma: null,
  root_word_id: rootWordId,
});

const message = (id: string, role: 'user' | 'assistant', text: string) => ({
  id,
  role,
  text,
  createdAt: '2026-11-14T10:00:00Z',
});

describe('attachCorrections', () => {
  it('matches submissions to user messages by text, skipping a message without one', () => {
    const messages = attachCorrections(
      [
        message('1', 'user', 'Ahoj'),
        message('2', 'assistant', 'Ahoj! Jak se máš?'),
        message('3', 'user', 'Mam se dobre'),
        message('4', 'user', 'Vcera koupil jsem chleba'),
      ],
      [
        { text: 'Ahoj', corrections: [] },
        { text: 'Vcera koupil jsem chleba', corrections: [correction(9, 5)] },
      ]
    );
    expect(messages.map((m) => [m.id, m.check, m.corrections?.length])).toEqual([
      ['1', 'done', 0],
      ['2', undefined, undefined],
      ['3', undefined, 0],
      ['4', 'done', 1],
    ]);
  });
});

describe('missedWordIds', () => {
  it('collects the distinct slovi words behind corrections', () => {
    expect(
      missedWordIds([
        { id: '1', role: 'user', text: 'x', corrections: [correction(1, 5), correction(2, null)] },
        { id: '2', role: 'user', text: 'y', corrections: [correction(3, 5), correction(4, 7)] },
      ])
    ).toEqual([5, 7]);
  });
});
