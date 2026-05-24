import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/api/client';

export function useBuildVocabularySession() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('build_vocabulary_session');
      if (error) throw new Error(error.message);
      return data;
    },
  });
}
