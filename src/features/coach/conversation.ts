import type { Correction, HistoryMessage } from './api';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** User messages: the checker's corrections, once they arrive. */
  corrections?: Correction[];
  /** User messages: words the learner used that slovi's dictionary lacks. */
  missingWords?: string[];
  /** User messages: 'checking' until the corrections arrive (or fail). */
  check?: 'checking' | 'done' | 'failed';
  /** Assistant messages: still streaming. */
  streaming?: boolean;
};

type StoredSubmission = { text: string; corrections: Correction[] };

/**
 * Give the thread's user messages their stored corrections back. Submissions are matched
 * by text, in order, so a message whose check failed (no submission) doesn't shift the
 * rest onto the wrong messages.
 */
export const attachCorrections = (
  history: HistoryMessage[],
  submissions: StoredSubmission[]
): ChatMessage[] =>
  history.reduce<{ messages: ChatMessage[]; remaining: StoredSubmission[] }>(
    (acc, message) => {
      if (message.role !== 'user')
        return { ...acc, messages: [...acc.messages, { ...message, role: 'assistant' }] };
      const index = acc.remaining.findIndex(
        (submission) => submission.text.trim() === message.text.trim()
      );
      const submission = index >= 0 ? acc.remaining[index] : undefined;
      return {
        messages: [
          ...acc.messages,
          {
            id: message.id,
            role: 'user',
            text: message.text,
            corrections: submission?.corrections ?? [],
            check: submission ? 'done' : undefined,
          },
        ],
        remaining: index >= 0 ? acc.remaining.filter((_, i) => i !== index) : acc.remaining,
      };
    },
    { messages: [], remaining: submissions }
  ).messages;

/** The slovi words behind this conversation's corrections, for "Practice what I missed". */
export const missedWordIds = (messages: ChatMessage[]): number[] => [
  ...new Set(
    messages.flatMap((message) =>
      (message.corrections ?? []).flatMap((correction) =>
        correction.root_word_id === null ? [] : [correction.root_word_id]
      )
    )
  ),
];

export const ERROR_TYPE_LABEL: Record<Correction['error_type'], string> = {
  case: 'Case',
  clitic_order: 'jsem/se/si position',
  preposition: 'Preposition',
  aspect: 'Aspect',
  agreement: 'Agreement',
  verb_form: 'Verb form',
  vocabulary: 'Word choice',
  word_order: 'Word order',
  spelling: 'Spelling',
  other: 'Other',
};
