# Case Study Mode

## Purpose

A 4th practice mode: a study/prep tool for `form_recall`. The user picks a word from the dictionary and practices all its declined forms via **multiple choice** (pick the correct form string from the word's own declension table). User-driven — the algorithm does not pick words, only prioritizes which forms to ask about.

Entry point: "Study this word" button in `WordDetail`.

---

## Algorithm: `build_case_study_session(p_root_word_ids bigint[])`

Takes a list of root word IDs (currently always 1, but designed for multiple). Returns 10 cards.

### Session composition

- Distribute proportionally: `CEIL(10.0 / n_words)` slots per word, final `LIMIT 10`
- Within each word, rank forms by 3-tier priority:

| Tier | Condition                                                                   | Priority value                                                                                                             |
| ---- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1    | Has prior `case_study` history                                              | `compute_ars_priority(...)` — higher = more failures/fading                                                                |
| 2    | No `case_study` history, but has `case_understanding`/`form_recall` history | Cross-mode weakness: avg priority **per case type** across ALL practiced words (global weakness signal, not word-specific) |
| 3    | No history at all                                                           | `random()`                                                                                                                 |

Pick top forms per word ordered by `(tier ASC, priority DESC)`.

### Options (multiple choice)

- All unique `form_in_czech` values for the root word, capped at **6**, ordered randomly
- Minimum: 1 (edge case — word with one unique form across all cases)
- Generated with: `ARRAY(SELECT DISTINCT wf.form_in_czech FROM word_forms wf JOIN word_form_types ft ON wf.form_type_id = ft.id WHERE wf.root_word_id = rw.id AND ft.category = 'case' ORDER BY random() LIMIT 6)`

### Edge case: duplicate form strings

Some Czech words share the same surface form across multiple cases (e.g. nominative = vocative).

- **Backend:** `DISTINCT` in the options query — no duplicate strings
- **Frontend:** Correctness check by **string value** (`selectedOption === card.target_form`), NOT by `word_form_id`

### `record_practice_answer` — known-word exclusion

`case_study` answers are excluded from the "Known" word threshold. The known-word check in `record_practice_answer` is guarded:

```sql
IF p_is_correct AND p_mode != 'case_study' THEN ...
```

> **Future task:** Redesign "known word" logic — form_recall only, every form × 2 correct, session builder promotes words near the threshold. Deferred until after case_study ships. The patch above is a safe interim guard.

---

## Card Shape

| Column             | Type   | Description                                           |
| ------------------ | ------ | ----------------------------------------------------- |
| `word_form_id`     | bigint | The specific form being tested                        |
| `root_word_id`     | bigint | Parent word                                           |
| `sentence_czech`   | text   | Czech example sentence (target form highlighted)      |
| `sentence_english` | text   | English translation of the sentence (shown as prompt) |
| `target_form`      | text   | Correct `form_in_czech` string                        |
| `base_form`        | text   | Nominative form (hint shown to user)                  |
| `correct_case`     | text   | e.g. `'genitive singular'`                            |
| `explanation`      | text   | Contextual note for the form                          |
| `options`          | text[] | Deduplicated form strings, max 6, random order        |

---

## SQL Refactoring (co-shipped)

The ARS priority formula is copy-pasted in `build_practice_session`, `build_vocabulary_session`, and `get_practiced_words`. Extract as a reusable helper before writing the new function:

```sql
CREATE OR REPLACE FUNCTION public.compute_ars_priority(
  p_correct    int,
  p_incorrect  int,
  p_days_since float,
  p_is_pinned  boolean
) RETURNS float
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE
    WHEN p_is_pinned THEN 1.0
    ELSE 1 - (
      (p_correct::float / GREATEST(p_correct + p_incorrect, 1))
      * exp(-p_days_since / (GREATEST(p_correct, 1) * 3.0))
    )
  END
$$;
```

---

## Implementation Steps

| Step | File                                                          | Notes                                                                                            |
| ---- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1    | `supabase/migrations/20260325_case_study.sql`                 | Enum value, `compute_ars_priority`, `build_case_study_session`, patched `record_practice_answer` |
| 2    | `src/supabase/schema.ts`                                      | `pnpm update-types` after deploying SQL                                                          |
| 3    | `src/features/practice/types.ts`                              | Add `CaseStudyCard` type                                                                         |
| 4    | `src/features/practice/hooks/useBuildCaseStudySession.ts`     | New hook                                                                                         |
| 5    | `src/features/practice/components/CaseStudySessionScreen.tsx` | New session screen component                                                                     |
| 6    | `src/pages/SessionPage.tsx`                                   | Add `case_study` dispatch branch                                                                 |
| 7    | `src/features/dictionary/WordDetail.tsx`                      | "Study this word" button (mobile header + desktop left column)                                   |

### Post-session navigation

"Done" calls `navigate(-1)` — returns to the `WordDetail` page the user launched from.

### GraduationCap button (deferred)

The existing placeholder button in `SessionScreen` and `VocabularySessionScreen` (`onClick: () => {}`) is intended for case_study cross-linking. Wiring it up is deferred to a future task.

---

## Question Format (UI)

**Prompt:** "What is the **{correct_case}** form of **{base_form}**?"

Displayed above the Czech example sentence (with target form hidden/highlighted depending on submitted state).

**Options:** Form strings from `card.options`, shuffled on mount.

**Correct:** Green highlight on `target_form` string match; incorrect answer highlighted red.

**After answer:** Show `card.explanation` below options.
