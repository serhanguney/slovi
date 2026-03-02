# Practice Module

## Approach: Case-Driven Sentence Completion

Practice is structured around Czech grammatical cases. Users can freely practice any case at any time — no locked progression.

Suggested order by frequency/usefulness:

1. Accusative
2. Locative
3. Dative
4. Genitive
5. Instrumental
6. Vocative

Nominative is assumed known (dictionary form). Verbs are deferred to Phase 2.

---

## Exercise Format

Each session presents 10 cards. Every card is a sentence with the target word in bold.

### Easy Mode (Case Identification)

The full sentence is shown with the word in **bold**. The user identifies which grammatical case the bold word is in.

Example:

> "Viděl jsem velkého **psa**."
> → [Nominative, Accusative, Genitive, Dative, Locative, Instrumental]

This tests _understanding_: does the user know why this case is used?

### Hard Mode (Form Recall)

The sentence has a blank. The base form (nominative) is shown as a hint. The user types the correct declined form.

Example:

> "Vidím \_\_\_." [pes]
> → user types: psa

This tests _recall_: can the user produce the correct form?

---

## Skill Measurement

Easy and Hard mode test fundamentally different skills and are tracked separately. They are **never collapsed into a single score**.

### Skill Scores (per case, shown as %)

```
Case Understanding = sum(easy_correct) / sum(easy_correct + easy_incorrect)
Form Recall        = sum(hard_correct) / sum(hard_correct + hard_incorrect)
```

These are honest accuracy percentages. Not points, not levels — just how often the user gets it right.

The gap between them is meaningful: high Case Understanding + low Form Recall means the user grasps the grammar but is still building muscle memory on the forms.

### Known Words

A word-case pair is **Known** when:

```
easy_correct >= 5 AND hard_correct >= 5
```

No time assumption. Mastery is defined by performance, not recency.

### Levels (per case, based on known word count)

Levels are based on how many root words the user has mastered in a case — not on accuracy percentage. Accuracy is displayed as-is as an honest metric; levels are earned milestones.

| Level      | Known words in case |
| ---------- | ------------------- |
| Beginner   | 0                   |
| Familiar   | 1                   |
| Proficient | 5                   |
| Fluent     | 15                  |

Level-up toasts fire when `known_count` crosses a threshold, not when accuracy crosses one. This means levels take sustained effort to earn (weeks, not the first session).

### Dusty Words Quiz

A separate quiz type surfaces words where:

```
known = true AND last_practiced_at < now - 90 days
```

This is a suggestion, never forced. The app does not demote or reset known words based on time. It simply offers to refresh them.

---

## Adaptive Retention Algorithm (ARS)

### Priority Score

Calculated independently for Easy and Hard mode per `(word_form_id)`:

```
accuracy   = correct / max(correct + incorrect, 1)
half_life  = max(correct, 1) * 3        // in days
days_since = (now - last_practiced_at) / 86400
retention  = accuracy * exp(-days_since / half_life)
priority   = 1 - retention
```

**What each term means:**

- **accuracy** — how often you've gotten this right historically (0 to 1)
- **half_life** — how many days before your retention drops to ~37%, assuming perfect accuracy. It grows with every correct answer: 1 correct = 3 day half-life, 5 correct = 15 days, 10 correct = 30 days. The more you've nailed it, the longer until you need to see it again.
- **retention** — estimated probability you still remember it right now. Decays exponentially as days pass, faster for words you know poorly.
- **priority** = 1 − retention. High priority = you're likely to have forgotten it or you've been getting it wrong.

**Priority examples at a glance:**

| Scenario                     | Priority      |
| ---------------------------- | ------------- |
| Never practiced              | 0.5 (neutral) |
| 1 correct, seen yesterday    | 0.22          |
| 1 correct, seen 3 days ago   | 0.63          |
| 5 correct, seen 7 days ago   | 0.37          |
| 40% accuracy, seen yesterday | 0.68          |
| 10 correct, seen today       | ~0            |

### Session Construction (10 cards)

Each session = **10 unique words**, each shown exactly once. Mode is chosen at session start — all 10 cards use that mode.

