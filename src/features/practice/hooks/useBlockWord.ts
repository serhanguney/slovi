import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/api/client';

export const useBlockWord = () => {
  return useMutation({
    mutationFn: async (rootWordId: number) => {
      const { error } = await supabase.from('blocked_words').insert({ root_word_id: rootWordId });
      if (error) throw new Error(error.message);
    },
  });
};
