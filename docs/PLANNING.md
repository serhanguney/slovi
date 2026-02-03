# Database Restructuring Plan

## Current Problems

### Problem 1: JSON declension_table limits search capability

**Current structure:**

```
root_words
  - declension_table: JSON (e.g., {"singular.masculine_animate.genitive": "svého", ...})
```

**Why it's a problem:**

- You want autocomplete fuzzy search across all word forms
- JSON columns cannot be efficiently indexed for partial text matching
- To find "which root word has the form 'svého'", you'd need to scan every row and parse every JSON object
- PostgreSQL's JSON operators (`->`, `->>`, `@>`) don't support fuzzy/partial matching

**Example of what you can't do efficiently:**

```sql
-- This is slow/impossible with JSON:
SELECT * FROM root_words
WHERE declension_table ILIKE '%své%'  -- Can't fuzzy search inside JSON
```

---

### Problem 2: Example sentences only exist for pronouns

**Current structure:**

```
pronouns
  - czech_sentence
  - english_sentence
  - declension_explanation
```

**Why it's a problem:**

- Your goal: "example sentences for every format of the word" (nouns, verbs, adjectives, etc.)
- Currently only `pronouns` table has sentence examples
- No way to attach examples to noun declensions or verb conjugations
- Would need to duplicate the sentence columns across multiple tables

---

### Problem 3: No unified word form table

**Current structure:**

- `pronouns` table exists with specific columns
- No `nouns`, `adjectives`, or `verbs` tables
- `word_types` enum suggests these should exist

**Why it's a problem:**

- Inconsistent data model
- Each word type would need its own table with duplicated structure
- Queries become complex ("get all forms for word X" requires checking multiple tables)

---

## Proposed Solution

### New Structure: root_words → word_forms → example_sentences

```
root_words
  ├── id (PK)
  ├── in_czech (text) - base/dictionary form
  ├── in_english (text) - translation
  ├── word_type (enum) - noun, verb, pronoun, adjective, etc.
  └── aspect (enum, nullable) - for verbs: perfective, imperfective, bi-aspectual

word_forms
  ├── id (PK)
  ├── root_word_id (FK → root_words.id)
  ├── form_czech (text) - the actual inflected form (e.g., "svého")
  ├── form_type_id (FK → form_types.id) - grammatical category
  ├── gender (enum, nullable) - for nouns/adjectives/pronouns
  ├── plurality (enum) - singular/plural
  ├── person (enum, nullable) - for verbs: 1st, 2nd, 3rd
  └── tense (enum, nullable) - for verbs: present, past, future

form_types
  ├── id (PK)
  ├── name (text) - e.g., "genitive", "present_tense", "imperative"
  ├── category (enum) - case, tense, mood, etc.
  ├── description (text) - short description
  └── explanation (text) - detailed educational content for learners

verb_aspect_pairs
  ├── id (PK)
  ├── imperfective_id (FK → root_words.id)
  ├── perfective_id (FK → root_words.id)
  └── notes (text, nullable) - for nuances (e.g., "dodělat emphasizes completion")

example_sentences
  ├── id (PK)
  ├── word_form_id (FK → word_forms.id)
  ├── czech_sentence (text)
  ├── english_sentence (text)
  └── explanation (text) - why this form is used in this context
```

### form_types: Educational content for grammar

This table serves dual purposes:

1. **Data integrity** - Ensures consistent naming of grammatical forms
2. **Learning resource** - Provides explanations for beginners

**Example data:**

| name          | category | description                     | explanation                                                                                                                                                                                 |
| ------------- | -------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| genitive      | case     | Possession, absence, quantities | "The genitive case is used to show possession (Petrova kniha = Peter's book), after certain prepositions (do, z, bez, od), with negation (nemám času), and with quantities (hodně lidí)..." |
| accusative    | case     | Direct objects, directions      | "The accusative case marks the direct object of a verb (Vidím psa = I see the dog) and is used with motion verbs to indicate direction (Jdu do města)..."                                   |
| present_tense | tense    | Current or habitual actions     | "Czech present tense is used for actions happening now or habitually. Unlike English, there's no distinction between 'I go' and 'I am going'..."                                            |
| imperative    | mood     | Commands and requests           | "The imperative mood is used for commands, requests, and instructions. It has forms for 2nd person singular, 1st person plural, and 2nd person plural..."                                   |