| Slot        | Criteria                     | Count |
| ----------- | ---------------------------- | ----- |
| Struggling  | priority > 0.6               | 4     |
| Reinforcing | 0.3 < priority ≤ 0.6         | 4     |
| New         | never practiced in this mode | 2     |

If a bucket doesn't have enough candidates, fill remaining slots from highest priority overall.

**Boot session (first session in a mode for a new case):** all 10 slots are new words. No review pool exists yet.

**Regular session:** 8 review + 2 new. New words trickle in at 2 per session.

**Hard mode eligibility:** a word only appears in Hard sessions once it has `easy_correct >= 1`. The user should recognise the case before being asked to produce the form. The first Hard session for a case therefore draws from the existing Easy pool, ordered by Easy accuracy descending (words you understood best go first).

### New Word Selection

New words are selected from `root_words` ordered by `frequency_rank` ASC, filtered to words the user has not yet practiced in the active mode. The most common Czech words surface first.

### After Each Answer

**Correct:** `correct_count++`, `last_practiced_at = now`

**Incorrect:** `incorrect_count++`, `last_practiced_at = now`

Wrong answers are **recorded only** — no re-queuing in the same session. The elevated `incorrect_count` naturally raises priority for the next session via the formula above.

---

## Database Schema

### Tables

These align with the schema proposed in PLANNING.md, updated for the ARS algorithm.

**`user_word_progress`** — one row per `(profile_id, word_form_id, mode)`, read by the ARS algorithm on every session build:

```sql
user_word_progress (
  profile_id        uuid REFERENCES profiles,
  word_form_id      uuid REFERENCES word_forms,
  mode              text,        -- 'easy' | 'hard'
  correct           int          DEFAULT 0,
  incorrect         int          DEFAULT 0,
  last_practiced_at timestamptz,

  PRIMARY KEY (profile_id, word_form_id, mode)
)
```

Normalizing mode into the primary key (instead of flat `easy_correct`, `hard_correct` columns) keeps the schema extensible — Phase 2 modes are new rows, not new columns. Replaces the SM-2 fields previously proposed in PLANNING.md.

**`practice_attempts`** — one row per card answered, source of truth for all gains calculations:

```sql
practice_attempts (
  id              uuid PRIMARY KEY,
  profile_id      uuid REFERENCES profiles,
  word_form_id    uuid REFERENCES word_forms,
  mode            text,        -- 'easy' | 'hard'
  was_correct     boolean,
  created_at      timestamptz DEFAULT now()
)
```

`user_word_progress` is always updated in the same transaction as inserting a `practice_attempts` row, keeping them in sync.

### Gains Tracking

Weekly and monthly gains are calculated directly from `practice_attempts` — no separate snapshot table needed.

```sql
-- Case Understanding gain: this week vs last week (accusative, example)
SELECT
  AVG(CASE WHEN was_correct THEN 1.0 ELSE 0.0 END) AS accuracy,
  'this_week' AS period
FROM practice_attempts pa
JOIN word_forms wf ON pa.word_form_id = wf.id
JOIN form_types ft ON wf.form_type_id = ft.id
WHERE pa.profile_id = $1
  AND pa.mode = 'easy'
  AND ft.name = 'accusative'
  AND pa.created_at >= now() - interval '7 days'

UNION ALL

SELECT
  AVG(CASE WHEN was_correct THEN 1.0 ELSE 0.0 END),
  'last_week'
FROM practice_attempts pa
JOIN word_forms wf ON pa.word_form_id = wf.id
JOIN form_types ft ON wf.form_type_id = ft.id
WHERE pa.profile_id = $1
  AND pa.mode = 'easy'
  AND ft.name = 'accusative'
  AND pa.created_at BETWEEN now() - interval '14 days' AND now() - interval '7 days';
```

Gain = `this_week.accuracy − last_week.accuracy`. Shown as `+5%` or `−3%` next to the skill score.

For monthly gains, replace the intervals with `30 days` and `60 days`.

If the user has no data for the comparison period (e.g., they only started this week), the gain is shown as `—` rather than 0.

## Session UX

Two axes determine every session:

**Axis 1 — Mode (chosen before starting):**

- **Easy** — 10 unique words, all case identification
- **Hard** — 10 unique words, all form recall

