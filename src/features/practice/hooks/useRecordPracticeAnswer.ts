import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabase/client';
import { recordAnswerResultSchema } from '../types';
import type { PracticeMode } from '../types';

interface RecordAnswerParams {
  p_word_form_id: number;
  p_mode: PracticeMode;
  p_is_correct: boolean;
}

export function useRecordPracticeAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RecordAnswerParams) => {
      const { data, error } = await supabase.rpc('record_practice_answer', params);
      if (error) throw new Error(error.message);
      return recordAnswerResultSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['known-words'] });
      queryClient.invalidateQueries({ queryKey: ['practice-box-count'] });
    },
  });
}
