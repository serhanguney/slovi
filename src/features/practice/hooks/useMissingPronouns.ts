import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabase/client';

export function useMissingPronouns() {
  return useQuery({
    queryKey: ['missing-pronouns'],
    queryFn: async () => {
      const [{ data: pronouns, error: e1 }, { data: wordList, error: e2 }] = await Promise.all([
        supabase.from('root_words').select('id').eq('word_type', 'pronoun'),
        supabase.rpc('get_user_word_list', { p_search: '' }),
      ]);

      if (e1) throw new Error(e1.message);
      if (e2) throw new Error(e2.message);

      // Exclude pronouns already tracked — either practiced or already in the box
      const trackedIds = new Set(
        (wordList ?? []).filter((w) => w.word_type === 'pronoun').map((w) => w.root_word_id)
      );
      return (pronouns ?? []).filter((p) => !trackedIds.has(p.id)).map((p) => p.id);
    },
    staleTime: 1000 * 60 * 2,
  });
}
