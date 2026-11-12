---
name: session-building
description: How practice sessions are constructed — slot allocation, deduplication, mode eligibility rules, and the p_allow_new_words gate.
metadata:
  type: reference
---

# Session Building

All session builders share the same CTE structure. `build_practice_session` is the canonical reference; `build_vocabulary_session` follows the same pattern with vocabulary-specific differences noted below.

## CTE pipeline

```
pinned_new        → up to 2 pinned words not yet practiced in this mode
pre_practiced     → all forms the user has practiced in this mode + scope
practiced         → ARS priority applied to pre_practiced rows
practiced_ranked  → DISTINCT ON (root_word_id) — one form per root word per tier
new_candidates    → words not yet practiced in this mode, ordered by frequency_rank
selected          → slot allocation, LIMIT 10
```

## Slot allocation (selected CTE)

```sql
SELECT pn.word_form_id, 0       AS rn, 999.0 AS priority FROM pinned_new
UNION ALL
SELECT pr.word_form_id, pr.rn   AS rn, pr.priority       FROM practiced_ranked
UNION ALL
SELECT nc.word_form_id, 9999999 AS rn, nc.priority       FROM new_candidates
ORDER BY rn ASC, priority DESC, random()
LIMIT 10
```

`practiced_ranked` uses `ROW_NUMBER() OVER (PARTITION BY root_word_id ORDER BY priority DESC, root_last_practiced_at ASC)`. Only `rn = 1` rows reach the final `selected` CTE — one form per root word, the highest-priority one.

## Eligibility filters (must survive into pre_practiced / new_candidates)

1. **Blocked words** — `wf.root_word_id NOT IN (SELECT root_word_id FROM blocked_words WHERE profile_id = v_user_id)`
2. **Example sentence required** — `EXISTS (SELECT 1 FROM example_sentences WHERE word_form_id = wf.id)`
3. **form_recall prerequisite** — when `p_mode = 'form_recall'`, only forms where `case_understanding correct >= 1` are eligible. Checked in both `pre_practiced` and `new_candidates`.
4. **Scope filter** — `p_scope = 'mixed'` OR `ft.name = p_scope`
5. **Word type filter** — `p_word_type IS NULL` OR `rw.word_type = p_word_type`

## p_allow_new_words (added 20260528)

`DEFAULT true`. When `false`:

- `pinned_new` CTE produces no rows (guarded by `COALESCE(p_allow_new_words, true)`)
- `new_candidates` CTE produces no rows (same guard)
- Session is review-only: only forms already practiced in this mode appear

## is_new_word column (added 20260528)

Returned on every card. Computed as:

```sql
NOT EXISTS (
  SELECT 1 FROM user_word_progress
  WHERE profile_id = v_user_id AND word_form_id = wf.id AND mode = p_mode
) AS is_new_word
```

## Vocabulary session differences

`build_vocabulary_session` operates on **nominative forms only**. Its `practiced` CTE differs:

- Draws from _all words the user has any practice in any mode_ (not just SV-mode progress)
- Words with SV `last_practiced_at > 7 days ago` → priority 1.0 (fading)
- Words with any practice in another mode but no SV history → priority 0.8 (seen but not in SV)
- New candidates = words with NO practice in any mode at all
- **Slot allocation differs** (since 20261112): new words rank _ahead_ of review words so the review pool can't crowd them out. `pinned_new` and `new_candidates` both get `rn = 0`; `practiced` gets `rn = 1`. Pinned words count toward the new-word quota — `new_candidates` is limited to `v_new_word_limit - COUNT(pinned_new)`. Result with progress + `p_allow_new_words = true`: 2 new words + 8 review words.

```sql
SELECT pn.word_form_id, 0 AS rn, 999.0 AS priority FROM pinned_new
UNION ALL
SELECT nc.word_form_id, 0 AS rn, nc.priority       FROM new_candidates
UNION ALL
SELECT pr.word_form_id, 1 AS rn, pr.priority       FROM practiced
ORDER BY rn ASC, priority DESC
LIMIT 10
```

Before this, new candidates used `rn = 9999999`, so once a user had 10+ practiced root words (any mode) every slot went to review and "Include new words" had no effect.

## Vocabulary distractors (added 20261112)

`build_vocabulary_session` returns up to 5 English distractors per card, same `word_type`, closest `frequency_rank` first. Two filters keep them unambiguous:

- **No shared sense with the answer** — `public.english_senses(text)` splits a meaning on `;` `,` `/` into lowercase trimmed senses; a candidate is excluded if `english_senses(d.in_english) && english_senses(rw.in_english)`. This drops aspect pairs and synonyms (dělat / udělat, dozvědět se / zjistit, tvůj / váš).
- **No duplicate distractors** — `DISTINCT ON (lower(trim(d.in_english)))` before ranking.

Small word types (e.g. adverbs, adjectives) can still yield fewer than 5 distractors — the pool is just small.

## Dusty session

`build_dusty_session` filters to root words where `SUM(correct) >= 10 AND MAX(last_practiced_at) < now() - 90 days`. Returns 5 words (frontend alternates mode per word for 10 total cards). Always returns `is_new_word = false`.

## Invariants

- One form per root word per tier — never break the `DISTINCT ON (root_word_id)` dedup
- The form_recall prerequisite must be checked in BOTH `pre_practiced` and `new_candidates`, not just one
- `pinned_new` must respect `p_allow_new_words` or the gate is bypassed
  - Exception: `build_vocabulary_session` ignores `p_allow_new_words = false` when the user has no `user_word_progress` rows at all (`v_allow_new`), otherwise a fresh user gets an empty session. Such a user also gets up to 10 new candidates instead of 2 (`v_new_word_limit`)
- Session building is entirely server-side; the frontend never touches the word pool

**See also:** [[ars-algorithm]], [[rpc-functions]]
