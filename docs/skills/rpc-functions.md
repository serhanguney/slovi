---
name: rpc-functions
description: Live signatures for all Supabase RPC functions, atomicity requirements, and the tables they write to.
metadata:
  type: reference
---

# RPC Functions

Current signatures as of 2026-05-28. These are the functions deployed to Supabase and called from the frontend via `supabase.rpc(...)`.

## Session builders (read-only)

```
build_practice_session(
  p_mode            practice_mode,        -- 'case_understanding' | 'form_recall'
  p_scope           text,                 -- 'mixed' | case name e.g. 'accusative'
  p_word_type       word_type DEFAULT NULL,
  p_allow_new_words boolean   DEFAULT true
) → TABLE (
  word_form_id, root_word_id, sentence_czech, sentence_english,
  target_form, base_form, correct_case, explanation, in_english,
  is_new_word
)
```

```
build_vocabulary_session(
  p_allow_new_words boolean DEFAULT true
) → TABLE (
  word_form_id, root_word_id, in_english, correct_czech,
  base_form, target_form, sentence_czech, sentence_english, distractors[], is_new_word
)
```

```
build_aspect_session(
  p_allow_new_words boolean DEFAULT true
) → TABLE (
  aspect_example_id, word_form_id, root_word_id, sentence_czech, sentence_english,
  answer_form, distractor_form, answer_aspect, signal, explanation,
  imperfective, perfective, imperfective_english, perfective_english, is_new_word
)
```

Reads `aspect_examples` (written by slovi-agent's `generate-aspect-examples` through the service-role-only `insert_aspect_examples`; `list_aspect_pairs()` is service-role only too). `word_form_id` is the answer form — record it with `p_mode = 'aspect_choice'`.

```
build_dusty_session()
→ TABLE (
  word_form_id, mode, sentence_czech, sentence_english,
  target_form, base_form, correct_case, explanation, is_new_word
)
```

## Answer recording (writes two tables atomically)

```
record_practice_answer(
  p_word_form_id bigint,
  p_mode         practice_mode,
  p_is_correct   boolean
) → jsonb {
  word_became_known: boolean,
  level_up: { known_count: int, level: text } | null
}
```

**Atomicity rule:** `record_practice_answer` inserts into `practice_attempts` AND upserts into `user_word_progress` in the same transaction. These two tables are **never** updated independently. Breaking this causes analytics (from `practice_attempts`) and session prioritisation (from `user_word_progress`) to diverge.

Also runs: pin consumption (`DELETE FROM practice_box` on first answer to a pinned word).

## Progress / word list queries

```
get_practice_progress()
→ TABLE (case_name, case_understanding, form_recall, cu_gain_week, fr_gain_week)

get_known_words()
→ TABLE (root_word_id, in_czech, in_english, known_cases[], partial_cases[], last_practiced, is_dusty)

get_user_word_list(p_search text DEFAULT '')
→ TABLE (
  root_word_id, in_czech, in_english, word_type,
  is_known, is_in_box, is_blocked, last_practiced,
  sv_accuracy, cu_accuracy, fr_accuracy,
  sv_status, cu_status, fr_status, practiced_cases[]
)

known_word_threshold() → int  -- currently returns 3
```

## Tables written by RPC functions

| Table                | Written by                                                                           |
| -------------------- | ------------------------------------------------------------------------------------ |
| `practice_attempts`  | `record_practice_answer`                                                             |
| `user_word_progress` | `record_practice_answer`                                                             |
| `practice_box`       | frontend direct (add/remove pin); `record_practice_answer` (consume on first answer) |
| `blocked_words`      | frontend direct                                                                      |

## Security model

All functions use `SECURITY INVOKER` — they run with the caller's Supabase auth context. RLS on the underlying tables enforces `profile_id = auth.uid()`. Never add `SECURITY DEFINER` without understanding the implications.

## After schema changes

Run `pnpm update-types` to regenerate `src/api/schema.ts` from the live Supabase schema. Never manually edit `src/api/schema.ts`.

**See also:** [[session-building]], [[ars-algorithm]], [[known-word]]
