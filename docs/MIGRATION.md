# Database Migration Guide

Fresh setup for the new database structure. No data migration - starting from scratch.

## Overview

### Tables to Create

1. `form_types` - grammatical categories with educational content
2. `root_words` - base dictionary entries (modified from existing)
3. `word_forms` - all inflected forms
4. `example_sentences` - examples per word form
5. `verb_aspect_pairs` - perfective/imperfective links
6. `word_families` - derived word relationships
7. `user_vocabulary` - user bookmarks
8. `practice_attempts` - individual practice records
9. `user_word_progress` - spaced repetition state
10. `search_history` - user search tracking

### Tables to Drop

- `pronouns` (replaced by word_forms + example_sentences)
- `profile_words` (replaced by user_vocabulary)
- `declension_scores` (replaced by practice_attempts + user_word_progress)

### Tables to Keep (unchanged)

- `profiles`
- `paragraphs`
- `labels`
- `writing_scores`

---

## Step 1: Create New Enums

```sql
-- Verb aspect
CREATE TYPE aspect AS ENUM ('perfective', 'imperfective', 'bi_aspectual');

-- Form type categories
CREATE TYPE form_category AS ENUM (
  'case',
  'mood',
  'tense',
  'voice',
  'participle',
  'verbal_noun'
);

-- Word family relationships
CREATE TYPE word_relationship AS ENUM (
  'diminutive',
  'augmentative',
  'derived_noun',
  'derived_adjective',
  'derived_verb',
  'derived_adverb',
  'prefixed',
  'negation'
);

-- Data source tracking
CREATE TYPE data_source AS ENUM ('ai_generated', 'manual', 'imported');

-- Grammatical person (for verbs)
CREATE TYPE grammatical_person AS ENUM ('1st', '2nd', '3rd');
```

---

## Step 2: Create Extensions (if not exists)

```sql
-- For fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- For diacritic-insensitive search
CREATE EXTENSION IF NOT EXISTS unaccent;
```

---

## Step 3: Create form_types Table

```sql
CREATE TABLE form_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category form_category NOT NULL,
  description TEXT NOT NULL,
  explanation TEXT NOT NULL, -- Supports markdown
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX idx_form_types_category ON form_types(category);
```

### Seed form_types data

