# Word Generation Workflow

Automated workflow for populating the dictionary using AI generation with human review.

## Overview

```
┌─────────────────┐
│  Telegram       │  You send: "dům | house | noun | masculine_inanimate"
│  Input          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  n8n + Claude   │  Generates all forms + examples as structured JSON
│  Generation     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase       │  Insert with is_verified: false
│  (staging)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Slovi Admin    │  Review in table UI, edit forms, mark verified
│  /admin page    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Telegram       │  Optional: notification when batch is ready for review
│  (notification) │
└─────────────────┘
```

**Key principle:** Telegram for simple triggers, Admin UI for editing.

---

## Input Format

### Via Telegram Message

**Simple (recommended):**
Just send the Czech word. AI will translate and detect word type.

```
dům
```

**Override format (if AI gets it wrong):**

```
{czech} | {english} | {word_type} | {gender_or_aspect}
```

**Word type options:**

- `noun` - requires gender (masculine_animate, masculine_inanimate, feminine, neuter)
- `verb` - requires aspect (perfective, imperfective)
- `adjective` - no additional field needed
- `pronoun` - specify subtype (personal, possessive, demonstrative)
- `adverb` - no additional field needed
- `preposition` - no additional field needed

**Override examples:**

```
dům | house | noun | masculine_inanimate
psát | to write | verb | imperfective
rychlý | fast | adjective
```

---

## AI Generation

### Claude API Configuration

**Model:** claude-sonnet-4-20250514 (good balance of quality/cost)
**Max tokens:** 4096
**Temperature:** 0.3 (lower for consistency)

### Step 1: Translation & Detection Prompt

Used when user sends just a Czech word. Quick, cheap call to get translation and word type.

```
You are a Czech language expert. Analyze this Czech word and provide its translation and grammatical classification.

Word: {{czech_word}}

Return a JSON object with this exact structure. Do not include any text outside the JSON.

{
  "in_czech": "{{czech_word}}",
  "in_english": "primary English translation",
  "word_type": "noun|verb|adjective|pronoun|adverb|preposition|conjunction|numeral",
  "gender": "masculine_animate|masculine_inanimate|feminine|neuter|null",
  "aspect": "perfective|imperfective|null",
  "pronoun_type": "personal|possessive|demonstrative|null",
  "confidence": "high|medium|low",
  "notes": "any relevant notes about this word, or null"
}

Rules:
- gender is only for nouns and pronouns
- aspect is only for verbs
- pronoun_type is only for pronouns
- Set unused fields to null
- If the word has multiple meanings, use the most common one
- Set confidence to "low" if the word is ambiguous or uncommon
```

**Example response:**

```json
{
  "in_czech": "dům",
  "in_english": "house",
  "word_type": "noun",
  "gender": "masculine_inanimate",
  "aspect": null,
  "pronoun_type": null,
  "confidence": "high",
  "notes": null
}
```

### Step 2: Full Generation Prompts

After user confirms, use the appropriate prompt based on word_type.

### Prompt Template: Nouns

```
You are a Czech language expert. Generate all grammatical forms for this noun.

Word: {{czech_word}}
Translation: {{english_translation}}
Gender: {{gender}}

Return a JSON object with this exact structure. Do not include any text outside the JSON.

{
  "root_word": {
    "in_czech": "{{czech_word}}",
    "in_english": "{{english_translation}}",
    "word_type": "noun",
    "gender": "{{gender}}"
  },
  "forms": [
    {
      "form_czech": "string",
      "case": "nominative|genitive|dative|accusative|vocative|locative|instrumental",
      "plurality": "singular|plural",
      "is_primary": true,
      "example": {
        "czech": "Example sentence using this form.",
        "english": "English translation.",
        "explanation": "Brief explanation of why this case is used here."
      }
    }
  ]
}

Requirements:
1. Include all 7 cases for both singular and plural (14 forms minimum)
2. If a form has common alternatives (e.g., "domech" and "domích" for locative plural), include both with is_primary: true for the more common one
3. Every form MUST have a unique example sentence demonstrating that specific case
4. Explanations should be concise (1 sentence) explaining why that case is used
5. Use natural, common Czech sentences - not contrived examples
6. For vocative, use realistic forms of address

Cases to include:
- nominative (subject)
- genitive (possession, quantities, prepositions: z, do, od, bez, u)
- dative (indirect object, prepositions: k, díky, kvůli)
- accusative (direct object, direction, prepositions: na, pro, za, přes)
- vocative (direct address)
- locative (location, always with preposition: v, na, o, při)
- instrumental (means, accompaniment, prepositions: s, před, za, nad, pod)
```

