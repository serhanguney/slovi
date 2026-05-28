/// <reference types="node" />
import { createClient } from '@supabase/supabase-js';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import type { Database } from '@/api/schema';

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? '';
const email = process.env.TEST_USER_EMAIL ?? '';
const password = process.env.TEST_USER_PASSWORD ?? '';

const RUNS = 5;

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

type Session = Database['public']['Functions']['build_practice_session']['Returns'];
type VocabSession = Database['public']['Functions']['build_vocabulary_session']['Returns'];
type WordListRow = Database['public']['Functions']['get_user_word_list']['Returns'][number];
type Mode = 'case_understanding' | 'form_recall';

// ---------------------------------------------------------------------------
// Shared state — loaded once before all tests
// ---------------------------------------------------------------------------

let wordList: WordListRow[] = [];
let pinnedRootWordIds: number[] = [];

beforeAll(async () => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Auth failed: ${error.message}`);

  const [listResult, pinnedResult] = await Promise.all([
    supabase.rpc('get_user_word_list'),
    supabase.from('practice_box').select('root_word_id'),
  ]);
  expect(listResult.error, `get_user_word_list error: ${listResult.error?.message}`).toBeNull();
  expect(pinnedResult.error, `practice_box error: ${pinnedResult.error?.message}`).toBeNull();

  wordList = listResult.data ?? [];
  pinnedRootWordIds = (pinnedResult.data ?? []).map((r) => r.root_word_id);
});

afterAll(async () => {
  await supabase.auth.signOut();
});

// ---------------------------------------------------------------------------
// Core structure
// ---------------------------------------------------------------------------

describe('build_practice_session – core structure', () => {
  const sessions: Session[] = [];

  beforeAll(async () => {
    const results = await Promise.all(
      Array.from({ length: RUNS }, () =>
        supabase.rpc('build_practice_session', {
          p_mode: 'case_understanding',
          p_scope: 'mixed',
        })
      )
    );
    results.forEach(({ data, error }, i) => {
      expect(error, `run ${i + 1} RPC error: ${error?.message}`).toBeNull();
      sessions.push(data ?? []);
    });
  });

  it(`returns exactly 10 cards per session across ${RUNS} runs`, () => {
    sessions.forEach((session, i) => {
      expect(session.length, `run ${i + 1}: got ${session.length} cards`).toBe(10);
    });
  });

  it('all cards have the required non-null fields', () => {
    sessions.forEach((session, i) => {
      session.forEach((card) => {
        const ctx = `run ${i + 1}, word_form_id ${card.word_form_id}`;
        expect(card.word_form_id, `${ctx}: missing word_form_id`).toBeTruthy();
        expect(card.root_word_id, `${ctx}: missing root_word_id`).toBeTruthy();
        expect(card.target_form, `${ctx}: missing target_form`).toBeTruthy();
        expect(card.base_form, `${ctx}: missing base_form`).toBeTruthy();
        expect(card.correct_case, `${ctx}: missing correct_case`).toBeTruthy();
        expect(card.in_english, `${ctx}: missing in_english`).toBeTruthy();
      });
    });
  });

  it('has no duplicate word_form_ids within a single session', () => {
    sessions.forEach((session, i) => {
      const ids = session.map((c) => c.word_form_id);
      const dupes = ids.filter((id, idx) => ids.indexOf(id) !== idx);
      expect(dupes, `run ${i + 1}: duplicate word_form_ids: ${dupes.join(', ')}`).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Prioritization: fading words
//
// Source of truth: get_user_word_list (same as the UI).
// Fading words get priority 1.0 → guaranteed into the struggling tier.
// The struggling tier is one-form-per-root-word, capped at 4 slots, so we
// assert that min(fading_root_words, 4) distinct root words appear.
// ---------------------------------------------------------------------------

const MODE_STATUS_KEY: Record<Mode, 'cu_status' | 'fr_status'> = {
  case_understanding: 'cu_status',
  form_recall: 'fr_status',
};

describe.each<{ mode: Mode }>([{ mode: 'case_understanding' }, { mode: 'form_recall' }])(
  'build_practice_session – fading prioritization ($mode)',
  ({ mode }) => {
    let fadingRootWordIds: number[] = [];
    let session: Session = [];

    beforeAll(async () => {
      const statusKey = MODE_STATUS_KEY[mode];
      fadingRootWordIds = wordList
        .filter((w) => w[statusKey] === 'fading')
        .map((w) => w.root_word_id);

      const { data, error } = await supabase.rpc('build_practice_session', {
        p_mode: mode,
        p_scope: 'mixed',
      });
      expect(error, `RPC error: ${error?.message}`).toBeNull();
      session = data ?? [];
    });

    it('fading root words fill the struggling tier (one per root word, up to 4)', () => {
      console.log(
        `  mode "${mode}": ${fadingRootWordIds.length} fading, session has ${session.length} card(s)`
      );
      if (fadingRootWordIds.length === 0) {
        console.log(`  → no fading words – skipped`);
        return;
      }

      const sessionRootIds = new Set(session.map((c) => c.root_word_id));
      const fadingInSession = fadingRootWordIds.filter((id) => sessionRootIds.has(id));
      const expectedCount = Math.min(fadingRootWordIds.length, 4);

      console.log(
        `  → ${fadingInSession.length}/${fadingRootWordIds.length} fading root words in session (expected ≥${expectedCount})`
      );
      expect(
        fadingInSession.length,
        `Expected ≥${expectedCount} of ${fadingRootWordIds.length} fading root words.\n` +
          `  Fading:  [${fadingRootWordIds.join(', ')}]\n` +
          `  Session: [${[...sessionRootIds].join(', ')}]`
      ).toBeGreaterThanOrEqual(expectedCount);
    });
  }
);

// ---------------------------------------------------------------------------
// Prioritization: pinned words
//
// Words in the practice box always surface first:
//   – Never practiced in this mode → go into the dedicated pinned_new bucket (up to 2 slots)
//   – Already practiced in this mode → get priority 1.0 in the struggling tier
// At least 1 pinned root word should appear in the session if any are pinned.
// ---------------------------------------------------------------------------

describe('build_practice_session – pinned word prioritization', () => {
  let session: Session = [];

  beforeAll(async () => {
    const { data, error } = await supabase.rpc('build_practice_session', {
      p_mode: 'case_understanding',
      p_scope: 'mixed',
    });
    expect(error, `RPC error: ${error?.message}`).toBeNull();
    session = data ?? [];
  });

  it('pinned root words appear in the session', () => {
    console.log(
      `  ${pinnedRootWordIds.length} pinned root word(s), session has ${session.length} card(s)`
    );
    if (pinnedRootWordIds.length === 0) {
      console.log(`  → no pinned words – skipped`);
      return;
    }

    const sessionRootIds = new Set(session.map((c) => c.root_word_id));
    const pinnedInSession = pinnedRootWordIds.filter((id) => sessionRootIds.has(id));

    console.log(
      `  → ${pinnedInSession.length}/${pinnedRootWordIds.length} pinned root words in session`
    );
    expect(
      pinnedInSession.length,
      `Expected at least 1 pinned root word in session.\n` +
        `  Pinned:  [${pinnedRootWordIds.join(', ')}]\n` +
        `  Session: [${[...sessionRootIds].join(', ')}]`
    ).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Prioritization: low accuracy (formula-based struggling)
//
// Words practiced recently but with accuracy < 40% always have priority > 0.6
// regardless of decay, so they land in the struggling tier via the formula:
//   priority = 1 - (accuracy × decay)  →  > 0.6 when accuracy < 0.4
//
// We exclude fading words (covered separately) to isolate the accuracy path.
// The struggling tier is shared with fading and pinned words (4 slots total),
// so this assertion requires that fewer than 4 fading words exist — otherwise
// the struggling slots are already full and low-accuracy words are pushed out.
// ---------------------------------------------------------------------------

describe('build_practice_session – low accuracy prioritization (case_understanding)', () => {
  let lowAccRootWordIds: number[] = [];
  let fadingCuRootWordIds: number[] = [];
  const sessions: Session[] = [];

  beforeAll(async () => {
    fadingCuRootWordIds = wordList
      .filter((w) => w.cu_status === 'fading')
      .map((w) => w.root_word_id);

    // Practiced in CU mode (accuracy > 0 means at least 1 correct answer),
    // low accuracy, and not already fading
    lowAccRootWordIds = wordList
      .filter((w) => w.cu_accuracy > 0 && w.cu_accuracy < 0.4 && w.cu_status !== 'fading')
      .map((w) => w.root_word_id);

    // Run multiple sessions: with more practiced roots than session slots, a
    // low-accuracy root may not appear in every single run but should appear
    // across several runs due to the random() tiebreaker.
    const results = await Promise.all(
      Array.from({ length: RUNS }, () =>
        supabase.rpc('build_practice_session', {
          p_mode: 'case_understanding',
          p_scope: 'mixed',
        })
      )
    );
    results.forEach(({ data, error }, i) => {
      expect(error, `run ${i + 1} RPC error: ${error?.message}`).toBeNull();
      sessions.push(data ?? []);
    });
  });

  it('low accuracy root words appear in at least one session across multiple runs', () => {
    console.log(
      `  ${lowAccRootWordIds.length} low-accuracy word(s) (cu_accuracy < 0.4, not fading), ` +
        `${fadingCuRootWordIds.length} fading`
    );

    if (lowAccRootWordIds.length === 0) {
      console.log(`  → no low-accuracy words – skipped`);
      return;
    }

    const allSessionRootIds = sessions.flatMap((s) => s.map((c) => c.root_word_id));
    const lowAccFoundInAnySession = lowAccRootWordIds.filter((id) =>
      allSessionRootIds.includes(id)
    );

    console.log(
      `  → ${lowAccFoundInAnySession.length}/${lowAccRootWordIds.length} low-accuracy root words ` +
        `appeared in at least one of ${RUNS} sessions`
    );
    expect(
      lowAccFoundInAnySession.length,
      `Expected ≥1 low-accuracy root word to appear across ${RUNS} sessions.\n` +
        `  Low-acc: [${lowAccRootWordIds.join(', ')}]\n` +
        `  All session root IDs: [${[...new Set(allSessionRootIds)].join(', ')}]`
    ).toBeGreaterThanOrEqual(Math.min(lowAccRootWordIds.length, 1));
  });
});

// ---------------------------------------------------------------------------
// allow_new_words=false — only practiced forms returned
// ---------------------------------------------------------------------------

describe.each<{ mode: Mode }>([{ mode: 'case_understanding' }, { mode: 'form_recall' }])(
  'build_practice_session – allow_new_words=false ($mode)',
  ({ mode }) => {
    let practicedWordFormIds: Set<number>;
    let session: Session = [];

    beforeAll(async () => {
      const [progressResult, sessionResult] = await Promise.all([
        supabase.from('user_word_progress').select('word_form_id').eq('mode', mode),
        supabase.rpc('build_practice_session', {
          p_mode: mode,
          p_scope: 'mixed',
          p_allow_new_words: false,
        }),
      ]);
      expect(progressResult.error, `progress error: ${progressResult.error?.message}`).toBeNull();
      expect(sessionResult.error, `RPC error: ${sessionResult.error?.message}`).toBeNull();
      practicedWordFormIds = new Set((progressResult.data ?? []).map((r) => r.word_form_id));
      session = sessionResult.data ?? [];
    });

    it('returns a non-empty session', () => {
      expect(
        session.length,
        `got 0 cards — expected practiced words to be returned`
      ).toBeGreaterThan(0);
    });

    it('returns only word forms the user has already practiced', () => {
      session.forEach((card) => {
        expect(
          practicedWordFormIds.has(card.word_form_id),
          `word_form_id ${card.word_form_id} has no user_word_progress in mode "${mode}" but appeared in session`
        ).toBe(true);
      });
    });

    it('all returned cards have is_new_word=false', () => {
      session.forEach((card) => {
        expect(
          card.is_new_word,
          `word_form_id ${card.word_form_id} has is_new_word=true but allow_new_words was false`
        ).toBe(false);
      });
    });
  }
);

// ---------------------------------------------------------------------------
// is_new_word flag correctness (allow_new_words=true)
// ---------------------------------------------------------------------------

describe.each<{ mode: Mode }>([{ mode: 'case_understanding' }, { mode: 'form_recall' }])(
  'build_practice_session – is_new_word flag ($mode)',
  ({ mode }) => {
    let practicedWordFormIds: Set<number>;
    let session: Session = [];

    beforeAll(async () => {
      const [progressResult, sessionResult] = await Promise.all([
        supabase.from('user_word_progress').select('word_form_id').eq('mode', mode),
        supabase.rpc('build_practice_session', {
          p_mode: mode,
          p_scope: 'mixed',
          p_allow_new_words: true,
        }),
      ]);
      expect(progressResult.error, `progress error: ${progressResult.error?.message}`).toBeNull();
      expect(sessionResult.error, `RPC error: ${sessionResult.error?.message}`).toBeNull();
      practicedWordFormIds = new Set((progressResult.data ?? []).map((r) => r.word_form_id));
      session = sessionResult.data ?? [];
    });

    it('is_new_word=true only for forms with no prior progress in this mode', () => {
      session.forEach((card) => {
        const hasPrior = practicedWordFormIds.has(card.word_form_id);
        expect(
          card.is_new_word,
          `word_form_id ${card.word_form_id}: is_new_word=${card.is_new_word} but hasPriorProgress=${hasPrior}`
        ).toBe(!hasPrior);
      });
    });
  }
);

// ---------------------------------------------------------------------------
// build_vocabulary_session – core structure
// ---------------------------------------------------------------------------

describe('build_vocabulary_session – core structure', () => {
  const sessions: VocabSession[] = [];

  beforeAll(async () => {
    const results = await Promise.all(
      Array.from({ length: RUNS }, () => supabase.rpc('build_vocabulary_session'))
    );
    results.forEach(({ data, error }, i) => {
      expect(error, `run ${i + 1} RPC error: ${error?.message}`).toBeNull();
      sessions.push(data ?? []);
    });
  });

  it(`returns exactly 10 cards per session across ${RUNS} runs`, () => {
    sessions.forEach((session, i) => {
      expect(session.length, `run ${i + 1}: got ${session.length} cards`).toBe(10);
    });
  });

  it('all cards have the required non-null fields', () => {
    sessions.forEach((session, i) => {
      session.forEach((card) => {
        const ctx = `run ${i + 1}, word_form_id ${card.word_form_id}`;
        expect(card.word_form_id, `${ctx}: missing word_form_id`).toBeTruthy();
        expect(card.root_word_id, `${ctx}: missing root_word_id`).toBeTruthy();
        expect(card.correct_czech, `${ctx}: missing correct_czech`).toBeTruthy();
        expect(card.in_english, `${ctx}: missing in_english`).toBeTruthy();
        expect(card.distractors, `${ctx}: missing distractors`).toHaveLength(5);
      });
    });
  });

  it('has no duplicate word_form_ids within a single session', () => {
    sessions.forEach((session, i) => {
      const ids = session.map((c) => c.word_form_id);
      const dupes = ids.filter((id, idx) => ids.indexOf(id) !== idx);
      expect(dupes, `run ${i + 1}: duplicate word_form_ids: ${dupes.join(', ')}`).toHaveLength(0);
    });
  });

  it('has no duplicate root_word_ids within a single session', () => {
    sessions.forEach((session, i) => {
      const ids = session.map((c) => c.root_word_id);
      const dupes = ids.filter((id, idx) => ids.indexOf(id) !== idx);
      expect(dupes, `run ${i + 1}: duplicate root_word_ids: ${dupes.join(', ')}`).toHaveLength(0);
    });
  });

  it('target_form appears in sentence_czech', () => {
    sessions.forEach((session, i) => {
      session.forEach((card) => {
        expect(
          card.sentence_czech.toLowerCase(),
          `run ${i + 1}, word_form_id ${card.word_form_id}: target_form "${card.target_form}" not found in sentence "${card.sentence_czech}"`
        ).toContain(card.target_form.toLowerCase());
      });
    });
  });

  it('distractors are in English (do not match correct_czech)', () => {
    sessions.forEach((session, i) => {
      session.forEach((card) => {
        card.distractors.forEach((d) => {
          expect(
            d,
            `run ${i + 1}, word_form_id ${card.word_form_id}: distractor "${d}" matches correct_czech "${card.correct_czech}" — distractors must be English`
          ).not.toBe(card.correct_czech);
          expect(
            d,
            `run ${i + 1}, word_form_id ${card.word_form_id}: distractor "${d}" equals in_english "${card.in_english}" — distractor must differ from correct answer`
          ).not.toBe(card.in_english);
        });
      });
    });
  });

  it('distractors share the same word_type as the correct answer', async () => {
    const allRootWordIds = [...new Set(sessions.flatMap((s) => s.map((c) => c.root_word_id)))];
    const allDistractorStrings = [
      ...new Set(sessions.flatMap((s) => s.flatMap((c) => c.distractors))),
    ];

    const [{ data: cardWords, error: e1 }, { data: distractorWords, error: e2 }] =
      await Promise.all([
        supabase.from('root_words').select('id, word_type').in('id', allRootWordIds),
        supabase
          .from('root_words')
          .select('in_english, word_type')
          .in('in_english', allDistractorStrings),
      ]);
    expect(e1, `root_words (cards) lookup error: ${e1?.message}`).toBeNull();
    expect(e2, `root_words (distractors) lookup error: ${e2?.message}`).toBeNull();

    const cardTypeById = new Map((cardWords ?? []).map((w) => [w.id, w.word_type]));
    const distractorTypeByEnglish = new Map(
      (distractorWords ?? []).map((w) => [w.in_english, w.word_type])
    );

    sessions.forEach((session, i) => {
      session.forEach((card) => {
        const cardType = cardTypeById.get(card.root_word_id);
        card.distractors.forEach((d) => {
          const distractorType = distractorTypeByEnglish.get(d);
          expect(
            distractorType,
            `run ${i + 1}, word_form_id ${card.word_form_id}: distractor "${d}" has word_type "${distractorType}" but card word_type is "${cardType}"`
          ).toBe(cardType);
        });
      });
    });
  });
});

// ---------------------------------------------------------------------------
// build_vocabulary_session – is_new_word flag correctness
// ---------------------------------------------------------------------------

describe('build_vocabulary_session – is_new_word flag', () => {
  let practicedRootWordIds: Set<number>;
  let session: VocabSession = [];

  beforeAll(async () => {
    const { data, error } = await supabase.rpc('build_vocabulary_session', {
      p_allow_new_words: true,
    });
    expect(error, `RPC error: ${error?.message}`).toBeNull();
    session = data ?? [];
    practicedRootWordIds = new Set(
      wordList.filter((w) => w.last_practiced !== null).map((w) => w.root_word_id)
    );
  });

  it('is_new_word=true only for root words with no prior practice in any mode', () => {
    session.forEach((card) => {
      const hasPrior = practicedRootWordIds.has(card.root_word_id);
      expect(
        card.is_new_word,
        `root_word_id ${card.root_word_id}: is_new_word=${card.is_new_word} but hasPriorProgress=${hasPrior}`
      ).toBe(!hasPrior);
    });
  });
});

// ---------------------------------------------------------------------------
// build_vocabulary_session – allow_new_words=false
// ---------------------------------------------------------------------------

describe('build_vocabulary_session – allow_new_words=false', () => {
  let practicedRootWordIds: Set<number>;
  let session: VocabSession = [];

  beforeAll(async () => {
    const { data, error } = await supabase.rpc('build_vocabulary_session', {
      p_allow_new_words: false,
    });
    expect(error, `RPC error: ${error?.message}`).toBeNull();
    session = data ?? [];
    practicedRootWordIds = new Set(
      wordList.filter((w) => w.last_practiced !== null).map((w) => w.root_word_id)
    );
  });

  it('returns a non-empty session', () => {
    expect(session.length, `got 0 cards — expected practiced words to be returned`).toBeGreaterThan(
      0
    );
  });

  it('returns only words the user has already practiced in any mode', () => {
    session.forEach((card) => {
      expect(
        practicedRootWordIds.has(card.root_word_id),
        `root_word_id ${card.root_word_id} has no practice history but appeared in session`
      ).toBe(true);
    });
  });

  it('all returned cards have is_new_word=false', () => {
    session.forEach((card) => {
      expect(
        card.is_new_word,
        `root_word_id ${card.root_word_id} has is_new_word=true but allow_new_words was false`
      ).toBe(false);
    });
  });
});
