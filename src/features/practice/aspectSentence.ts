type SentenceSegment = { text: string; kind: 'plain' | 'answer' | 'signal' };

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Where `needle` occurs in `sentence` as whole words (case-insensitive), or null. */
const findWhole = (sentence: string, needle: string): { start: number; end: number } | null => {
  if (!needle.trim()) return null;
  const match = new RegExp(`(?<!\\p{L})${escapeRegExp(needle.trim())}(?!\\p{L})`, 'iu').exec(
    sentence
  );
  return match ? { start: match.index, end: match.index + match[0].length } : null;
};

/**
 * Split an aspect contrast sentence into the answer form (blanked before the learner
 * answers), the signal words that decide the aspect (highlighted afterwards) and the
 * plain text around them. A signal that overlaps the answer is ignored.
 */
export const segmentSentence = (
  sentence: string,
  answer: string,
  signal: string
): SentenceSegment[] => {
  const answerRange = findWhole(sentence, answer);
  const signalRange = findWhole(sentence, signal);
  const overlaps =
    answerRange !== null &&
    signalRange !== null &&
    signalRange.start < answerRange.end &&
    answerRange.start < signalRange.end;

  const marks = [
    ...(answerRange ? [{ ...answerRange, kind: 'answer' as const }] : []),
    ...(signalRange && !overlaps ? [{ ...signalRange, kind: 'signal' as const }] : []),
  ].sort((a, b) => a.start - b.start);

  const { segments, cursor } = marks.reduce<{ segments: SentenceSegment[]; cursor: number }>(
    (acc, mark) => ({
      segments: [
        ...acc.segments,
        ...(mark.start > acc.cursor
          ? [{ text: sentence.slice(acc.cursor, mark.start), kind: 'plain' as const }]
          : []),
        { text: sentence.slice(mark.start, mark.end), kind: mark.kind },
      ],
      cursor: mark.end,
    }),
    { segments: [], cursor: 0 }
  );

  return cursor < sentence.length
    ? [...segments, { text: sentence.slice(cursor), kind: 'plain' }]
    : segments;
};