### verb_aspect_pairs: Linking perfective/imperfective verbs

Czech verbs come in aspect pairs. This table explicitly links them.

**Why a separate table instead of self-reference:**

- Clear semantics (which is imperfective, which is perfective)
- Handles one-to-many: one imperfective can have multiple perfectives
  - dělat (impf) → udělat (complete), dodělat (finish up), předělat (redo)
- Bi-aspectual verbs (like "absolvovat") simply have no entry here
- Notes field captures nuance differences between related perfectives

**Example data:**

| imperfective | perfective | notes                   |
| ------------ | ---------- | ----------------------- |
| dělat        | udělat     | General completion      |
| dělat        | dodělat    | Finish remaining work   |
| dělat        | předělat   | Do again/redo           |
| psát         | napsat     | null                    |
| číst         | přečíst    | Read through completely |
| jít          | přijít     | Arrive (on foot)        |
| jít          | odejít     | Leave (on foot)         |

---

## How This Fixes Each Problem

### Fix for Problem 1: Searchable word forms

**Before (JSON):**

```sql
-- Impossible to do efficiently
SELECT * FROM root_words WHERE declension_table::text ILIKE '%své%'
```

**After (relational):**

```sql
-- Fast with a simple index on form_czech
CREATE INDEX idx_word_forms_czech ON word_forms(form_czech);
CREATE INDEX idx_word_forms_czech_trgm ON word_forms USING gin(form_czech gin_trgm_ops);

-- Fuzzy autocomplete search
SELECT wf.form_czech, rw.in_english, rw.word_type
FROM word_forms wf
JOIN root_words rw ON wf.root_word_id = rw.id
WHERE wf.form_czech ILIKE 'své%'  -- prefix search
   OR wf.form_czech % 'sve'       -- trigram similarity for typos
ORDER BY similarity(wf.form_czech, 'sve') DESC
LIMIT 10;
```

**What this enables:**

- Autocomplete as user types
- Typo tolerance using PostgreSQL trigram extension
- Search finds any form, not just the base word

---

### Fix for Problem 2: Examples attached to any word form

**Before:**

- Examples only on `pronouns` table
- No way to add examples for noun "dům" in locative "domě"

**After:**

```sql
-- Add example for any word form
INSERT INTO example_sentences (word_form_id, czech_sentence, english_sentence, explanation)
VALUES (
  123,  -- word_form_id for "domě" (locative of "dům")
  'Bydlím v tom domě.',
  'I live in that house.',
  'Locative case used with preposition "v" (in) to indicate location.'
);

-- Get all examples for a word form
SELECT es.czech_sentence, es.english_sentence, es.explanation
FROM example_sentences es
WHERE es.word_form_id = 123;
```

**What this enables:**

- Every declension/conjugation can have its own examples
- Explanations are specific to the grammatical context
- Consistent structure regardless of word type

---

### Fix for Problem 3: Unified model for all word types

**Before:**

- Would need: `pronouns`, `nouns`, `adjectives`, `verbs` tables
- Each with duplicated columns for sentences, forms, etc.

**After:**

- One `word_forms` table handles all types
- Word-type-specific attributes (person, tense, aspect) are nullable
- Nouns use: gender, plurality, form_type (case)
- Verbs use: person, plurality, tense, aspect
- Clean separation of concerns

**Example data:**

| root_word     | form_czech | form_type  | gender    | plurality | person | tense   |
| ------------- | ---------- | ---------- | --------- | --------- | ------ | ------- |
| dům (noun)    | domě       | locative   | masc_inan | singular  | null   | null    |
| dům (noun)    | domy       | nominative | masc_inan | plural    | null   | null    |
| mluvit (verb) | mluvím     | present    | null      | singular  | 1st    | present |
| mluvit (verb) | mluvili    | past       | null      | plural    | 3rd    | past    |
| napsat (verb) | napiš      | imperative | null      | singular  | 2nd    | null    |

**Verb aspect example:**

