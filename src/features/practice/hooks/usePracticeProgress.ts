import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabase/client';

export function usePracticeProgress() {
  return useQuery({
    queryKey: ['practice-progress'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_practice_progress');
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