### Prompt Template: Verbs

```
You are a Czech language expert. Generate all grammatical forms for this verb.

Word: {{czech_word}}
Translation: {{english_translation}}
Aspect: {{aspect}}

Return a JSON object with this exact structure. Do not include any text outside the JSON.

{
  "root_word": {
    "in_czech": "{{czech_word}}",
    "in_english": "{{english_translation}}",
    "word_type": "verb",
    "aspect": "{{aspect}}"
  },
  "forms": [
    {
      "form_czech": "string",
      "form_type": "present|past_participle|imperative|passive_participle|verbal_noun",
      "person": "1st|2nd|3rd|null",
      "plurality": "singular|plural",
      "gender": "masculine|feminine|neuter|null",
      "is_primary": true,
      "example": {
        "czech": "Example sentence.",
        "english": "Translation.",
        "explanation": "Brief explanation."
      }
    }
  ]
}

Requirements:
1. Present tense: all 6 forms (3 persons × 2 numbers)
2. Past participle (l-form): 5 forms (masc.sg, fem.sg, neut.sg, masc.pl, fem/neut.pl)
3. Imperative: 3 forms (2nd sg, 1st pl, 2nd pl)
4. Passive participle: if applicable
5. Verbal noun: e.g., "psaní" for "psát"
6. Each form needs a unique example sentence
7. For perfective verbs, present forms have future meaning - reflect this in examples
```

### Prompt Template: Adjectives

```
You are a Czech language expert. Generate all grammatical forms for this adjective.

Word: {{czech_word}}
Translation: {{english_translation}}

Return a JSON object with this exact structure. Do not include any text outside the JSON.

{
  "root_word": {
    "in_czech": "{{czech_word}}",
    "in_english": "{{english_translation}}",
    "word_type": "adjective"
  },
  "forms": [
    {
      "form_czech": "string",
      "case": "nominative|genitive|dative|accusative|locative|instrumental",
      "gender": "masculine_animate|masculine_inanimate|feminine|neuter",
      "plurality": "singular|plural",
      "is_primary": true,
      "example": {
        "czech": "Example sentence.",
        "english": "Translation.",
        "explanation": "Brief explanation."
      }
    }
  ],
  "comparative": {
    "form_czech": "comparative form or null",
    "example": { ... }
  },
  "superlative": {
    "form_czech": "superlative form or null",
    "example": { ... }
  }
}

Requirements:
1. All 7 cases × 4 genders × 2 numbers = 56 forms for full coverage
2. At minimum, include nominative for all gender/number combinations (8 forms)
3. Include key cases (nom, gen, acc, loc, inst) for masculine and feminine singular
4. Include comparative and superlative if they exist (some adjectives don't compare)
5. Each form needs a realistic example
```

---

## Expected Output Structure

### Complete Example: Noun "dům"

