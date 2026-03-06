import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/supabase/client';

export function useBuildVocabularySession() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('build_vocabulary_session');
      if (error) throw new Error(error.message);
      return data;
    },
  });
}
