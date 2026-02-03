# Plan to proced to the new version

## The main purpose of the app

The app's main purpose to enable users

1. to look up the Czech words from a comprehensive database where they can see the english translation of the word,as well as the different formats of the word such as conjugations or declensions along with examples of these words used in a sentence. They should also be able to see explanations as to why, for example, the word was used in genitive form in the sentence

2. The users should be able to perform basic quiz practices (currently exists)

3. The users should be able to track their progress (currently exists but needs improvement)

## The dictionary feature

Users will be able to search for words and find definitions as well as examples of usages for every format of the word. Format can mean declensions for nouns, or conjugations for verbs.

### Maintainable Database

The idea is to have a scalable setup where I can keep adding new czech words with example sentences for every declension of the word. I’m think to go for a UX similar to google translate, but more tailored for Czech language. The UI should display the declension forms of the word, or the conjugations of the verb, or a simpler display for prepositions etc.

There should be the example sentences in which the words are declenated or conjugated. And if it exists, the user should be able to see why the word was declenated the way it is (explanation)

We need a scalable and maintainable database structure

The dictionary api should allow for autocomplete fuzzy search. The user should be able to search all declension forms, or conjugation forms

## Practice Czech and track user progress

The current setup allows for users to practice Czech using quizzes of two types:

1. Easy: where users are presented a czech sentence with its translation. One word of the sentence is selected and the user is asked what declension it is used in the sentence. The user can access the explanation for why the declension is used. (practice declension understanding)

2. Difficult: users are presented with an english sentence and one word is selected. In the translated version below the selected word is hidden, so they see an incomplete czech sentence. They are asked to write the hidden part of the sentence correctly. (practice memory)

### Current issues

1. When finishing a quiz, we're showing the user a DeclensionScoreDialog that displays what was achieved and how much progress is mage. The calculations there somehow lead to negative values in proficiency. An example case of this is:

```
correct answeres 14

incorrect answers 6

Score increase +3

profiency -0.0024%
```

### Questions

#### Saving JSON to Supabase

The current setup relies on saving json objects rather than relational tables.
We're saving to `declension_sores` table `error_map` and `success_map` columns in the following format:

```json
{
  "accusative": 0,
  "dative": 0,
  "genitive": 2,
  "locative": 1,
  "instrumental": 0,
  "nominative": 0,
  "vocative": 0,
  "unknown": 0
}
```

On frontend we're then getting all these object and summing them up to calculate progress levels.

We're also saving the `declension_table` column in `root_words` table like so:

```json
{
  {
  "singular.masculine_animate.nominative": "svůj",
  "singular.masculine_animate.genitive": "svého",
  "singular.masculine_animate.dative": "svému",
  "singular.masculine_animate.accusative": "svého",
  "singular.masculine_animate.locative": "svém",
  "singular.masculine_animate.instrumental": "svým",
  "singular.masculine_inanimate.nominative": "svůj",
  "singular.masculine_inanimate.genitive": "svého",
  "singular.masculine_inanimate.dative": "svému",
  "singular.masculine_inanimate.accusative": "svůj",
  "singular.masculine_inanimate.locative": "svém",
  "singular.masculine_inanimate.instrumental": "svým",
  "plural.masculine_animate.nominative": "svoji, sví",
  "plural.masculine_animate.genitive": "svých",
  "plural.masculine_animate.dative": "svým",
  "plural.masculine_animate.accusative": "svoje, své",
  "plural.masculine_animate.locative": "svých",
  "plural.masculine_animate.instrumental": "svými",
  "plural.masculine_inanimate.nominative": "svoje, své",
  "plural.masculine_inanimate.genitive": "svých",
  "plural.masculine_inanimate.dative": "svým",
  "plural.masculine_inanimate.accusative": "svoje, své",
  "plural.masculine_inanimate.locative": "svých",
  "plural.masculine_inanimate.instrumental": "svými",
  "singular.feminine.nominative": "svoje, svá",
  "singular.feminine.genitive": "svojí, své",
  "singular.feminine.dative": "svojí, své",
  "singular.feminine.accusative": "svoji, svou",
  "singular.feminine.locative": "svojí, své",
  "singular.feminine.instrumental": "svojí, svou",
  "plural.feminine.nominative": "svoje, své",
  "plural.feminine.genitive": "svých",
  "plural.feminine.dative": "svým",
  "plural.feminine.accusative": "svoje, své",
  "plural.feminine.locative": "svých",
  "plural.feminine.instrumental": "svými",
  "singular.neuter.nominative": "svoje, své",
  "singular.neuter.genitive": "svého",
  "singular.neuter.dative": "svému",
  "singular.neuter.accusative": "svoje, své",
  "singular.neuter.locative": "svém",
  "singular.neuter.instrumental": "svým",
  "plural.neuter.nominative": "svoje, svá",
  "plural.neuter.genitive": "svých",
  "plural.neuter.dative": "svým",
  "plural.neuter.accusative": "svoje, svá",
  "plural.neuter.locative": "svých",
  "plural.neuter.instrumental": "svými"
}
}
```

Is there anything wrong with this approach ? Could it be better somehow ?

#### What is missing from the current setup

We're not handling verbs at all. The current database structure seems to be focused on nouns and pronouns but not verbs. See declension_table and success_map and error_map formats. Is the current setup good enough to be expanded to handle verbs as well ?

What else could be missing from a language learning perspective that could serve to the main purpose of the app. Nouns, pronouns and verbs are being considered already. What else ? Maybe this is enough.

#### Is familiarity and mastery really necessary ?

This was needed to distinguish between practice types while measuring user progress. Simple practice does not engage the user for remembering words, but it only engages them to guess the correct option. I needed to come up with some degree that defines the capability to construct sentences. Even though it sounds necessary, I am still wondering if there is a simpler way of measuring user progress.
