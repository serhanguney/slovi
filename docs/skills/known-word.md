---
name: known-word
description: How "known word" is defined, computed, and surfaced — including the known_word_threshold() function and how this differs from the original planning doc.
metadata:
  type: reference
---

# Known Word Definition

**Current definition (as of 20260326_unified_known_definition.sql):**

A root word is **known** when every case `word_form` of that root word has been answered correctly in `form_recall` mode at least `known_word_threshold()` times.

```sql
-- known_word_threshold() returns 3
CREATE OR REPLACE FUNCTION public.known_word_threshold()
RETURNS int LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$ SELECT 3 $$;
```

```sql
-- is_known check (from get_user_word_list / get_known_words):
NOT EXISTS (
  SELECT 1 FROM word_forms wf2
  JOIN word_form_types ft2 ON wf2.form_type_id = ft2.id
  LEFT JOIN user_word_progress uwp2
    ON uwp2.word_form_id = wf2.id
    AND uwp2.profile_id = auth.uid()
    AND uwp2.mode = 'form_recall'
  WHERE wf2.root_word_id = p.root_word_id
    AND ft2.category = 'case'
    AND COALESCE(uwp2.correct, 0) < known_word_threshold()
)
```

**What this means:** all case forms must individually reach 3 correct `form_recall` answers. SV and case_understanding correct counts do not count toward known status.

## What PRACTICE.md says (outdated — do not use)

The planning doc defined known as "SUM(correct) >= 10 across all word_forms of the root word, across all modes." This was replaced by the unified definition above. `PRACTICE.md` is a planning artifact, not an authoritative spec.

## word_became_known event

`record_practice_answer` fires `word_became_known = true` when:

1. The answer is correct AND in `form_recall` mode
2. This answer pushes `v_this_form_correct` to exactly `known_word_threshold()`
3. After the update, no case form of the root word remains below threshold

The check requires a correlated subquery over all case forms — it is intentionally precise to avoid false positives.

## Level thresholds (global known word count)

| Level      | Total known words |
| ---------- | ----------------- |
| Beginner   | 0                 |
| Familiar   | 5                 |
| Proficient | 20                |
| Fluent     | 50                |

Level-up fires in `record_practice_answer` when `v_word_became_known` is true and the new global known count crosses a threshold.

## Fading vs known

A word can be **fading** without being known. `fading` is a display status in `get_user_word_list` defined as:

```
NOT is_known AND last_practiced_at IS NOT NULL AND last_practiced_at < now() - 7 days
```

Known words never show a fading status (they're done). Fading words get priority 1.0 in session building so they surface urgently.

## Dusty words

A separate concept from fading. Dusty = `known = true AND MAX(last_practiced_at) < now() - 90 days`. Only known words go dusty. Dusty is a suggestion to refresh, not a demotion.

## Invariants

- `known_word_threshold()` is the single source of truth — change it in one place, all functions pick it up
- Only `form_recall` correct counts toward known; changing that would require updating all callers
- `word_became_known` fires only in `record_practice_answer` — never compute it elsewhere
- Do not conflate "fading" (urgently needs practice) with "dusty" (known but stale) — they have different thresholds and different actions

**See also:** [[ars-algorithm]], [[rpc-functions]], [[session-building]]
