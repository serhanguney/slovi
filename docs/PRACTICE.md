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

### Case Understanding Mode

The full sentence is shown with the word in **bold**. The user identifies which grammatical case the bold word is in.

Example:

> "Viděl jsem velkého **psa**."
> → [Nominative, Accusative, Genitive, Dative, Locative, Instrumental]

This tests _understanding_: does the user know why this case is used?

### Form Recall Mode

The sentence has a blank. The base form (nominative) is shown as a hint. The user types the correct declined form.

Example:

> "Vidím \_\_\_." [pes]
> → user types: psa

This tests _recall_: can the user produce the correct form?

### Simple Vocabulary Mode

The English translation is shown. The user picks the correct Czech nominative form from 4 options.

Example:

> "dog"
> → [pes] [kočka] [dům] [stůl]

This tests basic word recognition — no grammar required. Tracks the nominative `word_form_id` for each root word. No prerequisite mode. No scope selector (vocabulary is inherently cross-case).

---

## Skill Measurement

All practice modes test different skills and are tracked separately. They are **never collapsed into a single score**.

### Skill Scores (per case, shown as %)

```
Case Understanding = sum(correct) / sum(correct + incorrect)  -- mode = 'case_understanding'
Form Recall        = sum(correct) / sum(correct + incorrect)  -- mode = 'form_recall'
```

These are honest accuracy percentages. Not points, not levels — just how often the user gets it right.

The gap between them is meaningful: high Case Understanding + low Form Recall means the user grasps the grammar but is still building muscle memory on the forms.

### Known Words

A root word is **Known** when:

```
SUM(correct) >= 10  -- across all word_forms of the root word, across all modes
```

No per-mode or per-case requirement. Any combination of practice activity that totals 10 correct answers makes a word Known. A user who only drills `simple_vocabulary` and `case_understanding` will reach this threshold without ever touching `form_recall`.

### Levels (global, based on total known word count)

Levels reflect overall vocabulary depth across the whole app — not per case. Accuracy percentages remain the honest per-case performance metric; levels are global earned milestones.

| Level      | Total known words |
| ---------- | ----------------- |
| Beginner   | 0                 |
| Familiar   | 5                 |
| Proficient | 20                |
| Fluent     | 50                |

Level-up toasts fire when total `known_count` crosses a threshold. This means levels take sustained effort to earn (weeks, not the first session).

### Dusty Words Quiz

A separate quiz type surfaces words where:

```
known = true AND last_practiced_at < now - 90 days
```

This is a suggestion, never forced. The app does not demote or reset known words based on time. It simply offers to refresh them.

---

## Adaptive Retention Algorithm (ARS)

### Priority Score

Calculated independently per mode per `(word_form_id)`:

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

**Form Recall eligibility:** a word only appears in Form Recall sessions once it has `case_understanding correct >= 1`. The user should recognise the case before being asked to produce the form. The first Form Recall session for a case therefore draws from the existing Case Understanding pool, ordered by Case Understanding accuracy descending (words you understood best go first).

**Practice box (pinned words):** words the user explicitly queued from the dictionary bypass normal slot ordering. Up to 2 pinned words are guaranteed a slot per session:

- **Pinned + never practiced** in the active mode → take the 2 new slots ahead of frequency-ranked candidates.
- **Pinned + already practiced** → priority overridden to `1.0`, guaranteed into the struggling bucket.

Pins are consumed on the user's first answer to that word (any mode, any answer). If more than 2 words are pinned they trickle in 2 per session, oldest first.

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

> **⚠️ Migration required**: the live table is missing `word_form_id`. Run before deploying RPC functions:
>
> ```sql
> ALTER TABLE user_word_progress ADD COLUMN word_form_id bigint REFERENCES word_forms (id) ON DELETE CASCADE;
> ALTER TABLE user_word_progress DROP CONSTRAINT user_word_progress_pkey;
> ALTER TABLE user_word_progress ADD PRIMARY KEY (profile_id, word_form_id, mode);
> ```

```sql
user_word_progress (
  profile_id        text REFERENCES profiles (profile_id),
  word_form_id      bigint REFERENCES word_forms (id),
  mode              practice_mode,  -- 'case_understanding' | 'form_recall' | 'simple_vocabulary'
  correct           int          DEFAULT 0,
  incorrect         int          DEFAULT 0,
  last_practiced_at timestamptz,

  PRIMARY KEY (profile_id, word_form_id, mode)
)
```

Normalizing mode into the primary key (instead of flat columns per mode) keeps the schema extensible — new modes are new rows, not new columns. Replaces the SM-2 fields previously proposed in PLANNING.md.

**`practice_attempts`** — one row per card answered, source of truth for all gains calculations:

```sql
practice_attempts (
  id              bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  profile_id      text REFERENCES profiles (profile_id),
  word_form_id    bigint REFERENCES word_forms (id),
  mode            practice_mode,  -- 'case_understanding' | 'form_recall' | 'simple_vocabulary'
  is_correct      boolean,
  created_at      timestamptz DEFAULT now()
)
```

`user_word_progress` is always updated in the same transaction as inserting a `practice_attempts` row, keeping them in sync.

### Gains Tracking

Weekly and monthly gains are calculated directly from `practice_attempts` — no separate snapshot table needed.

