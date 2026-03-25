import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/supabase/client';

export function useBuildCaseStudySession() {
  return useMutation({
    mutationFn: async (rootWordIds: number[]) => {
      const { data, error } = await supabase.rpc('build_case_study_session', {
        p_root_word_ids: rootWordIds,
      });
      if (error) throw new Error(error.message);
      return data;
    },
  });
}
