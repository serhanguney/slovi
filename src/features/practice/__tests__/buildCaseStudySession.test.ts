/// <reference types="node" />
import { createClient } from '@supabase/supabase-js';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import type { Database } from '@/api/schema';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const email = process.env.TEST_USER_EMAIL!;
const password = process.env.TEST_USER_PASSWORD!;

const RUNS = 10;
const VALID_OPTION_COUNTS = new Set([2, 3, 4, 6]);

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

type Session = Database['public']['Functions']['build_case_study_session']['Returns'];

const WORD_FIXTURES = [
  { id: 17, label: 'noun – začátek' },
  { id: 31, label: 'adjective – narozený' },
  { id: 25, label: 'pronoun – oni' },
] as const;

beforeAll(async () => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Auth failed: ${error.message}`);
});

afterAll(async () => {
  await supabase.auth.signOut();
});

describe.each(WORD_FIXTURES)('build_case_study_session – $label', ({ id }) => {
  const sessions: Session[] = [];
  // word_form_id → surface forms that are equally valid (same case slot, different spelling)
  const cocorrectMap = new Map<number, string[]>();

  beforeAll(async () => {
    const [rpcResults, formsResult] = await Promise.all([
      Promise.all(
        Array.from({ length: RUNS }, () =>
          supabase.rpc('build_case_study_session', { p_root_word_ids: [id] })
        )
      ),
      supabase
        .from('word_forms')
        .select('id, form_in_czech, form_type_id, gender, plurality')
        .eq('root_word_id', id),
    ]);

    rpcResults.forEach(({ data, error }) => {
      expect(error, `RPC error: ${error?.message}`).toBeNull();
      expect(data).not.toBeNull();
      sessions.push(data!);
    });

    const allForms = formsResult.data ?? [];
    allForms.forEach((form) => {
      // True co-correct: same case slot (form_type + gender + plurality) but different surface string.
      // Forms that differ only in id but share the same string are the same answer, not a distractor.
      const coCorrect = allForms
        .filter(
          (f) =>
            f.id !== form.id &&
            f.form_type_id === form.form_type_id &&
            f.gender === form.gender &&
            f.plurality === form.plurality &&
            f.form_in_czech !== form.form_in_czech
        )
        .map((f) => f.form_in_czech);
      cocorrectMap.set(form.id, coCorrect);
    });
  });

  it('returns 10 questions every run', () => {
    sessions.forEach((session, i) => {
      expect(session.length, `run ${i + 1}: got ${session.length} questions`).toBe(10);
    });
  });

  it('includes the correct answer in options every run', () => {
    sessions.forEach((session, i) => {
      session.forEach((q) => {
        expect(
          q.options,
          `run ${i + 1}: options is null for word_form_id ${q.word_form_id}`
        ).not.toBeNull();
        expect(
          q.options!.includes(q.target_form),
          `run ${i + 1}: "${q.target_form}" missing from [${q.options!.join(', ')}] (word_form_id ${q.word_form_id})`
        ).toBe(true);
      });
    });
  });

  it('excludes co-correct variants from options', () => {
    sessions.forEach((session, i) => {
      session.forEach((q) => {
        (cocorrectMap.get(q.word_form_id) ?? []).forEach((variant) => {
          expect(
            q.options?.includes(variant),
            `run ${i + 1}: co-correct variant "${variant}" in options for "${q.target_form}" (word_form_id ${q.word_form_id})`
          ).toBe(false);
        });
      });
    });
  });

  it('has no duplicate entries in options', () => {
    sessions.forEach((session, i) => {
      session
        .filter((q) => q.options !== null)
        .forEach((q) => {
          const unique = new Set(q.options!);
          expect(
            unique.size,
            `run ${i + 1}: duplicate in [${q.options!.join(', ')}] (word_form_id ${q.word_form_id})`
          ).toBe(q.options!.length);
        });
    });
  });

  it('has a valid option count (2, 3, 4, or 6) per question', () => {
    sessions.forEach((session, i) => {
      session
        .filter((q) => q.options !== null)
        .forEach((q) => {
          expect(
            VALID_OPTION_COUNTS.has(q.options!.length),
            `run ${i + 1}: unexpected option count ${q.options!.length} (word_form_id ${q.word_form_id})`
          ).toBe(true);
        });
    });
  });

  it('has no duplicate word_form_ids within a single session', () => {
    sessions.forEach((session, i) => {
      const ids = session.map((q) => q.word_form_id);
      const unique = new Set(ids);
      expect(unique.size, `run ${i + 1}: duplicate word_form_ids: ${ids.join(', ')}`).toBe(
        ids.length
      );
    });
  });
});
