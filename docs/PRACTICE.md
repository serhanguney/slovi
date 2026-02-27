# Practice Module

## Approach: Case-Driven Sentence Completion

Practice is structured around Czech grammatical cases, introduced one at a time in order of frequency/usefulness:

1. Accusative
2. Locative
3. Dative
4. Genitive
5. Instrumental
6. Vocative

Nominative is assumed known (dictionary form).

## Exercise Format

Each case has two practice modes:

### Easy Mode (Multiple Choice)

Present a sentence with a blank and 3-4 options. The sentence provides context for _why_ a particular case is needed.

// TODO this is the wrong example. The sentence should be fully visible, the word in question should be bold, and the options should be of case names [genitive, dative, accusative,locative] - Maybe the options should be more than 4...
Example: "Vidím **_" (I see _**) → [psa, psovi, psu, psem]

### Hard Mode (Fill in the Blank)

Same sentence format, but the user types the correct form. No options provided.

## Progression

Users work through one case at a time. New words are introduced gradually within the current case focus. SM-2 spaced repetition handles review scheduling.

## Open questions

1. What about verbs?
2. How will the user progression tracking be? We should create something thats not complex,, but efficient enough. This app's purpose is not to teach Cezch fully, but its to get you there with a foundation so you can build on it out there talking to people. One idea might be to keep track of how many times a word was practiced correctly.
3. What about gamification with practice progress. I don't want to create a false sense of progress with points. But I like the idea of showing some real progress; could be known_words and practice_counts
   a. known_words could be words that are practiced successfully more than 10 times in the last 3 months. The last 3 months part is important as people will forget if not practiced for a long time. If a memory time period (say 3 months) is exceeded then we can prompt something in frontend to re-practice if the user wants to.
   b. practice_counts would be "points" you get with every successful practice. Not sure if it should 1 point per practice regardless of the difficulty.
   c. Open to other ideas.
