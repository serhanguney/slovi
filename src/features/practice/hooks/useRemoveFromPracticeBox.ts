import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/client';

export const useRemoveFromPracticeBox = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rootWordIds: number[]) => {
      const { data: wordForms, error: wfError } = await supabase
        .from('word_forms')
        .select('id')
        .in('root_word_id', rootWordIds);
      if (wfError) throw new Error(wfError.message);

      const wordFormIds = (wordForms ?? []).map((wf) => wf.id);

      if (wordFormIds.length > 0) {
        const { error: progressError } = await supabase
          .from('user_word_progress')
          .delete()
          .in('word_form_id', wordFormIds);
        if (progressError) throw new Error(progressError.message);
      }

      const { error: boxError } = await supabase
        .from('practice_box')
        .delete()
        .in('root_word_id', rootWordIds);
      if (boxError) throw new Error(boxError.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-word-list'] });
      queryClient.invalidateQueries({ queryKey: ['practice-box-count'] });
    },
  });
};