- `root_words`: psát (id=10, aspect=imperfective), napsat (id=11, aspect=perfective)
- `verb_aspect_pairs`: {imperfective_id=10, perfective_id=11}
- Both verbs have their own `word_forms` entries for conjugations
- Dictionary UI can show "psát (impf.) ↔ napsat (pf.)" with link to paired verb

---

---

## Dictionary Feature

### Search Capabilities

**Trigram index for fuzzy search:**

```sql
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_word_forms_trgm ON word_forms USING gin(form_czech gin_trgm_ops);
```

**Diacritic-insensitive search:**

```sql
CREATE EXTENSION unaccent;
CREATE INDEX idx_word_forms_unaccent ON word_forms USING gin(unaccent(form_czech) gin_trgm_ops);

-- User types "dum" → finds "dům"
WHERE unaccent(form_czech) ILIKE unaccent($query) || '%'
   OR form_czech % $query  -- trigram similarity
```

**Search ranking priority:**

1. Exact match: "své" when searching "své"
2. Prefix match: "svého" when searching "sve"
3. Fuzzy match: "své" when searching "sev" (typo)

```sql
SELECT
  rw.in_czech,
  rw.in_english,
  wf.form_czech,
  CASE
    WHEN wf.form_czech = $query THEN 1
    WHEN wf.form_czech ILIKE $query || '%' THEN 2
    ELSE 3
  END AS rank,
  similarity(wf.form_czech, $query) AS sim
FROM word_forms wf
JOIN root_words rw ON wf.root_word_id = rw.id
WHERE wf.form_czech % $query
   OR unaccent(wf.form_czech) ILIKE unaccent($query) || '%'
ORDER BY rank, sim DESC
LIMIT 10;
```

### Multiple Valid Forms (Option A: Separate Rows)

When a grammatical slot has multiple valid forms (e.g., "svoje" and "svá" for feminine nominative), store as separate rows:

```
word_forms:
  | id | root_word_id | form_czech | form_type_id | is_primary | gender | plurality |
  |----|--------------|------------|--------------|------------|--------|-----------|
  | 1  | 10           | svoje      | nominative   | true       | fem    | singular  |
  | 2  | 10           | svá        | nominative   | false      | fem    | singular  |
```

**Updated word_forms schema:**

```
word_forms
  ├── id (PK)
  ├── root_word_id (FK → root_words)
  ├── form_czech (text)
  ├── form_type_id (FK → form_types)
  ├── is_primary (boolean, default true) - primary form shown first
  ├── gender (enum, nullable)
  ├── plurality (enum)
  ├── person (enum, nullable)
  └── tense (enum, nullable)
```

**Benefits:**

- Both forms are indexed and searchable
- Clear indication of which is more common (is_primary)
- No JSON parsing needed
- Practice mode can test either form as correct

### Word Families

For related/derived words (dům → domek, domov, domácí):

```
word_families
  ├── id (PK)
  ├── base_word_id (FK → root_words)
  ├── derived_word_id (FK → root_words)
  └── relationship (enum)

relationship enum:
  - diminutive (dům → domek, pes → pejsek)
  - augmentative (dům → domisko)
  - derived_noun (bydlet → bydlení, psát → psaní)
  - derived_adjective (dům → domácí, město → městský)
  - derived_verb (práce → pracovat)
  - derived_adverb (rychlý → rychle)
  - prefixed (psát → napsat, přepsat, dopsat)
  - negation (možný → nemožný)
```

**Example data:**

| base_word       | derived_word | relationship      |
| --------------- | ------------ | ----------------- |
| dům (house)     | domek        | diminutive        |
| dům (house)     | domov        | derived_noun      |
| dům (house)     | domácí       | derived_adjective |
| psát (to write) | napsat       | prefixed          |
| psát (to write) | písař        | derived_noun      |
| rychlý (fast)   | rychle       | derived_adverb    |

**Dictionary UI usage:**

- When viewing "dům", show related words section
- Help learners build vocabulary through word families
- Understand how Czech word formation works

### User Features

**Save to vocabulary:**
One-click from dictionary → `profile_words` for practice.

**Search history:**

```
search_history
  ├── id (PK)
  ├── profile_id (FK → profiles)
  ├── query (text)
  ├── selected_root_word_id (FK → root_words, nullable)
  └── created_at (timestamp)
```