```json
{
  "root_word": {
    "in_czech": "dům",
    "in_english": "house",
    "word_type": "noun",
    "gender": "masculine_inanimate"
  },
  "forms": [
    {
      "form_czech": "dům",
      "case": "nominative",
      "plurality": "singular",
      "is_primary": true,
      "example": {
        "czech": "Ten dům je starý.",
        "english": "That house is old.",
        "explanation": "Nominative case - dům is the subject of the sentence."
      }
    },
    {
      "form_czech": "domu",
      "case": "genitive",
      "plurality": "singular",
      "is_primary": true,
      "example": {
        "czech": "Barva toho domu je bílá.",
        "english": "The color of that house is white.",
        "explanation": "Genitive case - showing possession (color of the house)."
      }
    },
    {
      "form_czech": "domu",
      "case": "dative",
      "plurality": "singular",
      "is_primary": true,
      "example": {
        "czech": "Blížíme se k tomu domu.",
        "english": "We are approaching that house.",
        "explanation": "Dative case - used with preposition 'k' (towards)."
      }
    },
    {
      "form_czech": "dům",
      "case": "accusative",
      "plurality": "singular",
      "is_primary": true,
      "example": {
        "czech": "Vidím ten dům.",
        "english": "I see that house.",
        "explanation": "Accusative case - dům is the direct object of 'vidím'."
      }
    },
    {
      "form_czech": "dome",
      "case": "vocative",
      "plurality": "singular",
      "is_primary": true,
      "example": {
        "czech": "Ó, dome starý!",
        "english": "Oh, old house!",
        "explanation": "Vocative case - poetic/literary direct address."
      }
    },
    {
      "form_czech": "domě",
      "case": "locative",
      "plurality": "singular",
      "is_primary": true,
      "example": {
        "czech": "Bydlím v tom domě.",
        "english": "I live in that house.",
        "explanation": "Locative case - used with 'v' to indicate location."
      }
    },
    {
      "form_czech": "domem",
      "case": "instrumental",
      "plurality": "singular",
      "is_primary": true,
      "example": {
        "czech": "Prošli jsme před tím domem.",
        "english": "We walked past that house.",
        "explanation": "Instrumental case - used with 'před' (in front of/past)."
      }
    },
    {
      "form_czech": "domy",
      "case": "nominative",
      "plurality": "plural",
      "is_primary": true,
      "example": {
        "czech": "Ty domy jsou nové.",
        "english": "Those houses are new.",
        "explanation": "Nominative plural - domy is the subject."
      }
    },
    {
      "form_czech": "domů",
      "case": "genitive",
      "plurality": "plural",
      "is_primary": true,
      "example": {
        "czech": "V ulici je hodně domů.",
        "english": "There are many houses on the street.",
        "explanation": "Genitive plural - used with quantity expressions."
      }
    },
    {
      "form_czech": "domům",
      "case": "dative",
      "plurality": "plural",
      "is_primary": true,
      "example": {
        "czech": "Pošta doručuje balíky k domům.",
        "english": "The post office delivers packages to the houses.",
        "explanation": "Dative plural - recipients/direction with 'k'."
      }
    },
    {
      "form_czech": "domy",
      "case": "accusative",
      "plurality": "plural",
      "is_primary": true,
      "example": {
        "czech": "Stavíme nové domy.",
        "english": "We are building new houses.",
        "explanation": "Accusative plural - direct object of 'stavíme'."
      }
    },
    {
      "form_czech": "domy",
      "case": "vocative",
      "plurality": "plural",
      "is_primary": true,
      "example": {
        "czech": "Ó, domy staré!",
        "english": "Oh, old houses!",
        "explanation": "Vocative plural - same as nominative for most nouns."
      }
    },
    {
      "form_czech": "domech",
      "case": "locative",
      "plurality": "plural",
      "is_primary": true,
      "example": {
        "czech": "Lidé bydlí v těch domech.",
        "english": "People live in those houses.",
        "explanation": "Locative plural - location with 'v'."
      }
    },
    {
      "form_czech": "domích",
      "case": "locative",
      "plurality": "plural",
      "is_primary": false,
      "example": {
        "czech": "V těch starých domích je zima.",
        "english": "It's cold in those old houses.",
        "explanation": "Alternative locative plural form."
      }
    },
    {
      "form_czech": "domy",
      "case": "instrumental",
      "plurality": "plural",
      "is_primary": true,
      "example": {
        "czech": "Za těmi domy je park.",
        "english": "Behind those houses is a park.",
        "explanation": "Instrumental plural - with 'za' (behind)."
      }
    }
  ]
}
```

---

## Telegram Flow

### Step 1: You Send Czech Word

```
dům
```

### Step 2: AI Translates and Asks for Confirmation

```
📖 dům

Translation: house
Type: noun (masculine inanimate)

Is this correct?
```

[✅ Confirm] [❌ Reject]

### Step 3a: You Confirm

```
✅ Confirm
```

Bot responds:

```
🔄 Generating all forms for "dům"...
```

Then:

```
✅ dům (house) is pending admin confirmation.

15 word forms created.
```

### Step 3b: You Reject

```
❌ Reject
```

Bot responds:

```
❌ Cancelled. Send another word or provide correction:
- Send new word
- Or reply with: dům | home | noun | masculine_inanimate
```

