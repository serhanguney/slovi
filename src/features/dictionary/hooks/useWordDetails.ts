import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabase/client';
import type { FormType, WordForm, ExampleSentence, RootWord } from '@/supabase/types';

export type { ExampleSentence, RootWord } from '@/supabase/types';

export type FetchedWordForm = WordForm & {
  form_type: FormType;
};

async function fetchWordDetails(rootWordId: number) {
  const [rootWordResult, formsResult] = await Promise.all([
    supabase
      .from('root_words')
      .select('id, in_czech, in_english, word_type, word_aspect, note')
      .eq('id', rootWordId)
      .single(),
    supabase
      .from('word_forms')
      .select(
        `
        id,
        form_in_czech,
        form_type_id,
        gender,
        plurality,
        person,
        tense,
        is_primary,
        form_type:word_form_types(name, category, explanation)
      `
      )
      .eq('root_word_id', rootWordId)
      .order('form_type_id'),
  ]);

  if (rootWordResult.error) throw new Error(rootWordResult.error.message);
  if (formsResult.error) throw new Error(formsResult.error.message);

  const formIds = formsResult.data.map((f) => f.id);
  const examplesResult = await supabase
    .from('example_sentences')
    .select('id, czech_sentence, english_sentence, explanation, word_form_id')
    .in('word_form_id', formIds);

  if (examplesResult.error) throw new Error(examplesResult.error.message);

  return {
    rootWord: rootWordResult.data as RootWord,
    forms: formsResult.data as unknown as FetchedWordForm[],
    examples: examplesResult.data as ExampleSentence[],
  };
}

export function useWordDetails(rootWordId: number | null) {
  return useQuery({
    queryKey: ['word-details', rootWordId],
    queryFn: () => fetchWordDetails(rootWordId!),
    enabled: rootWordId !== null,
    staleTime: 1000 * 60 * 10,
  });
}
