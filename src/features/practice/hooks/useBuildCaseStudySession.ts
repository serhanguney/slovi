import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabase/client';

export const useBuildCaseStudySession = (rootWordId: number) =>
  useQuery({
    queryKey: ['case-study-session', rootWordId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('build_case_study_session', {
        p_root_word_ids: [rootWordId],
      });
      if (error) throw new Error(error.message);
      return data;
    },
  });
