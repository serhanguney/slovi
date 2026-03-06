import { z } from 'zod';
import type { Database } from '@/supabase/schema';

export type PracticeMode = Database['public']['Enums']['practice_mode'];
export type PracticeScope = 'mixed' | string;

export type PracticeCard =
  Database['public']['Functions']['build_practice_session']['Returns'][number];

export type VocabularyCard =
  Database['public']['Functions']['build_vocabulary_session']['Returns'][number];

export type CaseProgress =
  Database['public']['Functions']['get_practice_progress']['Returns'][number];

export type KnownWord = Database['public']['Functions']['get_known_words']['Returns'][number];

export type DustyCard = Database['public']['Functions']['build_dusty_session']['Returns'][number];

// Zod schema for the Json return of record_practice_answer
export const recordAnswerResultSchema = z.object({
  word_became_known: z.boolean(),
  level_up: z
    .object({
      known_count: z.number(),
      level: z.enum(['Familiar', 'Proficient', 'Fluent']),
    })
    .nullable(),
});

export type RecordAnswerResult = z.infer<typeof recordAnswerResultSchema>;