```sql
-- Cases
INSERT INTO form_types (name, category, description, explanation) VALUES
('nominative', 'case', 'Subject of sentence', 'The nominative case is the "dictionary form" and marks the subject of a sentence.

**Examples:**
- *Pes běží.* (The dog runs.)
- *Kniha je na stole.* (The book is on the table.)'),

('genitive', 'case', 'Possession, absence, quantities', 'The genitive case shows possession, is used after certain prepositions, with negation, and with quantities.

**Common prepositions:** do, z, od, bez, u, kolem

**Examples:**
- *Petrova kniha* (Peter''s book)
- *bez peněz* (without money)
- *hodně lidí* (many people)'),

('dative', 'case', 'Indirect object, recipient', 'The dative case marks the indirect object - who receives something.

**Common prepositions:** k, kvůli, díky, naproti

**Examples:**
- *Dám to Petrovi.* (I''ll give it to Peter.)
- *Pomoz mi.* (Help me.)'),

('accusative', 'case', 'Direct object, direction', 'The accusative case marks the direct object and is used with motion verbs for direction.

**Common prepositions:** na, pro, za, přes, v (with motion)

**Examples:**
- *Vidím psa.* (I see the dog.)
- *Jdu do města.* (I''m going to the city.)'),

('vocative', 'case', 'Direct address', 'The vocative case is used when directly addressing someone.

**Examples:**
- *Petře!* (Peter!)
- *Mami!* (Mom!)
- *Pane doktore!* (Doctor!)'),

('locative', 'case', 'Location (with preposition)', 'The locative case is always used with a preposition to indicate location.

**Prepositions:** v, na, o, při, po

**Examples:**
- *v domě* (in the house)
- *na stole* (on the table)
- *o problému* (about the problem)'),

('instrumental', 'case', 'Means, accompaniment', 'The instrumental case indicates "by means of" or "together with."

**Common prepositions:** s, před, za, nad, pod, mezi

**Examples:**
- *psát perem* (to write with a pen)
- *s Petrem* (with Peter)
- *před domem* (in front of the house)');

-- Moods
INSERT INTO form_types (name, category, description, explanation) VALUES
('indicative', 'mood', 'Statements of fact', 'The indicative mood is the "default" mood for stating facts and asking questions.

**Examples:**
- *Píšu dopis.* (I''m writing a letter.)
- *Včera pršelo.* (It rained yesterday.)
- *Přijdeš zítra?* (Will you come tomorrow?)'),

('imperative', 'mood', 'Commands and requests', 'The imperative mood expresses commands, requests, or instructions.

**Forms:**
- **2nd person singular (ty):** *Piš!* (Write!)
- **1st person plural (my):** *Pišme!* (Let''s write!)
- **2nd person plural/formal (vy):** *Pište!* (Write!)'),

('conditional', 'mood', 'Hypotheticals, polite requests', 'The conditional mood expresses wishes, hypothetical situations, and polite requests.

Formed with **bych/bys/by/bychom/byste/by** + past participle.

**Examples:**
- *Psal bych dopis.* (I would write a letter.)
- *Kdybych měl čas, přišel bych.* (If I had time, I would come.)
- *Mohl byste mi pomoct?* (Could you help me?)

| Person | Singular | Plural |
|--------|----------|--------|
| 1st | bych | bychom |
| 2nd | bys | byste |
| 3rd | by | by |');

-- Tenses
INSERT INTO form_types (name, category, description, explanation) VALUES
('present', 'tense', 'Current or habitual actions', 'Czech present tense is used for actions happening now or habitually.

**Note:** No distinction between "I go" and "I am going."

**Examples:**
- *Píšu.* (I write / I am writing.)
- *Každý den čtu.* (I read every day.)'),

('past', 'tense', 'Completed past actions', 'The past tense is formed with the l-participle, optionally with forms of *být*.

**Examples:**
- *Psal jsem.* (I wrote / I was writing.)
- *Přišla.* (She came.)
- *Viděli jsme to.* (We saw it.)'),

('future', 'tense', 'Future actions', 'Future tense formation depends on aspect:

**Imperfective verbs:** *budu* + infinitive
- *Budu psát.* (I will write / I will be writing.)

**Perfective verbs:** Present form has future meaning
- *Napíšu.* (I will write.)');

-- Voice
INSERT INTO form_types (name, category, description, explanation) VALUES
('active', 'voice', 'Subject performs action', 'The subject performs the action.

**Example:**
- *Petr píše dopis.* (Peter writes a letter.)'),

('passive', 'voice', 'Subject receives action', 'The subject receives the action. Formed with *být* + passive participle.

**Examples:**
- *Dopis je psán.* (The letter is being written.)
- *Dům byl postaven.* (The house was built.)');

-- Participles
INSERT INTO form_types (name, category, description, explanation) VALUES
('past_participle', 'participle', 'L-participle for past tense', 'The main component of past tense. Agrees in gender and number.

**Example for psát:**
| | Singular | Plural |
|---|----------|--------|
| Masc | psal | psali |
| Fem | psala | psaly |
| Neut | psalo | psala |'),

('passive_participle', 'participle', 'For passive voice', 'Used with *být* to form passive voice.

**Example for psát:** psán, psána, psáno'),

('present_transgressive', 'participle', '"While doing" (literary)', 'Literary/formal form meaning "while doing."

**Example:** *píšíc* (while writing)

Rare in spoken Czech.'),

('past_transgressive', 'participle', '"Having done" (literary)', 'Literary/formal form meaning "having done."

**Example:** *napsav* (having written)

Rare in spoken Czech.');

-- Verbal noun
INSERT INTO form_types (name, category, description, explanation) VALUES
('verbal_noun', 'verbal_noun', 'Action as a noun', 'The act of doing something, formed from verbs.

**Examples:**
- *psaní* (writing)
- *čtení* (reading)
- *učení* (learning/teaching)');
```

---

## Step 4: Modify root_words Table

```sql
-- Add new columns to existing root_words
ALTER TABLE root_words
  ADD COLUMN aspect aspect,
  ADD COLUMN is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN verified_by UUID REFERENCES profiles(id),
  ADD COLUMN verified_at TIMESTAMPTZ,
  ADD COLUMN source data_source DEFAULT 'ai_generated';

-- Drop the JSON column (do this AFTER data is migrated if needed)
ALTER TABLE root_words DROP COLUMN declension_table;

-- Update word_types enum to include verb
ALTER TYPE word_types ADD VALUE IF NOT EXISTS 'verb';
ALTER TYPE word_types ADD VALUE IF NOT EXISTS 'adverb';
ALTER TYPE word_types ADD VALUE IF NOT EXISTS 'preposition';
ALTER TYPE word_types ADD VALUE IF NOT EXISTS 'conjunction';
ALTER TYPE word_types ADD VALUE IF NOT EXISTS 'numeral';
```

---

## Step 5: Create word_forms Table