**Axis 2 — Scope (chosen before starting):**

- **Mixed** — algorithm picks across all active cases
- **Case-focused** — user filters to one case; all 10 words are from that case

A case appears in the scope picker once the user has at least one practiced word in it.

### Cross-Case Weighting in Mixed Sessions

When scope is Mixed, the algorithm doesn't divide slots evenly across cases. It weights by **deficiency** — how much room for improvement remains per case in the chosen mode.

```
deficiency(case) = 1 - accuracy(case, mode)
weight(case)     = deficiency(case) / sum(all deficiencies)
slots(case)      = round(weight(case) * 10)
```

Example with three active cases, Easy mode:

```
Accusative Understanding: 97% → deficiency = 0.03
Locative Understanding:   88% → deficiency = 0.12
Dative Understanding:     65% → deficiency = 0.35
Total: 0.50

Accusative gets 0.03/0.50 = 6%  → 1 word
Locative gets  0.12/0.50 = 24% → 2 words
Dative gets    0.35/0.50 = 70% → 7 words
```

The algorithm naturally shifts sessions toward the weakest case without the user having to think about it. As Dative improves, the distribution rebalances toward whatever comes next.

**When to suggest a new case:** if the current weakest active case has deficiency < 0.10 in both modes (i.e., both Understanding and Form Recall above 90%), the app surfaces a prompt: "You're strong in all active cases. Ready to start Dative?"

---

## Open Questions

1. **Verbs** — deferred to Phase 2. Current sentence format uses verbs contextually but only nouns are the target of practice.
2. **`frequency_rank` on `root_words`** — needs to be populated. Source: Czech word frequency corpus data. New words per session are selected by ascending `frequency_rank` for words not yet in the user's `user_word_progress`.

### Resolved

**New words per session** — `NEW_WORDS_PER_SESSION = 2` is a constant in the server-side session-building service. One place, easy to change.

**Does an incorrect answer raise priority?** — Yes, through accuracy dropping in the formula. A single wrong answer on a well-known word (~4× priority increase next day). Multiple consecutive wrong answers compound significantly.

**Browser closed mid-session** — No effect. Each answer is written to the database immediately on submit, not at session end. A session is a UI-only concept — no session state is stored server-side. Unanswered cards are simply not recorded.

**`user_word_progress` schema** — Normalized to one row per `(profile_id, word_form_id, mode)` instead of flat easy/hard columns. Mode is a `text` field (`'easy'` or `'hard'`). Phase 2 modes are new rows, not schema changes.

**`practice_attempts` for gains** — Serves a different purpose than `user_word_progress`. The progress table is an all-time running total used by the ARS algorithm. The attempts table is a timestamped raw log used for time-windowed analytics. To get "this week's accuracy" you filter attempts by `created_at >= now() - 7 days`. You cannot derive this from the progress table because it has no time boundaries.

**Frontend during sessions** — Session building is entirely server-side. The frontend sends `POST /api/sessions/build { mode, scope }` and receives exactly 10 word objects with their sentences. It never touches the full word pool. The backend queries only the user's own `user_word_progress` rows (their practiced subset, not all 2000 words) plus the 10 fetched word forms.

---

## Implementation Plan

### Step 1 — Database Migrations

#### 1a. Add `frequency_rank` to `root_words`

```sql
ALTER TABLE root_words ADD COLUMN frequency_rank int;
CREATE INDEX idx_root_words_frequency_rank ON root_words (frequency_rank ASC NULLS LAST);
```

Populate from a Czech word frequency list. Words without a rank are treated as lowest priority for new word selection.

#### 1b. Create `user_word_progress`

```sql
CREATE TABLE user_word_progress (
  profile_id        uuid        NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  word_form_id      uuid        NOT NULL REFERENCES word_forms (id) ON DELETE CASCADE,
  mode              text        NOT NULL CHECK (mode IN ('easy', 'hard')),
  correct           int         NOT NULL DEFAULT 0,
  incorrect         int         NOT NULL DEFAULT 0,
  last_practiced_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (profile_id, word_form_id, mode)
);

CREATE INDEX idx_uwp_profile_mode ON user_word_progress (profile_id, mode);
```

