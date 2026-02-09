import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as R from 'remeda';
import { supabase } from '@/supabase/client';

export interface SearchResult {
  root_word_id: number;
  root_word_czech: string;
  root_word_english: string;
  word_type: string;
  word_aspect: string | null;
  matched_form: string;
  form_type_name: string;
  rank: number;
  similarity: number;
  example_czech: string | null;
  example_english: string | null;
  root_word_note: string | null;
}

interface UseDictionarySearchOptions {
  debounceMs?: number;
  limit?: number;
  minQueryLength?: number;
}

async function searchDictionary(query: string, limit: number): Promise<SearchResult[]> {
  const { data, error } = await supabase.rpc('search_dictionary', {
    p_query: query,
    p_limit: limit,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Cast needed because generated types may not reflect latest function signature
  return (data as unknown as SearchResult[]) || [];
}

export function useDictionarySearch(options: UseDictionarySearchOptions = {}) {
  const { debounceMs = 300, limit = 10, minQueryLength = 2 } = options;

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const debouncedSetQuery = useMemo(
    () =>
      R.funnel(
        (value: string) => {
          setDebouncedQuery(value);
        },
        {
          reducer: (_acc: string | undefined, newValue: string) => newValue,
          minQuietPeriodMs: debounceMs,
        }
      ),
    [debounceMs]
  );

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    debouncedSetQuery.call(newQuery);
  };

  const {
    data: results = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['dictionary-search', debouncedQuery, limit],
    queryFn: () => searchDictionary(debouncedQuery, limit),
    enabled: debouncedQuery.length >= minQueryLength,
    staleTime: 1000 * 60 * 5,
  });

  return {
    query,
    setQuery: handleQueryChange,
    results,
    loading: loading && debouncedQuery.length >= minQueryLength,
    error: error instanceof Error ? error.message : null,
    clearResults: () => {
      setQuery('');
      setDebouncedQuery('');
    },
  };
}