```sql
-- Case Understanding gain: this week vs last week (accusative, example)
SELECT
  AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END) AS accuracy,
  'this_week' AS period
FROM practice_attempts pa
JOIN word_forms wf ON pa.word_form_id = wf.id
JOIN word_form_types ft ON wf.form_type_id = ft.id
WHERE pa.profile_id = $1
  AND pa.mode = 'case_understanding'
  AND ft.name = 'accusative'
  AND pa.created_at >= now() - interval '7 days'

UNION ALL

SELECT
  AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END),
  'last_week'
FROM practice_attempts pa
JOIN word_forms wf ON pa.word_form_id = wf.id
JOIN word_form_types ft ON wf.form_type_id = ft.id
WHERE pa.profile_id = $1
  AND pa.mode = 'case_understanding'
  AND ft.name = 'accusative'
  AND pa.created_at BETWEEN now() - interval '14 days' AND now() - interval '7 days';
```

Gain = `this_week.accuracy − last_week.accuracy`. Shown as `+5%` or `−3%` next to the skill score.

For monthly gains, replace the intervals with `30 days` and `60 days`.

If the user has no data for the comparison period (e.g., they only started this week), the gain is shown as `—` rather than 0.

## Session UX

Two axes determine every session:

**Axis 1 — Mode (chosen before starting):**

- **Case Understanding** — 10 unique words, all case identification
- **Form Recall** — 10 unique words, all form recall
- **Simple Vocabulary** — 10 unique words, 4-option multiple choice. Available immediately, no prerequisites. No scope axis — vocabulary is cross-case by nature.

**Axis 2 — Scope (Case Understanding and Form Recall only):**

- **Mixed** — algorithm picks across all active cases
- **Case-focused** — user filters to one case; all 10 words are from that case

A case appears in the scope picker once the user has at least one practiced word in it. Scope is hidden when Simple Vocabulary is selected.

### Cross-Case Weighting in Mixed Sessions

When scope is Mixed, the algorithm doesn't divide slots evenly across cases. It weights by **deficiency** — how much room for improvement remains per case in the chosen mode.

```
deficiency(case) = 1 - accuracy(case, mode)
weight(case)     = deficiency(case) / sum(all deficiencies)
slots(case)      = round(weight(case) * 10)
```

Example with three active cases, Case Understanding mode:

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

**`user_word_progress` schema** — Normalized to one row per `(profile_id, word_form_id, mode)`. Mode is a `practice_mode` enum (`'case_understanding'`, `'form_recall'`, `'simple_vocabulary'`). New modes require an enum migration but no column additions. The live DB table was created without `word_form_id` — see migration note in Step 1b.

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

> **⚠️ Already created in live DB but missing `word_form_id`.** Run this migration:

```sql
ALTER TABLE user_word_progress ADD COLUMN word_form_id bigint REFERENCES word_forms (id) ON DELETE CASCADE;
ALTER TABLE user_word_progress DROP CONSTRAINT user_word_progress_pkey;
ALTER TABLE user_word_progress ADD PRIMARY KEY (profile_id, word_form_id, mode);

CREATE INDEX idx_uwp_profile_mode ON user_word_progress (profile_id, mode);
```

The full intended schema:

```sql
CREATE TABLE user_word_progress (
  profile_id        text        NOT NULL REFERENCES profiles (profile_id) ON DELETE CASCADE,
  word_form_id      bigint      NOT NULL REFERENCES word_forms (id) ON DELETE CASCADE,
  mode              practice_mode NOT NULL,
  correct           int         NOT NULL DEFAULT 0,
  incorrect         int         NOT NULL DEFAULT 0,
  last_practiced_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (profile_id, word_form_id, mode)
);
```

#### 1c. `practice_attempts` — already created, matches live schema ✓

```sql
-- Already exists. Verify columns:
-- id, profile_id, word_form_id, mode (practice_mode enum), is_correct, created_at

CREATE INDEX idx_pa_profile_created ON practice_attempts (profile_id, created_at DESC);
CREATE INDEX idx_pa_profile_mode_created ON practice_attempts (profile_id, mode, created_at DESC);
```

#### 1d. `practice_box` — already created, matches live schema ✓

```sql
-- Already exists. Columns: id, profile_id, root_word_id, created_at

CREATE INDEX idx_practice_box_profile ON practice_box (profile_id, created_at ASC);
```

---

### Step 2 — RPC Functions

#### 2a. `record_practice_answer`

Called after every card answer. Writes both tables atomically and returns achievement flags so the frontend can show toasts without a second request.

