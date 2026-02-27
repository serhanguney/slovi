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

Per `(word_id, case)` pair, tracked independently per mode:

```
easy_correct       int
easy_incorrect     int
last_easy_at       timestamp | null

hard_correct       int
hard_incorrect     int
last_hard_at       timestamp | null
```

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
easy_correct >= 10 AND hard_correct >= 10
```

No time assumption. Mastery is defined by performance, not recency.

### Dusty Words Quiz

A separate quiz type surfaces words where:

```
known = true AND last_practiced_at < now - 90 days
```

This is a suggestion, never forced. The app does not demote or reset known words based on time. It simply offers to refresh them.

---

## Adaptive Retention Algorithm (ARS)

### Priority Score

Calculated independently for Easy and Hard mode per `(word, case)` pair:

```
accuracy   = correct / max(correct + incorrect, 1)
half_life  = max(correct, 1) * 3        // days; grows as mastery improves
days_since = (now - last_practiced_at) / 86400
retention  = accuracy * exp(-days_since / half_life)
priority   = 1 - retention
```

**What this means:**

- A word practiced once correctly has `half_life = 3 days`. After 3 days, retention drops to ~72%, priority rises.
- A word practiced 10 times correctly has `half_life = 30 days`. It surfaces rarely.
- A word with 40% accuracy has low retention regardless of time — it always bubbles up.
- Never-practiced pair: `priority = 0.5` (neutral, treated as new).

### Session Construction (10 cards)

| Slot        | Criteria                 | Count |
| ----------- | ------------------------ | ----- |
| Struggling  | priority > 0.6, any mode | 4     |
| Reinforcing | 0.3 < priority ≤ 0.6     | 4     |
| New         | never practiced          | 2     |

If a bucket doesn't have enough candidates, fill remaining slots from highest priority overall.

New words trickle in at 2 per session to avoid overwhelming the learner.

### After Each Answer

**Correct:** `correct_count++`, `last_practiced_at = now`

**Incorrect:** `incorrect_count++`, `last_practiced_at = now`

Wrong answers are **recorded only** — no re-queuing in the same session. The elevated `incorrect_count` naturally raises priority for the next session via the formula above.

---

## 4-Week User Journey

### Week 1 — Building the Accusative Foundation

**Day 1, Session 1** — 2 new words: _pes_ (dog), _žena_ (woman)

With 2 words, each appears ~5 times across Easy/Hard:

```
Card 1 (Easy):  "Viděl jsem velkého psa."
                Bold: psa → user picks: Accusative ✓

Card 2 (Hard):  "Vidím ___."  [pes]
                User types: psa ✓

Card 3 (Easy):  "Znám jednu ženu."
                Bold: ženu → user picks: Accusative ✓

Card 4 (Hard):  "Miluji ___."  [žena]
                User types: zenu ✗  (forgot diacritic — correct is ženu)
```

After Session 1:

```
pes:  easy=(3c, 0w)  hard=(2c, 0w)
žena: easy=(3c, 0w)  hard=(1c, 1w)
```

**Day 2, Session 2** — priority recalculated after 24h

```
pes:  accuracy=1.0, half_life=3d, days_since=1
      retention = exp(-1/3) ≈ 0.72 → priority = 0.28  (reinforcing)

žena: easy priority = 0.28  (reinforcing)
      hard priority = 0.67  (struggling — one wrong answer, low correct_count)
```

2 new words added: _muž_ (man), _kniha_ (book)

By end of Week 1 (~5 sessions, 6–7 accusative words):

```
pes:  easy=(9c,0w)  hard=(7c,1w)   ← nearly Case Understood; form catching up
žena: easy=(8c,0w)  hard=(5c,3w)   ← form recall clearly harder
muž:  easy=(6c,1w)  hard=(3c,2w)
```

```
Case Understanding: ~91%
Form Recall:        ~72%
```

---

### Week 2 — First Known Words, Second Case Introduced

**Day 8:** `pes` hits `easy_correct = 10` → _Case Understood_. Easy priority drops sharply. Hard mode priority still moderate — continues appearing in Hard sessions.

**Day 10:** User optionally opens Locative. 2 new words: _město_ (city in locative context), _škola_ (school).

```
Card (Easy): "Mluvím o škole."  (I'm talking about school.)
             Bold: škole → user picks: Locative ✓  (first exposure)
```

Algorithm now runs across both cases. Accusative words with high hard_incorrect still surface. Locative fills new slots.

**Day 14:** `pes` hits `hard_correct = 10` → **fully Known** in Accusative. Exits regular rotation.

```
Case Understanding: Accusative 94% | Locative 65%
Form Recall:        Accusative 81% | Locative 41%
```

---

### Week 3 — Multi-Case Rotation

~15 word-case pairs active. Sessions naturally mix cases based on priority.

Sample session:

```
Card 1 (Hard, Accusative): "Čtu ___."    [kniha] → "knihu" ✓
Card 2 (Easy, Locative):   "Pracuji v kanceláři."  bold: kanceláři → Locative ✓
Card 3 (Hard, Locative):   "Jsem v ___." [škola] → "škole" ✓
Card 4 (Easy, Accusative): "Vidím muže." bold: muže → Accusative ✓
Card 5 (Hard, Locative):   "Bydlím v ___." [město] → "meste" ✗  (forgot háček)
```

The locative Form Recall score is noticeably lower than Case Understanding — correct, since locative endings (-e, -u, -ě) are irregular and harder to produce than to recognize.

---

### Week 4 — Foundation Taking Shape

By Day 28:

```
Known words (easy≥10 AND hard≥10): 4–6 words
Active word-case pairs: 25–30
Cases touched: Accusative (mature), Locative (mid), Dative (just started)

Case Understanding:  Accusative 96% | Locative 78% | Dative 55%
Form Recall:         Accusative 88% | Locative 59% | Dative 32%
```

First **Dusty Words** prompt may appear if early accusative words haven't been practiced in 90+ days:

> "You know 4 accusative words but haven't practiced them in 95 days. Want to refresh?"

The gap between Case Understanding and Form Recall is the most informative signal the app can show. It tells the user exactly where they stand: grammar comprehension vs. production ability.

---

## Open Questions

1. **Verbs** — deferred to Phase 2. Current sentence format uses verbs contextually but only nouns are the target of practice.
2. **Word pool ordering** — how are the 2 new words per session selected? By frequency ranking in the database? By thematic grouping (animals, places, etc.)? TBD.
3. **Case selector UX** — does the user pick a case before each session, or does the algorithm surface a mixed session across all active cases?