### AI Data Generation & Validation

Since dictionary data will be primarily AI-generated with manual curation:

**Data validation flags:**

```
root_words (add columns)
  ├── ...existing columns...
  ├── is_verified (boolean, default false)
  ├── verified_by (FK → profiles, nullable)
  ├── verified_at (timestamp, nullable)
  └── source (enum: ai_generated, manual, imported)

word_forms (add columns)
  ├── ...existing columns...
  ├── is_verified (boolean, default false)
  └── source (enum: ai_generated, manual, imported)
```

**Workflow:**

1. AI generates word with all forms
2. Data enters as `is_verified = false, source = ai_generated`
3. Admin reviews and marks `is_verified = true`
4. UI can optionally flag unverified entries to users

**Validation queries:**

```sql
-- Words needing review
SELECT * FROM root_words WHERE NOT is_verified ORDER BY created_at;

-- Verification progress
SELECT
  COUNT(*) FILTER (WHERE is_verified) AS verified,
  COUNT(*) AS total
FROM root_words;
```

---

## Practice & Progress Tracking

### Current Problems

**1. JSON aggregation is fragile**

Storing `error_map` and `success_map` as JSON, then summing on frontend:

```json
{"accusative": 0, "dative": 0, "genitive": 2, ...}
```

This likely causes the negative proficiency bug - complex parsing/merging logic is error-prone.

**2. Tracking is per-quiz, not per-attempt**

Each `declension_scores` row = one quiz session. Lost granularity:

- Which specific words did the user struggle with?
- Was it genitive singular or plural?
- Performance trend within a session?

**3. No spaced repetition**

`practice_count` just increments. No tracking of:

- When was it last practiced?
- How well did they know it?
- When should they review next?

**4. Declension-only**

The maps track cases but not verb conjugations. Can't track "user struggles with 3rd person plural."

**5. Familiarity vs Mastery is implicit**

Buried in `difficulty` field across aggregated quiz data. Can't easily answer: "What's mastery level for genitive specifically?"

### Proposed Solution

**Core idea: Track individual attempts, derive everything else**

```
practice_attempts
  ├── id (PK)
  ├── profile_id (FK → profiles)
  ├── word_form_id (FK → word_forms)
  ├── difficulty (enum: easy, hard)
  ├── was_correct (boolean)
  ├── response_time_ms (int, nullable)
  └── created_at (timestamp)

user_word_progress
  ├── profile_id (FK → profiles)
  ├── word_form_id (FK → word_forms)
  ├── next_review_at (timestamp)
  ├── interval_days (int)
  ├── ease_factor (float) - SM-2 algorithm
  ├── consecutive_correct (int)
  ├── familiarity_score (float) - from easy attempts
  └── mastery_score (float) - from hard attempts

  PRIMARY KEY (profile_id, word_form_id)
```

### What This Enables

| Question                     | Query approach                                |
| ---------------------------- | --------------------------------------------- |
| User's genitive proficiency? | Aggregate attempts WHERE form_type = genitive |
| Words needing review?        | `WHERE next_review_at <= now()`               |
| Progress over time?          | Group attempts by week                        |
| Verb struggles?              | Filter word_type = verb, group by form_type   |
| Easy vs hard performance?    | Filter by difficulty                          |

### Spaced Repetition (SM-2)

After each attempt, update `user_word_progress`:

- **Correct:** interval increases (1 → 3 → 7 → 14 → 30 days)
- **Wrong:** interval resets to 1 day
- `ease_factor` adjusts based on consistent performance

### Resolving Open Question #2

> Do we need `word_forms.form_key` for programmatic lookup?

**Answer: Not necessarily.** With `practice_attempts.word_form_id`, we have direct reference to the specific form. Statistics can be grouped by joining to `form_types`:

```sql
-- Get user's success rate per grammatical category
SELECT
  ft.category,
  ft.name,
  COUNT(*) FILTER (WHERE pa.was_correct) AS correct,
  COUNT(*) AS total
FROM practice_attempts pa
JOIN word_forms wf ON pa.word_form_id = wf.id
JOIN form_types ft ON wf.form_type_id = ft.id
WHERE pa.profile_id = $1
GROUP BY ft.category, ft.name;
```

