import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabase/client';

export function usePracticeBoxCount() {
  return useQuery({
    queryKey: ['practice-box-count'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_practice_box_count');
      if (error) throw new Error(error.message);
      return data ?? 0;
    },
  });
}
