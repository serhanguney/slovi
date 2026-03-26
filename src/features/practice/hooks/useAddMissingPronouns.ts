import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabase/client';

export function useAddMissingPronouns() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      const { error } = await supabase
        .from('practice_box')
        .insert(ids.map((id) => ({ root_word_id: id })));
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practice-box-count'] });
      queryClient.invalidateQueries({ queryKey: ['missing-pronouns'] });
      queryClient.invalidateQueries({ queryKey: ['user-word-list'] });
    },
  });
}