### Manual Override

If AI gets it wrong, you can send the full format to override:

```
dům | home | noun | masculine_inanimate
```

Bot skips confirmation and proceeds directly to generation.

---

## Admin UI Review Flow

The Slovi app includes an admin page at `/admin` for reviewing and editing generated words.

### Admin Features

**Word List View:**

- Filter by: unverified, verified, word type
- Sort by: created date, alphabetical
- Quick stats: total words, pending review

**Word Detail View:**

- Edit root word (czech, english, word type)
- Table of all forms with inline editing
- Each row: form_czech, case, plurality, is_primary
- Expandable example sentences per form
- "Verify" button to mark as reviewed

### Wireframe: Word List

```
┌─────────────────────────────────────────────────────────────┐
│  ADMIN: Words                              [+ Add Manual]   │
├─────────────────────────────────────────────────────────────┤
│  Filter: [Unverified ▼]  [All Types ▼]     Showing 12 words │
├─────────────────────────────────────────────────────────────┤
│  ○ dům        house         noun    ⚠️ unverified   [Edit]  │
│  ○ stůl       table         noun    ⚠️ unverified   [Edit]  │
│  ○ kniha      book          noun    ⚠️ unverified   [Edit]  │
│  ○ psát       to write      verb    ✓ verified      [Edit]  │
│  ○ rychlý     fast          adj     ✓ verified      [Edit]  │
└─────────────────────────────────────────────────────────────┘
│  [Verify Selected]  [Delete Selected]                       │
└─────────────────────────────────────────────────────────────┘
```

### Wireframe: Word Edit

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to list                                             │
│                                                             │
│  ROOT WORD                                    [Delete Word] │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ dům          │ │ house        │ │ noun ▼               │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
│  Czech             English          Type                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  SINGULAR FORMS                                             │
│  ┌───────────────┬──────────┬─────────┬───────────────────┐ │
│  │ Case          │ Form     │ Primary │ Example           │ │
│  ├───────────────┼──────────┼─────────┼───────────────────┤ │
│  │ nominative    │ [dům   ] │ [✓]     │ [Ten dům je st..] │ │
│  │ genitive      │ [domu  ] │ [✓]     │ [Barva toho do..] │ │
│  │ dative        │ [domu  ] │ [✓]     │ [Blížíme se k...] │ │
│  │ accusative    │ [dům   ] │ [✓]     │ [Vidím ten dům..] │ │
│  │ vocative      │ [dome  ] │ [✓]     │ [Ó, dome starý..] │ │
│  │ locative      │ [domě  ] │ [✓]     │ [Bydlím v tom...] │ │
│  │ instrumental  │ [domem ] │ [✓]     │ [Před tím dome..] │ │
│  └───────────────┴──────────┴─────────┴───────────────────┘ │
│                                              [+ Add Form]   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  PLURAL FORMS                                               │
│  ┌───────────────┬──────────┬─────────┬───────────────────┐ │
│  │ Case          │ Form     │ Primary │ Example           │ │
│  ├───────────────┼──────────┼─────────┼───────────────────┤ │
│  │ nominative    │ [domy  ] │ [✓]     │ [Ty domy jsou...] │ │
│  │ genitive      │ [domů  ] │ [✓]     │ [V ulici je ho..] │ │
│  │ ...           │          │         │                   │ │
│  │ locative      │ [domech] │ [✓]     │ [Lidé bydlí v...] │ │
│  │ locative      │ [domích] │ [ ]     │ [V těch starýc..] │ │
│  └───────────────┴──────────┴─────────┴───────────────────┘ │
│                                              [+ Add Form]   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Save Changes]                      [✓ Mark as Verified]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Example Editing (Expandable)

Clicking on an example cell expands to full edit:

```
┌─────────────────────────────────────────────────────────────┐
│  Example for: genitive singular                    [Close]  │
│                                                             │
│  Czech sentence:                                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Barva toho domu je bílá.                                ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  English translation:                                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ The color of that house is white.                       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Explanation:                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Genitive case - showing possession (color of the house).││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  [Save Example]                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Insert Sequence

After approval, n8n executes these Supabase operations:

```javascript
// 1. Get form_type IDs (cached lookup)
const formTypeIds = await getFormTypeIds(['nominative', 'genitive', ...]);

