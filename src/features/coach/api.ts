import { z } from 'zod';
import { supabase } from '@/api/client';

/**
 * The Czech coach lives in slovi-agent (`/coach/*`). Every call carries the user's
 * Supabase access token; the server verifies it and checks the coach allowlist.
 */

const AGENT_URL: string | undefined = import.meta.env.VITE_SLOVI_AGENT_URL;

export const isCoachConfigured = () => Boolean(AGENT_URL);

export class CoachError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const errorBodySchema = z.object({ error: z.string() });

const coachFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
  if (!AGENT_URL) throw new CoachError('The coach is not configured (VITE_SLOVI_AGENT_URL).', 0);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const response = await fetch(`${AGENT_URL.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = errorBodySchema.safeParse(await response.json().catch(() => null));
    throw new CoachError(
      body.success ? body.data.error : `The coach answered ${response.status}.`,
      response.status
    );
  }
  return response;
};

// ── Chat stream ───────────────────────────────────────────────────────────────

const writingErrorTypeSchema = z.enum([
  'case',
  'clitic_order',
  'preposition',
  'aspect',
  'agreement',
  'verb_form',
  'vocabulary',
  'word_order',
  'spelling',
  'other',
]);

export const correctionSchema = z.object({
  id: z.number(),
  original: z.string(),
  corrected: z.string(),
  error_type: writingErrorTypeSchema,
  explanation: z.string(),
  lemma: z.string().nullable(),
  root_word_id: z.number().nullable(),
});
export type Correction = z.infer<typeof correctionSchema>;

const coachEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), delta: z.string() }),
  z.object({
    type: z.literal('corrections'),
    submissionId: z.number(),
    errors: z.array(correctionSchema),
    missingWords: z.array(z.string()),
  }),
  z.object({ type: z.literal('corrections_failed'), message: z.string() }),
  z.object({ type: z.literal('error'), message: z.string() }),
  z.object({ type: z.literal('done') }),
]);
export type CoachEvent = z.infer<typeof coachEventSchema>;

/** Complete NDJSON lines from a chunked buffer, and what is left over for the next chunk. */
export const splitLines = (buffer: string): { lines: string[]; rest: string } => {
  const parts = buffer.split('\n');
  return { lines: parts.slice(0, -1).filter((line) => line.trim()), rest: parts.at(-1) ?? '' };
};

export const parseEvent = (line: string): CoachEvent | null => {
  const parsed = coachEventSchema.safeParse(
    (() => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })()
  );
  return parsed.success ? parsed.data : null;
};

/** Sends a message and calls `onEvent` for every event of the reply stream. */
export const streamChat = async (
  { threadId, message }: { threadId: string; message: string },
  onEvent: (event: CoachEvent) => void
): Promise<void> => {
  const response = await coachFetch('/coach/chat', {
    method: 'POST',
    body: JSON.stringify({ threadId, message }),
  });
  const reader = response.body?.getReader();
  if (!reader) throw new CoachError('The coach sent no reply.', 0);
  const decoder = new TextDecoder();

  const read = async (buffer: string): Promise<void> => {
    const { done, value } = await reader.read();
    const text = buffer + (value ? decoder.decode(value, { stream: !done }) : '');
    const { lines, rest } = splitLines(done ? `${text}\n` : text);
    lines.forEach((line) => {
      const event = parseEvent(line);
      if (event) onEvent(event);
    });
    return done ? undefined : read(rest);
  };
  await read('');
};

// ── History and word requests ─────────────────────────────────────────────────

const historySchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['user', 'assistant']),
      text: z.string(),
      createdAt: z.string(),
    })
  ),
});
export type HistoryMessage = z.infer<typeof historySchema>['messages'][number];

export const fetchHistory = async (threadId: string): Promise<HistoryMessage[]> => {
  const response = await coachFetch(`/coach/history?threadId=${encodeURIComponent(threadId)}`);
  return historySchema.parse(await response.json()).messages;
};

export const requestWord = async (word: string): Promise<void> => {
  await coachFetch('/coach/words', { method: 'POST', body: JSON.stringify({ word }) });
};
