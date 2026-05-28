import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/api/client';
import type { PracticeMode, PracticeScope, WordType } from '../types';

export const useBuildPracticeSession = () => {
  return useMutation({
    mutationFn: async ({
      mode,
      scope,
      wordType,
      allowNewWords,
    }: {
      mode: PracticeMode;
      scope: PracticeScope;
      wordType: WordType | undefined;
      allowNewWords: boolean;
    }) => {
      const { data, error } = await supabase.rpc('build_practice_session', {
        p_mode: mode,
        p_scope: scope,
        p_word_type: wordType,
        p_allow_new_words: allowNewWords,
      });
      if (error) throw new Error(error.message);
      return data;
    },
  });
};
