import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabase/client';

export function useKnownWords() {
  return useQuery({
    queryKey: ['known-words'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_known_words');
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