Enable RLS:

```sql
ALTER TABLE user_word_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own progress"
  ON user_word_progress
  FOR ALL
  USING (profile_id = auth.uid());
```

#### 1c. Create `practice_attempts`

```sql
CREATE TABLE practice_attempts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid        NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  word_form_id    uuid        NOT NULL REFERENCES word_forms (id) ON DELETE CASCADE,
  mode            text        NOT NULL CHECK (mode IN ('easy', 'hard')),
  was_correct     boolean     NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pa_profile_created ON practice_attempts (profile_id, created_at DESC);
CREATE INDEX idx_pa_profile_mode_created ON practice_attempts (profile_id, mode, created_at DESC);
```

Enable RLS:

```sql
ALTER TABLE practice_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own attempts"
  ON practice_attempts
  FOR ALL
  USING (profile_id = auth.uid());
```

---

### Step 2 — RPC Functions

#### 2a. `record_practice_answer`

Called after every card answer. Writes both tables atomically and returns achievement flags so the frontend can show toasts without a second request.

```sql
CREATE OR REPLACE FUNCTION record_practice_answer(
  p_word_form_id uuid,
  p_mode         text,
  p_was_correct  boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id           uuid := auth.uid();
  v_new_correct       int;
  v_case_name         text;
  v_word_became_known boolean := false;
  v_level_up          jsonb := null;
  v_old_known_count   int;
  v_new_known_count   int;
BEGIN
  -- 1. Insert attempt
  INSERT INTO practice_attempts (profile_id, word_form_id, mode, was_correct)
  VALUES (v_user_id, p_word_form_id, p_mode, p_was_correct);

  -- 2. Upsert progress
  INSERT INTO user_word_progress (profile_id, word_form_id, mode, correct, incorrect, last_practiced_at)
  VALUES (
    v_user_id, p_word_form_id, p_mode,
    CASE WHEN p_was_correct THEN 1 ELSE 0 END,
    CASE WHEN p_was_correct THEN 0 ELSE 1 END,
    now()
  )
  ON CONFLICT (profile_id, word_form_id, mode) DO UPDATE SET
    correct           = user_word_progress.correct   + CASE WHEN p_was_correct THEN 1 ELSE 0 END,
    incorrect         = user_word_progress.incorrect + CASE WHEN p_was_correct THEN 0 ELSE 1 END,
    last_practiced_at = now()
  RETURNING correct INTO v_new_correct;

  -- 3. Check: did this word just become Known? (both modes correct >= 5)
  IF p_was_correct AND v_new_correct = 5 THEN
    v_word_became_known := (
      SELECT correct >= 5
      FROM user_word_progress
      WHERE profile_id = v_user_id
        AND word_form_id = p_word_form_id
        AND mode = CASE WHEN p_mode = 'easy' THEN 'hard' ELSE 'easy' END
    );
  END IF;

  -- 4. Check: did the case-level cross a known_count threshold? (1 / 5 / 15)
  -- Only worth checking if a word just became known
  IF v_word_became_known THEN
    SELECT ft.name INTO v_case_name
    FROM word_forms wf
    JOIN form_types ft ON wf.form_type_id = ft.id
    WHERE wf.id = p_word_form_id;

    -- Count known root_words in this case before this answer (subtract 1)
    SELECT COUNT(DISTINCT rw.id) - 1 INTO v_old_known_count
    FROM word_forms wf
    JOIN root_words rw ON wf.root_word_id = rw.id
    JOIN form_types ft ON wf.form_type_id = ft.id
    WHERE ft.name = v_case_name AND ft.category = 'case'
      AND EXISTS (SELECT 1 FROM user_word_progress WHERE profile_id = v_user_id AND word_form_id = wf.id AND mode = 'easy' AND correct >= 5)
      AND EXISTS (SELECT 1 FROM user_word_progress WHERE profile_id = v_user_id AND word_form_id = wf.id AND mode = 'hard' AND correct >= 5);

    v_new_known_count := v_old_known_count + 1;

    -- Level thresholds: 1 (Familiar), 5 (Proficient), 15 (Fluent)
    IF (v_old_known_count < 1  AND v_new_known_count >= 1)  OR
       (v_old_known_count < 5  AND v_new_known_count >= 5)  OR
       (v_old_known_count < 15 AND v_new_known_count >= 15) THEN
      v_level_up := jsonb_build_object(
        'case', v_case_name,
        'known_count', v_new_known_count,
        'level', CASE
          WHEN v_new_known_count >= 15 THEN 'Fluent'
          WHEN v_new_known_count >= 5  THEN 'Proficient'
          ELSE 'Familiar'
        END
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'word_became_known', v_word_became_known,
    'level_up', v_level_up
  );
END;
$$;
```