A composite `form_key` would be redundant since the data is already normalized.

---

---

## Existing Tables: Keep, Replace, or Delete

| Current Table       | Decision                  | Replacement                                | Reason                                                                         |
| ------------------- | ------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| `root_words`        | **Modify**                | -                                          | Add `aspect`, `is_verified`, `source` columns. Remove `declension_table` JSON. |
| `pronouns`          | **Delete**                | `word_forms` + `example_sentences`         | Data migrates to new structure                                                 |
| `profile_words`     | **Replace**               | `user_vocabulary`                          | Remove duplication, link to dictionary                                         |
| `paragraphs`        | **Keep**                  | -                                          | Writing practice feature, still needed                                         |
| `labels`            | **Keep** (unused for now) | -                                          | May be useful later                                                            |
| `declension_scores` | **Replace**               | `practice_attempts` + `user_word_progress` | Granular tracking                                                              |
| `writing_scores`    | **Keep**                  | -                                          | Writing practice feature, still needed                                         |
| `profiles`          | **Keep**                  | -                                          | No changes needed                                                              |

### user_vocabulary (replaces profile_words)

Simple bookmarks table:

```
user_vocabulary
  ├── profile_id (FK → profiles) ─┬─ composite PK
  ├── root_word_id (FK → root_words) ─┘
  └── created_at (timestamp)
```

All word data (translations, forms, examples) comes from `root_words` and `word_forms` via the foreign key. No duplication.

---

## Migration Considerations

### What happens to existing data?

1. **`root_words.declension_table` JSON** → Extract into `word_forms` rows
2. **`pronouns` table** → Merge into `word_forms` + `example_sentences`
3. **`profile_words`** → Migrate to `user_vocabulary` (map `in_czech` to `root_word_id`)
4. **`declension_scores`** → Optionally migrate to `practice_attempts` or start fresh

### Backward compatibility

The old tables can remain temporarily during migration, then be dropped once data is transferred and the app is updated.

---

## Open Questions

1. ~~Should `form_type` be an enum or free text?~~ **Resolved:** `form_types` is now a table with educational content (description, explanation for learners).

2. Do we need a `word_forms.form_key` column for programmatic lookup (e.g., "singular.genitive.masculine")? **Deferred:** Revisit when discussing practice mode and progress tracking.

3. ~~How should verb aspects be linked?~~ **Resolved:** `verb_aspect_pairs` table explicitly links imperfective → perfective with support for one-to-many relationships and nuance notes.

4. ~~What `category` values should `form_types` support?~~ **Resolved:** See "form_types categories" section below.

5. ~~Should `form_types.explanation` support rich text/markdown for formatting?~~ **Resolved:** Yes, markdown supported.

---

## form_types categories

The `category` enum defines what grammatical system a form_type belongs to:

### category: `case` (7 Czech cases)

For nouns, pronouns, adjectives, numerals.

| name         | description                     | explanation (excerpt)                                                                        |
| ------------ | ------------------------------- | -------------------------------------------------------------------------------------------- |
| nominative   | Subject of sentence             | The nominative case is the "dictionary form" and marks the subject...                        |
| genitive     | Possession, absence, quantities | Used for possession (_Petrova kniha_), after prepositions (do, z, bez, od), with negation... |
| dative       | Indirect object, recipient      | Marks the indirect object - who receives something (_Dám to Petrovi_)...                     |
| accusative   | Direct object, direction        | Marks what the verb acts upon (_Vidím psa_), direction with motion verbs...                  |
| vocative     | Direct address                  | Used when calling someone directly (_Petře! Mami!_)...                                       |
| locative     | Location (with preposition)     | Always used with a preposition (v, na, o, při) to indicate location...                       |
| instrumental | Means, accompaniment            | Indicates "by means of" (_psát perem_) or "together with" (_s Petrem_)...                    |

### category: `mood` (3 Czech moods)

For verbs - how the action relates to reality.

