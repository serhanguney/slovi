# Quiz Session Builder

Apply these invariants whenever you read, write, or review any PostgreSQL function that builds a quiz session for any quiz practice mode (`case_study`, `case_understanding`, `simple_vocabulary`, or future modes quiz practice modes where we provide multiple choice options).

---

## Invariant 1 — Correct answer always in options

The target form **must always appear** in the `options` array. Never rely on pool-based random sampling to include it — the pool may pick a different variant for the same form type, or a LIMIT may cut it out.

---

## Invariant 2 — Fixed option counts (6 / 4 / 3 / 2), consistent per word

Option count is determined **once per word** from the word's total unique answer forms — **not** per question from the per-question distractor pool. This guarantees every question for the same word gets the same number of options.

| Total unique forms for the word | Total options shown |
| ------------------------------- | ------------------- |
| ≥ 6                             | 6                   |
| ≥ 4                             | 4                   |
| ≥ 3                             | 3                   |
| < 3                             | 2                   |

**SQL pattern:**

```sql
target_options AS (
  SELECT CASE
    WHEN COUNT(DISTINCT answer_col) >= 6 THEN 6
    WHEN COUNT(DISTINCT answer_col) >= 4 THEN 4
    WHEN COUNT(DISTINCT answer_col) >= 3 THEN 3
    ELSE 2
  END AS v
  FROM <forms_table>
  WHERE root_word_id = rw.id AND <mode_filter>
)
```

Distractors to pick = `target_options.v - 1` (leaving one slot for the correct answer).

**When same-context distractors (e.g. same plurality) are fewer than needed**, expand the pool to any context rather than dropping to a lower tier. Prefer same-context distractors by ranking them first (`ORDER BY same_context DESC, random()`).

---

## General rules for all session-building functions

- **New migration for every change** — use `CREATE OR REPLACE FUNCTION` in a new file; never edit old migration files.
- **Function signature is frozen** — do not add, remove, or reorder RETURNS TABLE columns without a corresponding frontend type update.
- **LEFT JOIN LATERAL for optional data** (e.g. example sentences) — some forms have no sentences; an INNER JOIN silently drops them and reduces session length.
- **Session length target** — `v_slots_per_word = CEIL(10.0 / n_words)`; always `LIMIT 10` at the end.
- **Prioritisation tiers**:
  - tier 1: forms with existing history for this mode, sorted by ARS priority (most overdue first).
  - tier 2: forms never seen in this mode, sorted by cross-mode weakness (avg ARS from other modes), defaulting to 0.5 if no history exists.
  - tier 1 always ranks before tier 2; within each tier, highest priority first.