---

#### 2b. `build_practice_session`

Runs the ARS algorithm server-side and returns exactly 10 card objects. The frontend renders whatever it receives.

```sql
CREATE OR REPLACE FUNCTION build_practice_session(
  p_mode  text,   -- 'easy' | 'hard'
  p_scope text    -- 'mixed' | specific case name e.g. 'accusative'
)
RETURNS TABLE (
  word_form_id     uuid,
  sentence_czech   text,
  sentence_english text,
  target_form      text,   -- the inflected form (bold in Easy, answer in Hard)
  base_form        text,   -- nominative shown as hint in Hard
  correct_case     text,   -- for Easy answer checking
  explanation      text    -- shown after answer
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  WITH
  -- ARS priority for all words this user has practiced in this mode + scope
  practiced AS (
    SELECT
      uwp.word_form_id,
      ft.name AS case_name,
      1 - (
        (uwp.correct::float / GREATEST(uwp.correct + uwp.incorrect, 1))
        * exp(
            -EXTRACT(EPOCH FROM (now() - uwp.last_practiced_at)) / 86400.0
            / (GREATEST(uwp.correct, 1) * 3.0)
          )
      ) AS priority
    FROM user_word_progress uwp
    JOIN word_forms wf ON uwp.word_form_id = wf.id
    JOIN form_types ft ON wf.form_type_id = ft.id
    WHERE uwp.profile_id = v_user_id
      AND uwp.mode = p_mode
      AND ft.category = 'case'
      AND (p_scope = 'mixed' OR ft.name = p_scope)
      -- Hard mode only surfaces words seen at least once in Easy
      AND (p_mode = 'easy' OR EXISTS (
        SELECT 1 FROM user_word_progress e
        WHERE e.profile_id = v_user_id
          AND e.word_form_id = uwp.word_form_id
          AND e.mode = 'easy' AND e.correct >= 1
      ))
  ),
  -- Words not yet practiced in this mode (new candidates)
  new_candidates AS (
    SELECT
      wf.id AS word_form_id,
      ft.name AS case_name,
      0.5 AS priority
    FROM word_forms wf
    JOIN root_words rw ON wf.root_word_id = rw.id
    JOIN form_types ft ON wf.form_type_id = ft.id
    WHERE ft.category = 'case'
      AND (p_scope = 'mixed' OR ft.name = p_scope)
      AND NOT EXISTS (
        SELECT 1 FROM user_word_progress uwp
        WHERE uwp.profile_id = v_user_id
          AND uwp.word_form_id = wf.id
          AND uwp.mode = p_mode
      )
      AND (p_mode = 'easy' OR EXISTS (
        SELECT 1 FROM user_word_progress e
        WHERE e.profile_id = v_user_id
          AND e.word_form_id = wf.id
          AND e.mode = 'easy' AND e.correct >= 1
      ))
    ORDER BY rw.frequency_rank ASC NULLS LAST
    LIMIT 2
  ),
  -- Fill slots: 4 struggling, 4 reinforcing, 2 new
  selected AS (
    SELECT word_form_id FROM practiced WHERE priority > 0.6  ORDER BY priority DESC LIMIT 4
    UNION ALL
    SELECT word_form_id FROM practiced WHERE priority BETWEEN 0.3 AND 0.6 ORDER BY priority DESC LIMIT 4
    UNION ALL
    SELECT word_form_id FROM new_candidates
    LIMIT 10
  )
  -- Fetch card data for each selected word
  SELECT
    wf.id,
    es.czech_sentence,
    es.english_sentence,
    wf.form_czech,
    rw.in_czech,
    ft.name,
    es.explanation
  FROM selected s
  JOIN word_forms wf ON s.word_form_id = wf.id
  JOIN root_words rw ON wf.root_word_id = rw.id
  JOIN form_types ft ON wf.form_type_id = ft.id
  -- Pick one example sentence per word (prefer primary)
  JOIN LATERAL (
    SELECT czech_sentence, english_sentence, explanation
    FROM example_sentences
    WHERE word_form_id = wf.id
    ORDER BY id
    LIMIT 1
  ) es ON true
  ORDER BY random();
END;
$$;
```

