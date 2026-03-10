import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/supabase/client';
import type { PracticeMode, PracticeScope, WordType } from '../types';

export function useBuildPracticeSession() {
  return useMutation({
    mutationFn: async ({
      mode,
      scope,
      wordType,
    }: {
      mode: PracticeMode;
      scope: PracticeScope;
      wordType: WordType | undefined;
    }) => {
      const { data, error } = await supabase.rpc('build_practice_session', {
        p_mode: mode,
        p_scope: scope,
        p_word_type: wordType,
      });
      if (error) throw new Error(error.message);
      return data;
    },
  });
}