```sql
CREATE TABLE word_forms (
  id SERIAL PRIMARY KEY,
  root_word_id INTEGER NOT NULL REFERENCES root_words(id) ON DELETE CASCADE,
  form_czech TEXT NOT NULL,
  form_type_id INTEGER NOT NULL REFERENCES form_types(id),
  is_primary BOOLEAN DEFAULT TRUE,
  gender gender,
  plurality plurality,
  person grammatical_person,
  tense TEXT, -- Using TEXT for flexibility (present, past, future)
  is_verified BOOLEAN DEFAULT FALSE,
  source data_source DEFAULT 'ai_generated',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for search
CREATE INDEX idx_word_forms_root ON word_forms(root_word_id);
CREATE INDEX idx_word_forms_form_type ON word_forms(form_type_id);
CREATE INDEX idx_word_forms_czech ON word_forms(form_czech);

-- Trigram index for fuzzy search
CREATE INDEX idx_word_forms_czech_trgm ON word_forms USING gin(form_czech gin_trgm_ops);

-- Unaccent + trigram for diacritic-insensitive fuzzy search
CREATE INDEX idx_word_forms_czech_unaccent ON word_forms USING gin(unaccent(form_czech) gin_trgm_ops);
```

---

## Step 6: Create example_sentences Table

```sql
CREATE TABLE example_sentences (
  id SERIAL PRIMARY KEY,
  word_form_id INTEGER NOT NULL REFERENCES word_forms(id) ON DELETE CASCADE,
  czech_sentence TEXT NOT NULL,
  english_sentence TEXT NOT NULL,
  explanation TEXT, -- Why this form is used here
  is_verified BOOLEAN DEFAULT FALSE,
  source data_source DEFAULT 'ai_generated',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_example_sentences_word_form ON example_sentences(word_form_id);
```

---

## Step 7: Create verb_aspect_pairs Table

```sql
CREATE TABLE verb_aspect_pairs (
  id SERIAL PRIMARY KEY,
  imperfective_id INTEGER NOT NULL REFERENCES root_words(id) ON DELETE CASCADE,
  perfective_id INTEGER NOT NULL REFERENCES root_words(id) ON DELETE CASCADE,
  notes TEXT, -- For nuance differences
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(imperfective_id, perfective_id)
);

CREATE INDEX idx_verb_aspect_imperfective ON verb_aspect_pairs(imperfective_id);
CREATE INDEX idx_verb_aspect_perfective ON verb_aspect_pairs(perfective_id);
```

---

## Step 8: Create word_families Table

```sql
CREATE TABLE word_families (
  id SERIAL PRIMARY KEY,
  base_word_id INTEGER NOT NULL REFERENCES root_words(id) ON DELETE CASCADE,
  derived_word_id INTEGER NOT NULL REFERENCES root_words(id) ON DELETE CASCADE,
  relationship word_relationship NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(base_word_id, derived_word_id)
);

CREATE INDEX idx_word_families_base ON word_families(base_word_id);
CREATE INDEX idx_word_families_derived ON word_families(derived_word_id);
```

---

## Step 9: Create user_vocabulary Table

```sql
CREATE TABLE user_vocabulary (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  root_word_id INTEGER NOT NULL REFERENCES root_words(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (profile_id, root_word_id)
);

CREATE INDEX idx_user_vocabulary_profile ON user_vocabulary(profile_id);
```

---

## Step 10: Create practice_attempts Table

```sql
CREATE TABLE practice_attempts (
  id SERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  word_form_id INTEGER NOT NULL REFERENCES word_forms(id) ON DELETE CASCADE,
  difficulty difficulties NOT NULL,
  was_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_practice_attempts_profile ON practice_attempts(profile_id);
CREATE INDEX idx_practice_attempts_word_form ON practice_attempts(word_form_id);
CREATE INDEX idx_practice_attempts_created ON practice_attempts(created_at);
```

---

## Step 11: Create user_word_progress Table

```sql
CREATE TABLE user_word_progress (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  word_form_id INTEGER NOT NULL REFERENCES word_forms(id) ON DELETE CASCADE,
  next_review_at TIMESTAMPTZ,
  interval_days INTEGER DEFAULT 1,
  ease_factor REAL DEFAULT 2.5, -- SM-2 algorithm
  consecutive_correct INTEGER DEFAULT 0,
  familiarity_score REAL DEFAULT 0, -- From easy attempts
  mastery_score REAL DEFAULT 0, -- From hard attempts
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (profile_id, word_form_id)
);

CREATE INDEX idx_user_word_progress_review ON user_word_progress(profile_id, next_review_at);
```

---

## Step 12: Create search_history Table

```sql
CREATE TABLE search_history (
  id SERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  selected_root_word_id INTEGER REFERENCES root_words(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_history_profile ON search_history(profile_id);
CREATE INDEX idx_search_history_created ON search_history(created_at);
```

---

## Step 13: Drop Old Tables

Only do this after confirming the new structure works:

```sql
-- Drop old tables
DROP TABLE IF EXISTS pronouns;
DROP TABLE IF EXISTS profile_words;
DROP TABLE IF EXISTS declension_scores;

-- Drop unused enums (optional)
DROP TYPE IF EXISTS declensions; -- Replaced by form_types table
```

---

## Step 14: Create Helper Functions

