---
name: ars-algorithm
description: The Adaptive Retention System priority formula, fading override, and priority thresholds used by all session-building functions.
metadata:
  type: reference
---

# ARS Algorithm

## Priority formula

Computed per `(word_form_id, mode)` pair in the `practiced` CTE of every session-building function:

```sql
1 - (
  (correct::float / GREATEST(correct + incorrect, 1))
  * exp(
      -EXTRACT(EPOCH FROM (now() - last_practiced_at)) / 86400.0
      / (GREATEST(correct, 1) * 3.0)
    )
)
```

- **accuracy** = `correct / (correct + incorrect)` — historical hit rate
- **half_life** = `max(correct, 1) * 3` days — grows with each correct answer (1 correct = 3-day half-life, 10 correct = 30-day half-life)
- **retention** = `accuracy * exp(-days_since / half_life)` — decays exponentially
- **priority** = `1 − retention` — 0 = perfectly retained, 1 = fully forgotten

## Fading override (added 20260526)

When `root_last_practiced_at < now() - interval '7 days'`, priority is clamped to **1.0**, overriding the formula entirely.

**Critical detail:** `root_last_practiced_at` is `MAX(last_practiced_at)` partitioned by `root_word_id` — the most recent practice of _any_ form of that root word in the session's mode. If any form was practiced within 7 days, the word is NOT fading.

This means the 7-day rule operates at the **root-word level**, not the form level. This matches the `fading` display in `get_user_word_list`.

## Pinned words

`practice_box` entries always get priority **1.0**, regardless of formula or fading rule.

## Priority thresholds (slot assignment)

| Range           | Tier        | Max slots |
| --------------- | ----------- | --------- |
| > 0.6           | Struggling  | 4         |
| 0.3 – 0.6       | Reinforcing | 4         |
| never practiced | New         | 2         |

New words carry priority 0.5 (truly new) or 0.6 (word has prior practice in any other mode). The 0.6 case puts cross-mode-familiar words into the reinforcing bucket even though they have no history in the current mode.

## Invariants

- Priority is never computed across modes — each mode has its own `user_word_progress` row
- The fading override must use root-level max practice date, not form-level, or the UI and session builder diverge
- Pinned and fading both map to 1.0; there is no third override value
- `PRACTICE.md` describes an older version of this algorithm — treat the SQL in migrations as authoritative

**See also:** [[session-building]], [[rpc-functions]]