---

#### 2c. `get_practice_progress`

Called on the progress screen. Returns per-case skill scores and weekly gains in one query.

```sql
CREATE OR REPLACE FUNCTION get_practice_progress()
RETURNS TABLE (
  case_name          text,
  case_understanding numeric,   -- Easy all-time accuracy (0–1), null if not started
  form_recall        numeric,   -- Hard all-time accuracy (0–1), null if not started
  cu_gain_week       numeric,   -- Easy: this week accuracy minus last week
  fr_gain_week       numeric,   -- Hard: this week accuracy minus last week
  known_count        bigint
)
LANGUAGE sql
SECURITY INVOKER
AS $$
  WITH all_time AS (
    SELECT
      ft.name AS case_name,
      uwp.mode,
      SUM(uwp.correct)::numeric / NULLIF(SUM(uwp.correct + uwp.incorrect), 0) AS accuracy
    FROM user_word_progress uwp
    JOIN word_forms wf ON uwp.word_form_id = wf.id
    JOIN form_types ft ON wf.form_type_id = ft.id
    WHERE uwp.profile_id = auth.uid()
      AND ft.category = 'case'
    GROUP BY ft.name, uwp.mode
  ),
  this_week AS (
    SELECT ft.name AS case_name, pa.mode,
      AVG(pa.was_correct::int) AS accuracy
    FROM practice_attempts pa
    JOIN word_forms wf ON pa.word_form_id = wf.id
    JOIN form_types ft ON wf.form_type_id = ft.id
    WHERE pa.profile_id = auth.uid()
      AND ft.category = 'case'
      AND pa.created_at >= now() - interval '7 days'
    GROUP BY ft.name, pa.mode
  ),
  last_week AS (
    SELECT ft.name AS case_name, pa.mode,
      AVG(pa.was_correct::int) AS accuracy
    FROM practice_attempts pa
    JOIN word_forms wf ON pa.word_form_id = wf.id
    JOIN form_types ft ON wf.form_type_id = ft.id
    WHERE pa.profile_id = auth.uid()
      AND ft.category = 'case'
      AND pa.created_at BETWEEN now() - interval '14 days' AND now() - interval '7 days'
    GROUP BY ft.name, pa.mode
  ),
  known AS (
    -- Count distinct root_words with at least one known case form per case
    SELECT ft.name AS case_name, COUNT(DISTINCT rw.id) AS known_count
    FROM word_forms wf
    JOIN root_words rw ON wf.root_word_id = rw.id
    JOIN form_types ft ON wf.form_type_id = ft.id
    WHERE ft.category = 'case'
      AND EXISTS (
        SELECT 1 FROM user_word_progress
        WHERE profile_id = auth.uid() AND word_form_id = wf.id AND mode = 'easy' AND correct >= 5
      )
      AND EXISTS (
        SELECT 1 FROM user_word_progress
        WHERE profile_id = auth.uid() AND word_form_id = wf.id AND mode = 'hard' AND correct >= 5
      )
    GROUP BY ft.name
  )
  SELECT
    COALESCE(e.case_name, h.case_name) AS case_name,
    e.accuracy  AS case_understanding,
    h.accuracy  AS form_recall,
    tw_e.accuracy - lw_e.accuracy AS cu_gain_week,
    tw_h.accuracy - lw_h.accuracy AS fr_gain_week,
    COALESCE(k.known_count, 0)    AS known_count
  FROM all_time e
  FULL OUTER JOIN all_time h        ON e.case_name = h.case_name AND h.mode = 'hard'
  LEFT JOIN this_week tw_e          ON tw_e.case_name = e.case_name AND tw_e.mode = 'easy'
  LEFT JOIN last_week lw_e          ON lw_e.case_name = e.case_name AND lw_e.mode = 'easy'
  LEFT JOIN this_week tw_h          ON tw_h.case_name = e.case_name AND tw_h.mode = 'hard'
  LEFT JOIN last_week lw_h          ON lw_h.case_name = e.case_name AND lw_h.mode = 'hard'
  LEFT JOIN known k                 ON k.case_name = e.case_name
  WHERE e.mode = 'easy';
$$;
```