// 2. Insert root_word
const { data: rootWord } = await supabase
  .from('root_words')
  .insert({
    in_czech: data.root_word.in_czech,
    in_english: data.root_word.in_english,
    word_type: data.root_word.word_type,
    is_verified: false,
    source: 'ai_generated'
  })
  .select('id')
  .single();

// 3. Insert all word_forms
const wordFormsToInsert = data.forms.map(form => ({
  root_word_id: rootWord.id,
  form_czech: form.form_czech,
  form_type_id: formTypeIds[form.case],
  gender: data.root_word.gender,
  plurality: form.plurality,
  is_primary: form.is_primary,
  is_verified: false,
  source: 'ai_generated'
}));

const { data: wordForms } = await supabase
  .from('word_forms')
  .insert(wordFormsToInsert)
  .select('id');

// 4. Insert all example_sentences
const examplesToInsert = data.forms.map((form, index) => ({
  word_form_id: wordForms[index].id,
  czech_sentence: form.example.czech,
  english_sentence: form.example.english,
  explanation: form.example.explanation,
  is_verified: false,
  source: 'ai_generated'
}));

await supabase
  .from('example_sentences')
  .insert(examplesToInsert);
```

---

## Batch Processing

For adding multiple words efficiently:

### Option 1: Telegram List

Send multiple words, one per line:

```
dům | house | noun | masculine_inanimate
stůl | table | noun | masculine_inanimate
kniha | book | noun | feminine
```

Bot processes each sequentially, sends one combined preview.

### Option 2: Google Sheets Integration

1. Create sheet with columns: czech, english, word_type, gender_or_aspect
2. n8n reads unprocessed rows
3. Generates and queues for review
4. Telegram sends batch preview
5. Approve all or review individually

### Option 3: CSV Upload

Upload CSV to Telegram:

```csv
czech,english,word_type,gender
dům,house,noun,masculine_inanimate
stůl,table,noun,masculine_inanimate
```

---

## Error Handling

### AI Generation Errors

- Invalid JSON → Retry up to 3 times
- Missing fields → Reject and notify
- Timeout → Notify and allow manual retry

### Database Errors

- Duplicate word → Notify, offer to update existing
- Foreign key error → Check form_types exist
- Connection error → Queue for retry

### Validation Rules

Before insert, verify:

- [ ] All 7 cases present for singular
- [ ] All 7 cases present for plural
- [ ] Each form has an example
- [ ] No empty strings
- [ ] Gender matches word_type requirements

---

## Word Relationships (Phase 2)

After base word is inserted, optionally generate:

### Verb Aspect Pairs

```
Input: psát | to write | verb | imperfective
Bot: "Should I also generate the perfective pair 'napsat'?"
You: ✅
Bot: Generates napsat, links via verb_aspect_pairs
```

### Word Families

```
Input: dům | house | noun | masculine_inanimate
Bot: "Found related words. Generate these too?"
- domek (diminutive)
- domov (derived noun - home)
- domácí (adjective - domestic)
You: Select which to generate
```

---

## Cost Estimation

Using Claude claude-sonnet-4-20250514:

- ~1,500 input tokens per word (prompt + context)
- ~2,000 output tokens per word (full JSON response)
- Cost: ~$0.015 per word

For 1,000 words: ~$15

---

## Next Steps

### Phase 1: Database & Admin UI

1. [ ] Set up Supabase project and run migrations
2. [ ] Build admin page in Slovi (`/admin`)
   - [ ] Word list with filters
   - [ ] Word edit form with inline editing
   - [ ] Verify/delete actions
3. [ ] Test manual word entry through admin UI

### Phase 2: Telegram + n8n Automation

4. [ ] Set up Telegram bot (BotFather)
5. [ ] Create n8n workflow:
   - [ ] Telegram trigger node
   - [ ] Parse input format
   - [ ] Claude API node with prompts
   - [ ] Validation logic
   - [ ] Supabase insert nodes
   - [ ] Telegram confirmation node
6. [ ] Test with 5-10 words
7. [ ] Refine prompts based on output quality

### Phase 3: Batch & Relationships

8. [ ] Add batch input support (multiple words per message)
9. [ ] Implement verb aspect pair suggestions
10. [ ] Implement word family suggestions