| name        | description                    | explanation (markdown excerpt)                                                                                                                                                                                                  |
| ----------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| indicative  | Statements of fact             | The "default" mood for stating facts and asking questions.\n\n**Examples:**\n- _Píšu dopis._ (I'm writing a letter.)\n- _Včera pršelo._ (It rained yesterday.)                                                                  |
| imperative  | Commands and requests          | Expresses commands, requests, instructions. Three forms:\n\n**2nd person singular (ty):** _Piš!_ (Write!)\n**1st person plural (my):** _Pišme!_ (Let's write!)\n**2nd person plural/formal (vy):** _Pište!_ (Write!)            |
| conditional | Hypotheticals, polite requests | Expresses wishes, hypothetical situations, polite requests.\n\nFormed with **bych/bys/by/bychom/byste/by** + past participle.\n\n- _Psal bych dopis._ (I would write a letter.)\n- _Mohl byste mi pomoct?_ (Could you help me?) |

### category: `tense` (3 main tenses)

For verbs - when the action occurs.

| name    | description                 | explanation (excerpt)                                                                                      |
| ------- | --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| present | Current or habitual actions | Used for actions happening now or habitually. No distinction between "I go" and "I am going"...            |
| past    | Completed past actions      | Formed with l-participle + (optional) být. _Psal jsem._ (I wrote/was writing.)...                          |
| future  | Future actions              | Imperfective: _budu + infinitive_ (_budu psát_). Perfective: present form has future meaning (_napíšu_)... |

### category: `voice` (2 voices)

For verbs - relationship between subject and action.

| name    | description             | explanation (excerpt)                                                                                                    |
| ------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| active  | Subject performs action | The subject does the action. _Petr píše dopis._ (Petr writes a letter.)                                                  |
| passive | Subject receives action | The subject receives the action. Formed with _být_ + passive participle. _Dopis je psán._ (The letter is being written.) |

### category: `participle` (verbal adjective forms)

Special verb forms that function as adjectives or in compound tenses.

| name                  | description                 | explanation (excerpt)                                                     |
| --------------------- | --------------------------- | ------------------------------------------------------------------------- |
| past_participle       | L-participle for past tense | The main component of past tense. _psal, psala, psalo_ (masc/fem/neut)... |
| passive_participle    | For passive voice           | Used with _být_ to form passive. _psán, psána, psáno_...                  |
| present_transgressive | "While doing" (archaic)     | Literary/formal. _píšíc_ (while writing). Rare in spoken Czech...         |
| past_transgressive    | "Having done" (archaic)     | Literary/formal. _napsav_ (having written). Rare in spoken Czech...       |

### category: `verbal_noun`

Nouns derived from verbs.

| name        | description      | explanation (excerpt)                                               |
| ----------- | ---------------- | ------------------------------------------------------------------- |
| verbal_noun | Action as a noun | The act of doing something. _psaní_ (writing), _čtení_ (reading)... |

---

## Example: Complete word_forms for verb "psát"

```
root_words:
  id: 15, in_czech: "psát", in_english: "to write", word_type: verb, aspect: imperfective

word_forms:
  | form_czech | form_type (name) | category    | person | plurality | gender |
  |------------|------------------|-------------|--------|-----------|--------|
  | píšu       | present          | tense       | 1st    | singular  | null   |
  | píšeš      | present          | tense       | 2nd    | singular  | null   |
  | píše       | present          | tense       | 3rd    | singular  | null   |
  | píšeme     | present          | tense       | 1st    | plural    | null   |
  | píšete     | present          | tense       | 2nd    | plural    | null   |
  | píšou      | present          | tense       | 3rd    | plural    | null   |
  | psal       | past_participle  | participle  | null   | singular  | masc   |
  | psala      | past_participle  | participle  | null   | singular  | fem    |
  | psalo      | past_participle  | participle  | null   | singular  | neut   |
  | psali      | past_participle  | participle  | null   | plural    | masc   |
  | psaly      | past_participle  | participle  | null   | plural    | fem    |
  | piš        | imperative       | mood        | 2nd    | singular  | null   |
  | pišme      | imperative       | mood        | 1st    | plural    | null   |
  | pište      | imperative       | mood        | 2nd    | plural    | null   |
  | psán       | passive_participle| participle | null   | singular  | masc   |
  | psána      | passive_participle| participle | null   | singular  | fem    |
  | psáno      | passive_participle| participle | null   | singular  | neut   |
  | psaní      | verbal_noun      | verbal_noun | null   | null      | neut   |
```