---

#### 2d. `get_known_words`

Returns one row per root word. Each row includes which cases are known and which have been practiced but not yet mastered — so the frontend can render case badges without a second query.

```sql
CREATE OR REPLACE FUNCTION get_known_words()
RETURNS TABLE (
  root_word_id    uuid,
  in_czech        text,
  in_english      text,
  known_cases     text[],   -- cases where easy >= 5 AND hard >= 5
  partial_cases   text[],   -- cases practiced but not yet known
  last_practiced  timestamptz,
  is_dusty        boolean
)
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT
    rw.id,
    rw.in_czech,
    rw.in_english,
    ARRAY_AGG(DISTINCT ft.name) FILTER (
      WHERE e.correct >= 5 AND h.correct >= 5
    ) AS known_cases,
    ARRAY_AGG(DISTINCT ft.name) FILTER (
      WHERE (e.correct IS NOT NULL OR h.correct IS NOT NULL)
        AND NOT (e.correct >= 5 AND h.correct >= 5)
    ) AS partial_cases,
    MAX(GREATEST(
      COALESCE(e.last_practiced_at, '1970-01-01'),
      COALESCE(h.last_practiced_at, '1970-01-01')
    )) AS last_practiced,
    MAX(GREATEST(
      COALESCE(e.last_practiced_at, '1970-01-01'),
      COALESCE(h.last_practiced_at, '1970-01-01')
    )) < now() - interval '90 days' AS is_dusty
  FROM root_words rw
  JOIN word_forms wf ON wf.root_word_id = rw.id
  JOIN form_types ft ON wf.form_type_id = ft.id
  LEFT JOIN user_word_progress e
    ON e.word_form_id = wf.id AND e.profile_id = auth.uid() AND e.mode = 'easy'
  LEFT JOIN user_word_progress h
    ON h.word_form_id = wf.id AND h.profile_id = auth.uid() AND h.mode = 'hard'
  WHERE ft.category = 'case'
  GROUP BY rw.id, rw.in_czech, rw.in_english
  HAVING BOOL_OR(e.correct >= 5 AND h.correct >= 5)  -- at least one fully known case
  ORDER BY rw.in_czech;
$$;
```

---

#### 2e. `build_dusty_session`

Same structure as `build_practice_session` but filtered to known + not practiced in 90 days. Mode is mixed Easy/Hard — the session alternates to refresh both skills.

```sql
CREATE OR REPLACE FUNCTION build_dusty_session()
RETURNS TABLE (
  word_form_id     uuid,
  mode             text,
  sentence_czech   text,
  sentence_english text,
  target_form      text,
  base_form        text,
  correct_case     text,
  explanation      text
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  WITH dusty AS (
    SELECT wf.id AS word_form_id
    FROM word_forms wf
    JOIN form_types ft ON wf.form_type_id = ft.id
    JOIN user_word_progress e ON e.word_form_id = wf.id AND e.profile_id = auth.uid() AND e.mode = 'easy'
    JOIN user_word_progress h ON h.word_form_id = wf.id AND h.profile_id = auth.uid() AND h.mode = 'hard'
    WHERE ft.category = 'case'
      AND e.correct >= 5 AND h.correct >= 5
      AND GREATEST(e.last_practiced_at, h.last_practiced_at) < now() - interval '90 days'
    ORDER BY GREATEST(e.last_practiced_at, h.last_practiced_at) ASC  -- oldest first
    LIMIT 5  -- 5 words × 2 modes = 10 cards
  )
  SELECT
    wf.id, 'm' AS mode,  -- placeholder; app alternates easy/hard per word
    es.czech_sentence, es.english_sentence,
    wf.form_czech, rw.in_czech, ft.name, es.explanation
  FROM dusty d
  JOIN word_forms wf ON d.word_form_id = wf.id
  JOIN root_words rw ON wf.root_word_id = rw.id
  JOIN form_types ft ON wf.form_type_id = ft.id
  JOIN LATERAL (
    SELECT czech_sentence, english_sentence, explanation
    FROM example_sentences WHERE word_form_id = wf.id ORDER BY id LIMIT 1
  ) es ON true;
END;
$$;
```

