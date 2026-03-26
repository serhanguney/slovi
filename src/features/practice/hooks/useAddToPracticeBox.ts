import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabase/client';

export function useAddToPracticeBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rootWordId: number) => {
      const { error } = await supabase.from('practice_box').insert({ root_word_id: rootWordId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practice-box-count'] });
    },
  });
}
