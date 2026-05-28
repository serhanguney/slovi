import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/api/client';

export function useBuildVocabularySession() {
  return useMutation({
    mutationFn: async ({ allowNewWords }: { allowNewWords: boolean }) => {
      const { data, error } = await supabase.rpc('build_vocabulary_session', {
        p_allow_new_words: allowNewWords,
      });
      if (error) throw new Error(error.message);
      return data;
    },
  });
}