### Get words due for review

```sql
CREATE OR REPLACE FUNCTION get_words_for_review(
  p_profile_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  word_form_id INTEGER,
  form_czech TEXT,
  root_word_czech TEXT,
  root_word_english TEXT,
  form_type_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wf.id,
    wf.form_czech,
    rw.in_czech,
    rw.in_english,
    ft.name
  FROM user_word_progress uwp
  JOIN word_forms wf ON uwp.word_form_id = wf.id
  JOIN root_words rw ON wf.root_word_id = rw.id
  JOIN form_types ft ON wf.form_type_id = ft.id
  WHERE uwp.profile_id = p_profile_id
    AND uwp.next_review_at <= NOW()
  ORDER BY uwp.next_review_at
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

### Update progress after practice (SM-2 algorithm)

```sql
CREATE OR REPLACE FUNCTION update_word_progress(
  p_profile_id UUID,
  p_word_form_id INTEGER,
  p_was_correct BOOLEAN,
  p_difficulty difficulties
)
RETURNS VOID AS $$
DECLARE
  v_ease REAL;
  v_interval INTEGER;
  v_consecutive INTEGER;
BEGIN
  -- Get current values or defaults
  SELECT
    COALESCE(ease_factor, 2.5),
    COALESCE(interval_days, 1),
    COALESCE(consecutive_correct, 0)
  INTO v_ease, v_interval, v_consecutive
  FROM user_word_progress
  WHERE profile_id = p_profile_id AND word_form_id = p_word_form_id;

  -- If no row exists, use defaults
  IF NOT FOUND THEN
    v_ease := 2.5;
    v_interval := 1;
    v_consecutive := 0;
  END IF;

  IF p_was_correct THEN
    -- Increase interval
    v_consecutive := v_consecutive + 1;
    IF v_consecutive = 1 THEN
      v_interval := 1;
    ELSIF v_consecutive = 2 THEN
      v_interval := 3;
    ELSE
      v_interval := ROUND(v_interval * v_ease);
    END IF;
    -- Slightly increase ease
    v_ease := LEAST(v_ease + 0.1, 3.0);
  ELSE
    -- Reset on wrong answer
    v_consecutive := 0;
    v_interval := 1;
    -- Decrease ease
    v_ease := GREATEST(v_ease - 0.2, 1.3);
  END IF;

  -- Upsert progress
  INSERT INTO user_word_progress (
    profile_id, word_form_id, next_review_at, interval_days,
    ease_factor, consecutive_correct, updated_at
  )
  VALUES (
    p_profile_id, p_word_form_id, NOW() + (v_interval || ' days')::INTERVAL,
    v_interval, v_ease, v_consecutive, NOW()
  )
  ON CONFLICT (profile_id, word_form_id)
  DO UPDATE SET
    next_review_at = NOW() + (v_interval || ' days')::INTERVAL,
    interval_days = v_interval,
    ease_factor = v_ease,
    consecutive_correct = v_consecutive,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

### Dictionary search

```sql
CREATE OR REPLACE FUNCTION search_dictionary(
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  root_word_id INTEGER,
  root_word_czech TEXT,
  root_word_english TEXT,
  word_type word_types,
  matched_form TEXT,
  form_type_name TEXT,
  rank INTEGER,
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (rw.id)
    rw.id,
    rw.in_czech,
    rw.in_english,
    rw.word_type,
    wf.form_czech,
    ft.name,
    CASE
      WHEN wf.form_czech = p_query THEN 1
      WHEN wf.form_czech ILIKE p_query || '%' THEN 2
      WHEN unaccent(wf.form_czech) ILIKE unaccent(p_query) || '%' THEN 3
      ELSE 4
    END AS rank,
    similarity(wf.form_czech, p_query)
  FROM word_forms wf
  JOIN root_words rw ON wf.root_word_id = rw.id
  JOIN form_types ft ON wf.form_type_id = ft.id
  WHERE wf.form_czech % p_query
     OR unaccent(wf.form_czech) ILIKE unaccent(p_query) || '%'
  ORDER BY rw.id, rank, similarity(wf.form_czech, p_query) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

---

## Execution Order Summary

1. Create new enums
2. Create extensions (pg_trgm, unaccent)
3. Create form_types + seed data
4. Modify root_words (add columns, extend enum)
5. Create word_forms
6. Create example_sentences
7. Create verb_aspect_pairs
8. Create word_families
9. Create user_vocabulary
10. Create practice_attempts
11. Create user_word_progress
12. Create search_history
13. Drop old tables (pronouns, profile_words, declension_scores)
14. Create helper functions

---

## Verification Queries

After migration, verify the structure:

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check form_types has data
SELECT COUNT(*) FROM form_types;

-- Test search function
SELECT * FROM search_dictionary('dom');

-- Check indexes exist
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;
```