```sql
CREATE OR REPLACE FUNCTION record_practice_answer(
  p_word_form_id bigint,
  p_mode         practice_mode,
  p_is_correct   boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id           text := auth.uid()::text;
  v_total_correct     int;
  v_word_became_known boolean := false;
  v_level_up          jsonb := null;
  v_old_known_count   int;
  v_new_known_count   int;
BEGIN
  -- 1. Insert attempt
  INSERT INTO practice_attempts (profile_id, word_form_id, mode, is_correct)
  VALUES (v_user_id, p_word_form_id, p_mode, p_is_correct);

  -- 2. Upsert progress
  INSERT INTO user_word_progress (profile_id, word_form_id, mode, correct, incorrect, last_practiced_at)
  VALUES (
    v_user_id, p_word_form_id, p_mode,
    CASE WHEN p_is_correct THEN 1 ELSE 0 END,
    CASE WHEN p_is_correct THEN 0 ELSE 1 END,
    now()
  )
  ON CONFLICT (profile_id, word_form_id, mode) DO UPDATE SET
    correct           = user_word_progress.correct   + CASE WHEN p_is_correct THEN 1 ELSE 0 END,
    incorrect         = user_word_progress.incorrect + CASE WHEN p_is_correct THEN 0 ELSE 1 END,
    last_practiced_at = now();

  -- 3. Consume practice box pin (remove on first answer, regardless of correctness)
  DELETE FROM practice_box
  WHERE profile_id = v_user_id
    AND root_word_id = (SELECT root_word_id FROM word_forms WHERE id = p_word_form_id);

  -- 5. Check: did this root word just reach SUM(correct) >= 10 across all forms and modes?
  IF p_is_correct THEN
    SELECT SUM(uwp.correct) INTO v_total_correct
    FROM user_word_progress uwp
    JOIN word_forms wf ON uwp.word_form_id = wf.id
    WHERE uwp.profile_id = v_user_id
      AND wf.root_word_id = (SELECT root_word_id FROM word_forms WHERE id = p_word_form_id);

    -- Became known if this correct answer pushed it over the threshold
    v_word_became_known := v_total_correct >= 10 AND (v_total_correct - 1) < 10;
  END IF;

  -- 6. Check: did total known words cross a global level threshold? (5 / 20 / 50)
  IF v_word_became_known THEN
    -- Global known count before this answer
    SELECT COUNT(*) - 1 INTO v_old_known_count
    FROM (
      SELECT wf.root_word_id
      FROM user_word_progress uwp
      JOIN word_forms wf ON uwp.word_form_id = wf.id
      WHERE uwp.profile_id = v_user_id
      GROUP BY wf.root_word_id
      HAVING SUM(uwp.correct) >= 10
    ) known_words;

    v_new_known_count := v_old_known_count + 1;

    -- Level thresholds: 5 (Familiar), 20 (Proficient), 50 (Fluent)
    IF (v_old_known_count < 5  AND v_new_known_count >= 5)  OR
       (v_old_known_count < 20 AND v_new_known_count >= 20) OR
       (v_old_known_count < 50 AND v_new_known_count >= 50) THEN
      v_level_up := jsonb_build_object(
        'known_count', v_new_known_count,
        'level', CASE
          WHEN v_new_known_count >= 50 THEN 'Fluent'
          WHEN v_new_known_count >= 20 THEN 'Proficient'
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
  p_mode  practice_mode,  -- 'case_understanding' | 'form_recall'
  p_scope text            -- 'mixed' | specific case name e.g. 'accusative'
)
RETURNS TABLE (
  word_form_id     bigint,
  sentence_czech   text,
  sentence_english text,
  target_form      text,   -- the inflected form (bold in Case Understanding, answer in Form Recall)
  base_form        text,   -- nominative shown as hint in Form Recall and Simple Vocabulary
  correct_case     text,   -- for Case Understanding answer checking
  explanation      text    -- shown after answer
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id text := auth.uid()::text;
BEGIN
  RETURN QUERY
  WITH
  -- Pinned words not yet practiced: take the new slots ahead of frequency-ranked candidates
  pinned_new AS (
    SELECT wf.id AS word_form_id
    FROM practice_box pb
    JOIN word_forms wf ON wf.root_word_id = pb.root_word_id
    JOIN word_form_types ft ON wf.form_type_id = ft.id
    WHERE pb.profile_id = v_user_id
      AND ft.category = 'case'
      AND (p_scope = 'mixed' OR ft.name = p_scope)
      AND NOT EXISTS (
        SELECT 1 FROM user_word_progress uwp
        WHERE uwp.profile_id = v_user_id
          AND uwp.word_form_id = wf.id
          AND uwp.mode = p_mode
      )
    ORDER BY pb.created_at ASC
    LIMIT 2
  ),
  -- ARS priority for all words this user has practiced in this mode + scope
  -- Pinned words that have already been practiced get priority 1.0 (guaranteed struggling slot)
  practiced AS (
    SELECT
      uwp.word_form_id,
      ft.name AS case_name,
      CASE WHEN pb.root_word_id IS NOT NULL THEN 1.0
           ELSE 1 - (
             (uwp.correct::float / GREATEST(uwp.correct + uwp.incorrect, 1))
             * exp(
                 -EXTRACT(EPOCH FROM (now() - uwp.last_practiced_at)) / 86400.0
                 / (GREATEST(uwp.correct, 1) * 3.0)
               )
           )
      END AS priority
    FROM user_word_progress uwp
    JOIN word_forms wf ON uwp.word_form_id = wf.id
    JOIN word_form_types ft ON wf.form_type_id = ft.id
    LEFT JOIN practice_box pb ON pb.root_word_id = wf.root_word_id AND pb.profile_id = v_user_id
    WHERE uwp.profile_id = v_user_id
      AND uwp.mode = p_mode
      AND ft.category = 'case'
      AND (p_scope = 'mixed' OR ft.name = p_scope)
      -- Form Recall only surfaces words seen at least once in Case Understanding
      AND (p_mode = 'case_understanding' OR EXISTS (
        SELECT 1 FROM user_word_progress e
        WHERE e.profile_id = v_user_id
          AND e.word_form_id = uwp.word_form_id
          AND e.mode = 'case_understanding' AND e.correct >= 1
      ))
  ),
  -- Words not yet practiced in this mode (new candidates, excluding pinned_new)
  new_candidates AS (
    SELECT
      wf.id AS word_form_id,
      ft.name AS case_name,
      0.5 AS priority
    FROM word_forms wf
    JOIN root_words rw ON wf.root_word_id = rw.id
    JOIN word_form_types ft ON wf.form_type_id = ft.id
    WHERE ft.category = 'case'
      AND (p_scope = 'mixed' OR ft.name = p_scope)
      AND NOT EXISTS (
        SELECT 1 FROM user_word_progress uwp
        WHERE uwp.profile_id = v_user_id
          AND uwp.word_form_id = wf.id
          AND uwp.mode = p_mode
      )
      AND wf.id NOT IN (SELECT word_form_id FROM pinned_new)
      AND (p_mode != 'form_recall' OR EXISTS (
        SELECT 1 FROM user_word_progress e
        WHERE e.profile_id = v_user_id
          AND e.word_form_id = wf.id
          AND e.mode = 'case_understanding' AND e.correct >= 1
      ))
    ORDER BY rw.frequency_rank ASC NULLS LAST
    LIMIT 2
  ),
  -- Fill slots: pinned new first, then 4 struggling, 4 reinforcing, remaining new
  selected AS (
    SELECT word_form_id FROM pinned_new
    UNION ALL
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
    wf.form_in_czech,
    rw.in_czech,
    ft.name,
    es.explanation
  FROM selected s
  JOIN word_forms wf ON s.word_form_id = wf.id
  JOIN root_words rw ON wf.root_word_id = rw.id
  JOIN word_form_types ft ON wf.form_type_id = ft.id
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

#### 2c. `build_vocabulary_session`

Vocabulary uses a separate function because its return type is fundamentally different — it needs distractors, not sentences. Uses the same ARS priority formula and slot structure as `build_practice_session`.

```sql
CREATE OR REPLACE FUNCTION build_vocabulary_session()
RETURNS TABLE (
  word_form_id    bigint,
  in_english      text,    -- prompt shown to user
  correct_czech   text,    -- correct nominative form
  distractors     text[]   -- 3 wrong Czech nominative forms from same frequency band
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id text := auth.uid()::text;
BEGIN
  RETURN QUERY
  WITH
  pinned_new AS (
    SELECT wf.id AS word_form_id
    FROM practice_box pb
    JOIN word_forms wf ON wf.root_word_id = pb.root_word_id
    JOIN word_form_types ft ON wf.form_type_id = ft.id
    WHERE pb.profile_id = v_user_id
      AND ft.name = 'nominative'
      AND NOT EXISTS (
        SELECT 1 FROM user_word_progress uwp
        WHERE uwp.profile_id = v_user_id
          AND uwp.word_form_id = wf.id
          AND uwp.mode = 'simple_vocabulary'
      )
    ORDER BY pb.created_at ASC
    LIMIT 2
  ),
  practiced AS (
    SELECT
      uwp.word_form_id,
      CASE WHEN pb.root_word_id IS NOT NULL THEN 1.0
           ELSE 1 - (
             (uwp.correct::float / GREATEST(uwp.correct + uwp.incorrect, 1))
             * exp(
                 -EXTRACT(EPOCH FROM (now() - uwp.last_practiced_at)) / 86400.0
                 / (GREATEST(uwp.correct, 1) * 3.0)
               )
           )
      END AS priority
    FROM user_word_progress uwp
    JOIN word_forms wf ON uwp.word_form_id = wf.id
    JOIN word_form_types ft ON wf.form_type_id = ft.id
    LEFT JOIN practice_box pb ON pb.root_word_id = wf.root_word_id AND pb.profile_id = v_user_id
    WHERE uwp.profile_id = v_user_id
      AND uwp.mode = 'simple_vocabulary'
      AND ft.name = 'nominative'
  ),
  new_candidates AS (
    SELECT wf.id AS word_form_id, 0.5 AS priority
    FROM word_forms wf
    JOIN root_words rw ON wf.root_word_id = rw.id
    JOIN word_form_types ft ON wf.form_type_id = ft.id
    WHERE ft.name = 'nominative'
      AND NOT EXISTS (
        SELECT 1 FROM user_word_progress uwp
        WHERE uwp.profile_id = v_user_id
          AND uwp.word_form_id = wf.id
          AND uwp.mode = 'simple_vocabulary'
      )
      AND wf.id NOT IN (SELECT word_form_id FROM pinned_new)
    ORDER BY rw.frequency_rank ASC NULLS LAST
    LIMIT 2
  ),
  selected AS (
    SELECT word_form_id FROM pinned_new
    UNION ALL
    SELECT word_form_id FROM practiced WHERE priority > 0.6  ORDER BY priority DESC LIMIT 4
    UNION ALL
    SELECT word_form_id FROM practiced WHERE priority BETWEEN 0.3 AND 0.6 ORDER BY priority DESC LIMIT 4
    UNION ALL
    SELECT word_form_id FROM new_candidates
    LIMIT 10
  )
  SELECT
    wf.id,
    rw.in_english,
    rw.in_czech,
    -- 3 distractors from nearby frequency band; fallback to random if band is sparse
    COALESCE(
      NULLIF(ARRAY(
        SELECT d.in_czech FROM root_words d
        WHERE d.id != rw.id
          AND d.frequency_rank BETWEEN rw.frequency_rank - 50 AND rw.frequency_rank + 50
        ORDER BY random() LIMIT 3
      ), '{}'),
      ARRAY(SELECT d.in_czech FROM root_words d WHERE d.id != rw.id ORDER BY random() LIMIT 3)
    ) AS distractors
  FROM selected s
  JOIN word_forms wf ON s.word_form_id = wf.id
  JOIN root_words rw ON wf.root_word_id = rw.id
  ORDER BY random();
END;
$$;
```

---

#### 2e. `get_practice_progress`

Called on the progress screen. Returns per-case skill scores and weekly gains in one query. Known word count is global and fetched separately via a simple aggregation on `user_word_progress`.

```sql
CREATE OR REPLACE FUNCTION get_practice_progress()
RETURNS TABLE (
  case_name          text,
  case_understanding numeric,   -- case_understanding all-time accuracy (0–1), null if not started
  form_recall        numeric,   -- form_recall all-time accuracy (0–1), null if not started
  cu_gain_week       numeric,   -- case_understanding: this week accuracy minus last week
  fr_gain_week       numeric    -- form_recall: this week accuracy minus last week
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
    JOIN word_form_types ft ON wf.form_type_id = ft.id
    WHERE uwp.profile_id = auth.uid()
      AND ft.category = 'case'
      AND uwp.mode IN ('case_understanding', 'form_recall')
    GROUP BY ft.name, uwp.mode
  ),
  this_week AS (
    SELECT ft.name AS case_name, pa.mode,
      AVG(pa.is_correct::int) AS accuracy
    FROM practice_attempts pa
    JOIN word_forms wf ON pa.word_form_id = wf.id
    JOIN word_form_types ft ON wf.form_type_id = ft.id
    WHERE pa.profile_id = auth.uid()
      AND ft.category = 'case'
      AND pa.mode IN ('case_understanding', 'form_recall')
      AND pa.created_at >= now() - interval '7 days'
    GROUP BY ft.name, pa.mode
  ),
  last_week AS (
    SELECT ft.name AS case_name, pa.mode,
      AVG(pa.is_correct::int) AS accuracy
    FROM practice_attempts pa
    JOIN word_forms wf ON pa.word_form_id = wf.id
    JOIN word_form_types ft ON wf.form_type_id = ft.id
    WHERE pa.profile_id = auth.uid()
      AND ft.category = 'case'
      AND pa.mode IN ('case_understanding', 'form_recall')
      AND pa.created_at BETWEEN now() - interval '14 days' AND now() - interval '7 days'
    GROUP BY ft.name, pa.mode
  )
  SELECT
    COALESCE(e.case_name, h.case_name) AS case_name,
    e.accuracy  AS case_understanding,
    h.accuracy  AS form_recall,
    tw_e.accuracy - lw_e.accuracy AS cu_gain_week,
    tw_h.accuracy - lw_h.accuracy AS fr_gain_week
  FROM all_time e
  FULL OUTER JOIN all_time h        ON e.case_name = h.case_name AND h.mode = 'form_recall'
  LEFT JOIN this_week tw_e          ON tw_e.case_name = e.case_name AND tw_e.mode = 'case_understanding'
  LEFT JOIN last_week lw_e          ON lw_e.case_name = e.case_name AND lw_e.mode = 'case_understanding'
  LEFT JOIN this_week tw_h          ON tw_h.case_name = e.case_name AND tw_h.mode = 'form_recall'
  LEFT JOIN last_week lw_h          ON lw_h.case_name = e.case_name AND lw_h.mode = 'form_recall'
  WHERE e.mode = 'case_understanding';
$$;
```

---

#### 2f. `get_known_words`

Returns one row per root word. Each row includes which cases are known and which have been practiced but not yet mastered — so the frontend can render case badges without a second query.

```sql
CREATE OR REPLACE FUNCTION get_known_words()
RETURNS TABLE (
  root_word_id    bigint,
  in_czech        text,
  in_english      text,
  known_cases     text[],   -- cases with >= 5 total correct answers for this word's forms
  partial_cases   text[],   -- cases with any practice but < 5 total correct
  last_practiced  timestamptz,
  is_dusty        boolean
)
LANGUAGE sql
SECURITY INVOKER
AS $$
  WITH word_case_totals AS (
    -- Per root_word per case: sum all correct answers across all modes
    SELECT
      rw.id                         AS root_word_id,
      ft.name                       AS case_name,
      COALESCE(SUM(uwp.correct), 0) AS total_correct,
      MAX(uwp.last_practiced_at)    AS last_practiced
    FROM root_words rw
    JOIN word_forms wf  ON wf.root_word_id = rw.id
    JOIN word_form_types ft  ON wf.form_type_id = ft.id
    LEFT JOIN user_word_progress uwp
      ON uwp.word_form_id = wf.id AND uwp.profile_id = auth.uid()
    WHERE ft.category = 'case'
    GROUP BY rw.id, ft.name
  )
  SELECT
    rw.id,
    rw.in_czech,
    rw.in_english,
    ARRAY_AGG(DISTINCT wct.case_name) FILTER (WHERE wct.total_correct >= 5)                           AS known_cases,
    ARRAY_AGG(DISTINCT wct.case_name) FILTER (WHERE wct.total_correct > 0 AND wct.total_correct < 5) AS partial_cases,
    MAX(wct.last_practiced)                                                                            AS last_practiced,
    MAX(wct.last_practiced) < now() - interval '90 days'                                              AS is_dusty
  FROM root_words rw
  JOIN word_case_totals wct ON wct.root_word_id = rw.id
  GROUP BY rw.id, rw.in_czech, rw.in_english
  HAVING SUM(wct.total_correct) >= 10   -- global known threshold
  ORDER BY rw.in_czech;
$$;
```

---

#### 2g. `build_dusty_session`

Same structure as `build_practice_session` but filtered to known + not practiced in 90 days. The session alternates Case Understanding and Form Recall per word to refresh both skills.

```sql
CREATE OR REPLACE FUNCTION build_dusty_session()
RETURNS TABLE (
  word_form_id     bigint,
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
  WITH known_roots AS (
    -- Root words where SUM(correct) >= 10 across all forms and modes
    SELECT wf.root_word_id, MAX(uwp.last_practiced_at) AS last_practiced
    FROM user_word_progress uwp
    JOIN word_forms wf ON uwp.word_form_id = wf.id
    WHERE uwp.profile_id = auth.uid()
    GROUP BY wf.root_word_id
    HAVING SUM(uwp.correct) >= 10
      AND MAX(uwp.last_practiced_at) < now() - interval '90 days'
  ),
  dusty AS (
    -- Pick one case form per known+dusty root word
    SELECT DISTINCT ON (wf.root_word_id) wf.id AS word_form_id
    FROM known_roots kr
    JOIN word_forms wf ON wf.root_word_id = kr.root_word_id
    JOIN word_form_types ft ON wf.form_type_id = ft.id
    WHERE ft.category = 'case'
    ORDER BY wf.root_word_id, kr.last_practiced ASC
    LIMIT 5  -- 5 words × 2 modes = 10 cards
  )
  SELECT
    wf.id, 'm' AS mode,  -- placeholder; app alternates case_understanding/form_recall per word
    es.czech_sentence, es.english_sentence,
    wf.form_in_czech, rw.in_czech, ft.name, es.explanation
  FROM dusty d
  JOIN word_forms wf ON d.word_form_id = wf.id
  JOIN root_words rw ON wf.root_word_id = rw.id
  JOIN word_form_types ft ON wf.form_type_id = ft.id
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

- Mode selector: Case Understanding / Form Recall / Simple Vocabulary
- Scope picker (Case Understanding and Form Recall only): Mixed / pick a case. Only shows cases the user has at least one practiced word in. Hidden when Simple Vocabulary is selected.
- Case Understanding / Form Recall: calls `supabase.rpc('build_practice_session', { p_mode, p_scope })`
- Simple Vocabulary: calls `supabase.rpc('build_vocabulary_session')`
- Navigates to the session screen with the 10 cards in state
- If pinned words exist, a small badge shows "X pinned" next to the Start button

**Session screen**

- Progress bar: `3 / 10`
- Renders current card based on mode:
  - **Case Understanding card** — sentence with target word in bold; 7 case-name buttons (Nominative through Instrumental). Tapping a button submits immediately.
  - **Form Recall card** — sentence with blank; base form shown as hint below; text input with submit button. Accept answer if it matches `target_form` (case-insensitive, trimmed). Consider accepting diacritic-stripped versions as "close but wrong" with a gentle correction rather than a hard fail — decision TBD.
  - **Simple Vocabulary card** — English word shown in large text; 4 Czech word buttons arranged in a 2×2 grid. Tapping a button submits immediately. No sentence, no text input, no diacritic toolbar.
- After each answer: inline feedback panel slides up showing correct/incorrect + `explanation` text from the DB. "Next" button advances.
- On submit, call `supabase.rpc('record_practice_answer', { p_word_form_id, p_mode, p_is_correct })`. Response may contain achievement flags — queue any toasts.

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
- Global level label and known word count shown once at the top of the screen (not per case), derived from a separate `get_known_count` call:

```typescript
function getLevel(knownCount: number): string {
  if (knownCount >= 50) return 'Fluent';
  if (knownCount >= 20) return 'Proficient';
  if (knownCount >= 5) return 'Familiar';
  return 'Beginner';
}
```

If all active cases have deficiency < 10% in both modes, show a prompt: "You're strong in all active cases. Ready to start [next case]?"

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

Calls `supabase.rpc('build_dusty_session')`. Returns up to 10 cards (5 words × Case Understanding + Form Recall). Uses the same session screen component as the regular quiz. Each card submission goes through the same `record_practice_answer` RPC.

---

#### Achievement Toasts

`record_practice_answer` returns a `jsonb` response. After each answer the frontend checks:

```typescript
const result = await supabase.rpc('record_practice_answer', { ... })

if (result.data.word_became_known) {
  toast(`"${word}" is now a Known Word in ${caseName}!`)
}

if (result.data.level_up) {
  const { level, known_count } = result.data.level_up
  toast(`${level}! You now know ${known_count} words.`)  // e.g. "Familiar! You now know 5 words."
}
```

Toasts are queued and shown after the answer feedback panel — never interrupt the card flow. They appear on the session complete screen if they occurred during the session, or inline between cards if preferred.

---

## UX Design Brief (for pencil.dev)

This section describes every screen, component, state, and interaction needed to design the practice module UI. It is self-contained — a designer or AI design tool can produce full mockups from this section alone.

---

### App Context

- Mobile-first. Design for 390 × 844 (iPhone 14). Web/tablet stretch-goals.
- The app is a Czech language learning tool. Tone: calm, focused, minimal — not gamified or noisy.
- Primary actions are always one tap. Cognitive load during a quiz must be as low as possible.
- Three accent colours are needed: one per mode (Case Understanding: softer/recognition tone; Form Recall: stronger/recall tone; Simple Vocabulary: neutral/vocabulary tone). Plus standard success/error/neutral states.

---

### Navigation Structure

```
Tab Bar (bottom):
  ├── Practice        → Session Setup Screen
  ├── Progress        → Progress Screen
  └── Words           → Known Words Screen

Practice tab flow:
  Session Setup
      └── Session Screen (10 cards)
              └── [after each card] Answer Feedback Panel (inline, slides up)
              └── Session Complete Screen
                      └── (optional) Achievement overlay

Words tab flow:
  Known Words Screen
      ├── [dusty banner tap] → Dusty Words Quiz (same Session Screen)
      └── [word tap] → Dictionary entry (existing screen, out of scope here)
```

---

### Screen 1 — Session Setup

**Purpose:** Let the user choose mode and scope before starting a 10-card session.

**Layout:** Single scrollable screen. Header + two option groups + CTA at bottom.

**Components:**

| Component          | Detail                                                                                                                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Screen title       | "Practice"                                                                                                                                                                                                              |
| Mode selector      | Segmented control: `Case Understanding` / `Form Recall` / `Simple Vocabulary`. Default: Case Understanding.                                                                                                             |
| Mode description   | Small body text below the selector. Case Understanding: "Identify the grammatical case." Form Recall: "Type the correct word form." Simple Vocabulary: "Pick the Czech word for the English prompt."                    |
| Scope selector     | Label "Focus on". Options: `Mixed` pill + one pill per case the user has practiced. Hidden entirely when Simple Vocabulary is selected. Cases never practiced are hidden. If user has no history, only `Mixed` appears. |
| Dusty words banner | Shown only when dusty words exist. Text: "You have {N} dusty words. Refresh them?" with a secondary CTA button.                                                                                                         |
| Pinned words badge | Small chip near the Start button. "{N} pinned" when practice box is non-empty. Hidden when empty.                                                                                                                       |
| Start button       | Full-width primary button. Label: "Start Session". Disabled when scope is empty (no words available for selection).                                                                                                     |

**States:**

- **First session ever:** Scope is only `Mixed`, no case pills. Mode is Case Understanding. Start button is active.
- **Form Recall, no eligible words:** Start button shows "No words available yet — practice Case Understanding first" and is disabled.
- **Loading (after tap):** Button shows spinner, label changes to "Building session…". Navigates to Session Screen once data arrives.

---

### Screen 2 — Session Screen

**Purpose:** Render and advance through 10 practice cards one at a time.

**Layout:** Full-screen. Top bar with progress + exit. Card in the centre. Input area at the bottom.

**Persistent top bar:**

| Element            | Detail                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Exit button        | Top-left. Icon: ×. Tapping shows a confirmation sheet: "Leave session? Your progress will be saved."          |
| Progress indicator | Centre. Text: `3 / 10`. Optional thin progress bar below the top bar (fills left to right).                   |
| Mode badge         | Top-right. Small pill: "Case Understanding", "Form Recall", or "Simple Vocabulary" in the mode accent colour. |

**Card area (centre):**

| Element                 | Detail                                                                                                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Case label              | Small muted text above sentence. e.g. "Accusative" (shown in case-focused scope; hidden in mixed).                                                                                              |
| Sentence                | Large readable text. Case Understanding: target word is **bold**. Form Recall: blank is rendered as a long underscore `____`. Simple Vocabulary: English word shown in large text, no sentence. |
| Hint (Form Recall only) | Below sentence, smaller muted text: `[pes]` — the nominative base form.                                                                                                                         |

**Input area (bottom, depends on mode):**

**Case Understanding input:**

- 6–7 case-name buttons arranged in a 2-column grid.
- Cases: Nominative, Accusative, Genitive, Dative, Locative, Instrumental, Vocative.
- Tapping a button submits immediately — no confirm step.
- Buttons are equal size, pill or rounded-rectangle shape.

**Form Recall input:**

- Text field, auto-focused on card render, with diacritic characters accessible via long-press (or a diacritic toolbar above the keyboard: á č ď é ě í ň ó ř š ť ú ů ý ž).
- Submit button to the right of the input or full-width below it.
- Submit is disabled when input is empty.

**Simple Vocabulary input:**

- 4 Czech word buttons arranged in a 2×2 grid (same tap-to-submit pattern as Case Understanding).
- Sentence area replaced by the English word in large text. No case label, no hint, no text input.
- One button is the correct answer; three are frequency-band distractors.

**States:**

- **Submitting:** Brief loading state (100–200 ms max). Buttons/input disabled.
- **Feedback visible:** See Answer Feedback Panel below. Input area is replaced by feedback.
- **Last card:** After feedback on card 10, "Next" becomes "See Results".

---

### Component — Answer Feedback Panel

**Triggered:** After any card answer, slides up from the bottom (sheet or inline expansion).

**Correct answer:**

| Element          | Detail                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Result indicator | Large checkmark icon + "Correct" label in success colour.                                              |
| Explanation      | Body text from DB `explanation` field. e.g. "Accusative is used here as the direct object of 'vidět'." |
| Next button      | Full-width. Label: "Next →". On last card: "See Results".                                              |

**Incorrect answer:**

| Element                | Detail                                                  |
| ---------------------- | ------------------------------------------------------- |
| Result indicator       | Large × icon + "Incorrect" label in error colour.       |
| Correct answer callout | "Correct answer: **psa**" — highlighted in a muted box. |
| User's answer          | "Your answer: pse" — shown below in smaller muted text. |
| Explanation            | Same as above.                                          |
| Next button            | Full-width. "Next →" / "See Results".                   |

**Achievement toast (overlaid, not blocking):**

- Appears above the feedback panel after a short delay.
- Two variants:
  - Word known: `"pes" is now a Known Word in Accusative! ✓`
  - Level up: `Accusative: Familiar 🎯` (or without emoji per app style)
- Auto-dismisses after 3 s or on tap.

---

### Screen 3 — Session Complete

**Purpose:** Show the session score and surface any achievements. Allow replay or navigation.

**Layout:** Centred single column, vertically balanced.

**Components:**

| Component            | Detail                                                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Score display        | Large prominent text: `7 / 10`. Sub-label: "Correct"                                                                                         |
| Score visual         | Ring or bar showing proportion correct. Success colour if ≥ 7, neutral otherwise.                                                            |
| Achievements section | Only rendered if any `word_became_known` or `level_up` events occurred this session. Title: "This session". List of achievement chips.       |
| Missed words list    | Title: "Review these". List of words answered incorrectly, each showing: Czech form + English base word + case. Only rendered if any errors. |
| Action buttons       | "Practice Again" (same mode + scope) — primary. "Back to Progress" — secondary.                                                              |

**States:**

- **Perfect score:** Score label and ring in strong success colour. Optional copy: "Clean sweep!"
- **No errors:** Missed words section not rendered.
- **No achievements:** Achievements section not rendered.

---

### Screen 4 — Progress Screen

**Purpose:** Show per-case skill scores, weekly gains, level, and known word count.

**Layout:** Scrollable list of case cards. One card per active case (cases with at least one attempt).

**Header:**

| Element           | Detail                                                                                                                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Screen title      | "Progress"                                                                                                                                                                                                      |
| Global level card | Prominent card at the top. Shows current level (Beginner / Familiar / Proficient / Fluent), total known word count, and a progress bar toward the next threshold. e.g. "Familiar · 8 / 20 words to Proficient". |
| New case prompt   | Shown only when all active cases > 90% in both modes. Banner: "You're strong in all active cases. Ready to start Dative?" with a "Start Dative" button.                                                         |

**Per-case card:**

| Element                | Detail                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| Case name              | Large label. e.g. "Accusative"                                                             |
| Case Understanding row | Label + horizontal progress bar (0–100%) + percentage text + gain chip                     |
| Form Recall row        | Same structure                                                                             |
| Gain chip              | `+5%` in green, `−3%` in red, `—` in muted grey. Small pill appended after the percentage. |

**Gain chip logic (visible to designer):**

- Green = positive delta vs. last 7 days
- Red = negative delta
- `—` = no prior-week data (user just started)

**Progress bar colour:**

- < 50%: muted/warning tone
- 50–79%: neutral/progress tone
- ≥ 80%: success tone

**Empty state (no cases practiced yet):**

A centred illustration area + text: "No progress yet. Start your first session!" + primary CTA button linking to Session Setup.

---

### Screen 5 — Known Words Screen

**Purpose:** Browse all fully mastered or partially practiced words with case status badges.

**Layout:** Searchable list. Optional filter bar by case.

**Header:**

| Element            | Detail                                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Screen title       | "Words"                                                                                                                       |
| Search field       | Filter list by Czech or English text.                                                                                         |
| Dusty words banner | Shown only when `is_dusty` words exist. "You have {N} dusty words. Refresh them?" + "Practice" button. Banner is dismissible. |

**Word list item:**

| Element             | Detail                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Czech word          | Bold. e.g. "pes"                                                                                                               |
| English translation | Muted, same line or line below. e.g. "dog"                                                                                     |
| Case badges row     | Horizontal row of small pills. Known cases: filled, accent colour. Partial cases: outlined, muted. Untouched cases: not shown. |
| Dusty indicator     | Small "dusty" tag or faded clock icon if `is_dusty = true`.                                                                    |

**Badge examples:**

```
pes  dog     [Acc ✓]  [Loc ✓]  [Dat ···]
žena woman   [Acc ✓]
dům  house   [Acc ✓]  [Gen ✓]  [Loc ✓]  [Dat ···]  dusty
```

`✓` = known (filled badge). `···` = partial (outlined badge).

**Tapping a word:** navigates to the word's dictionary entry (existing screen).

**Dictionary entry screen** (existing, out of scope for full design here) includes an **"Add to Practice Box"** button. States:

- Default: "Add to Practice Box" — tapping adds the root word and shows a brief toast.
- Already pinned: "In Practice Box ✓" — tapping removes it (toggle).
  The button is always visible on a word's entry, regardless of whether the word has been practiced.

**Empty state:** "No known words yet. Complete a few sessions to see your words here."

---

### Screen 6 — Dusty Words Quiz

Reuses the Session Screen component exactly. The only differences:

- Mode badge shows "Review" instead of the mode name.
- Top bar subtitle: "Dusty words refresh"
- Cards alternate Case Understanding and Form Recall for the same word (5 words × 2 modes = 10 cards).
- Session Complete screen shows "Words refreshed: {N}" instead of a score.

---

### Component States Summary

| Component                              | States                                                            |
| -------------------------------------- | ----------------------------------------------------------------- |
| Start button                           | Default / Loading (spinner) / Disabled                            |
| Case pill (scope selector)             | Default / Selected / Disabled (no words)                          |
| Case Understanding case button         | Default / Pressed / Correct (green flash) / Incorrect (red flash) |
| Form Recall / Vocabulary submit button | Default / Disabled (empty input) / Loading                        |
| Progress bar                           | Empty / Partial / Good / Excellent (colour bands)                 |
| Gain chip                              | Positive / Negative / No data                                     |
| Level badge                            | Beginner / Familiar / Proficient / Fluent (4 colours)             |
| Case badge                             | Known (filled) / Partial (outlined)                               |
| Dusty badge                            | Visible / Hidden                                                  |
| Practice box button (dictionary entry) | Default ("Add to Practice Box") / Pinned ("In Practice Box ✓")    |
| Achievement toast                      | Word known / Level up / Hidden                                    |

---

### Typography & Spacing Guidance

- Sentence text on cards: large, high contrast, generous line height (reading-optimised).
- Case buttons (Case Understanding mode): medium weight, all-caps or title case, uniform sizing.
- Progress bars: thin (4–6 px height), rounded caps.
- Gain chips: small (12–13 px), pill shape, tight padding.
- Level badges: small (11–12 px), uppercase, medium weight.
- Consistent section spacing between case cards on the Progress Screen (16–24 px gap).
- Bottom safe area padding on all screens (especially Session Screen input area).
