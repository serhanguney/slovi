import { supabase } from '@/supabase/client';
import { useQuery } from '@tanstack/react-query';

export const useGetRootWords = () => {
  return useQuery({
    queryKey: ['get-root-words'],
    queryFn: async () => {
      const { data, error } = await supabase.from('root_words').select();

      if (error) throw error;
      return data;
    },
  });
};
