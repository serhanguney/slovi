import type { Database } from './schema';

// ── Table row types ───────────────────────────────────────────────────────────

export type WordForm = Database['public']['Tables']['word_forms']['Row'];
export type FormType = Database['public']['Tables']['word_form_types']['Row'];
export type ExampleSentence = Database['public']['Tables']['example_sentences']['Row'];
export type RootWord = Pick<
  Database['public']['Tables']['root_words']['Row'],
  'id' | 'in_czech' | 'in_english' | 'word_type' | 'word_aspect' | 'note'
>;

// ── Enum types ────────────────────────────────────────────────────────────────

export type Gender = Database['public']['Enums']['gender'];
export type Plurality = Database['public']['Enums']['plurality'];
export type Person = Database['public']['Enums']['person'];
export type Tense = Database['public']['Enums']['tense'];
export type FormTypeCategory = Database['public']['Enums']['form_type_category'];
export type WordType = Database['public']['Enums']['word_type'];
export type WordAspect = Database['public']['Enums']['word_aspect'];
export type PracticeMode = Database['public']['Enums']['practice_mode'];
