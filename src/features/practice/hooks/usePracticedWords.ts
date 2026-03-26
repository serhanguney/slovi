import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as R from 'remeda';
import { supabase } from '@/supabase/client';
import type { PracticedWord } from '../types';

export function usePracticedWords() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const debouncedSetSearch = useMemo(
    () =>
      R.funnel(
        (value: string) => {
          setDebouncedSearch(value);
        },
        {
          reducer: (_acc: string | undefined, newValue: string) => newValue,
          minQuietPeriodMs: 300,
        }
      ),
    []
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    debouncedSetSearch.call(value);
  };

  const query = useQuery({
    queryKey: ['user-word-list', debouncedSearch],
    queryFn: async (): Promise<PracticedWord[]> => {
      const { data, error } = await supabase.rpc('get_user_word_list', {
        p_search: debouncedSearch,
      });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  return { search, setSearch: handleSearchChange, ...query };
}