---

### Step 3 — Frontend

#### Feature 1: Practice Quiz Module

**Session setup screen**

- Two toggles: Mode (Easy / Hard), Scope (Mixed / pick a case)
- Scope picker only shows cases the user has at least one practiced word in
- "Start" calls `supabase.rpc('build_practice_session', { p_mode, p_scope })` and navigates to the session screen with the 10 cards in state

**Session screen**

- Progress bar: `3 / 10`
- Renders current card based on mode:
  - **Easy card** — sentence with target word in bold; 7 case-name buttons (Nominative through Instrumental). Tapping a button submits immediately.
  - **Hard card** — sentence with blank; base form shown as hint below; text input with submit button. Accept answer if it matches `target_form` (case-insensitive, trimmed). Consider accepting diacritic-stripped versions as "close but wrong" with a gentle correction rather than a hard fail — decision TBD.
- After each answer: inline feedback panel slides up showing correct/incorrect + `explanation` text from the DB. "Next" button advances.
- On submit, call `supabase.rpc('record_practice_answer', { p_word_form_id, p_mode, p_was_correct })`. Response may contain achievement flags — queue any toasts.

**Session complete screen**

- Score: `X / 10 correct`
- List of words answered incorrectly (if any)
- Any achievements earned during this session displayed prominently
- "Practice Again" and "Back to Progress" buttons

---

#### Feature 2: Progress Screen

Calls `supabase.rpc('get_practice_progress')` on mount.

Displays per active case:

- Case name (e.g., "Accusative")
- **Case Understanding**: progress bar + percentage + weekly gain chip (`+5%` in green, `−2%` in red, `—` if no prior week data)
- **Form Recall**: same structure
- **Known words**: count badge
- Level label derived client-side from `known_count`:

```typescript
function getLevel(knownCount: number): string {
  if (knownCount >= 15) return 'Fluent';
  if (knownCount >= 5) return 'Proficient';
  if (knownCount >= 1) return 'Familiar';
  return 'Beginner';
}
```

If all active cases are at Fluent or Proficient, show a prompt: "You're strong in all active cases. Ready to start [next case]?"

---

#### Feature 3: Known Words Screen

Calls `supabase.rpc('get_known_words')` on mount. One row per root word.

Each entry shows:

- Root word in Czech (nominative) + English translation
- Case badges: known cases in one colour, partially practiced in another

```
pes  (dog)    [Accusative ✓] [Locative ✓] [Dative ···]
žena (woman)  [Accusative ✓]
```

`known_cases` → filled badge. `partial_cases` → muted/outlined badge. Cases never touched don't appear.

- "Dusty" badge if `is_dusty = true`
- Tapping navigates to that word's dictionary entry

If any dusty words exist, a banner at the top: "You have X dusty words. Practice them?" — taps into the Dusty Words quiz.

---

#### Feature 4: Dusty Words Quiz

Calls `supabase.rpc('build_dusty_session')`. Returns up to 10 cards (5 words × Easy + Hard). Uses the same session screen component as the regular quiz. Each card submission goes through the same `record_practice_answer` RPC.

---

#### Achievement Toasts

`record_practice_answer` returns a `jsonb` response. After each answer the frontend checks:

```typescript
const result = await supabase.rpc('record_practice_answer', { ... })

if (result.data.word_became_known) {
  toast(`"${word}" is now a Known Word in ${caseName}!`)
}

if (result.data.level_up) {
  const { case: c, level } = result.data.level_up
  toast(`${capitalize(c)}: ${level}`)  // e.g. "Accusative: Familiar"
}
```

Toasts are queued and shown after the answer feedback panel — never interrupt the card flow. They appear on the session complete screen if they occurred during the session, or inline between cards if preferred.
