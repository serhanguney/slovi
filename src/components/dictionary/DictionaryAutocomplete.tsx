import { useRef } from 'react';
import { Search } from 'lucide-react';
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from '@/components/ui/combobox';
import { InputGroupAddon } from '@/components/ui/input-group';
import { useDictionarySearch, type SearchResult } from '@/hooks/useDictionarySearch';

interface DictionaryAutocompleteProps {
  onSelect: (result: SearchResult) => void;
  placeholder?: string;
  variant?: 'sm' | 'lg';
}

export function DictionaryAutocomplete({
  onSelect,
  placeholder,
  variant = 'sm',
}: DictionaryAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const defaultPlaceholder =
    variant === 'lg' ? 'Type a word in Czech or English...' : 'Search Czech words...';
  const { query, setQuery, results, loading } = useDictionarySearch();

  const getWordTypeLabel = (wordType: string) => {
    const labels: Record<string, string> = {
      noun: 'noun',
      verb: 'verb',
      adjective: 'adj',
      adverb: 'adv',
      pronoun: 'pron',
      preposition: 'prep',
      conjunction: 'conj',
      numeral: 'num',
    };
    return labels[wordType] || wordType;
  };

  const getAspectLabel = (aspect: string | null) => {
    if (!aspect) return null;
    const labels: Record<string, string> = {
      perfective: 'pf.',
      imperfective: 'impf.',
    };
    return labels[aspect] || aspect;
  };

  return (
    <Combobox
      onInputValueChange={(inputValue) => setQuery(inputValue)}
      onValueChange={(value) => {
        if (value) {
          const selected = results.find((r) => `${r.root_word_id}-${r.matched_form}` === value);
          if (selected) {
            onSelect(selected);
            setQuery('');
          }
        }
      }}
    >
      <div ref={containerRef}>
        <ComboboxInput
          placeholder={placeholder ?? defaultPlaceholder}
          showTrigger={false}
          className={
            variant === 'lg'
              ? 'h-auto w-full rounded-[28px] [&_input]:h-auto [&_input]:py-[14px] [&_input]:text-[15px]'
              : 'w-full rounded-[20px]'
          }
        >
          <InputGroupAddon align="inline-start" className={variant === 'lg' ? 'pl-5' : undefined}>
            <Search className={variant === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />
          </InputGroupAddon>
        </ComboboxInput>
      </div>
      <ComboboxContent anchor={containerRef}>
        {loading && (
          <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>
        )}
        {!loading && query.length >= 2 && results.length === 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground">No results found.</div>
        )}
        {!loading && query.length < 2 && (
          <div className="py-6 text-center text-sm text-muted-foreground">Type to search...</div>
        )}
        <ComboboxList>
          {results.map((result) => {
            const aspectLabel = getAspectLabel(result.word_aspect);
            return (
              <ComboboxItem
                key={`${result.root_word_id}-${result.matched_form}`}
                value={`${result.root_word_id}-${result.matched_form}`}
                className="flex items-start gap-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{result.root_word_czech}</span>
                    <div className="flex items-center gap-1">
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                        {getWordTypeLabel(result.word_type)}
                      </span>
                      {aspectLabel && (
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                          {aspectLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">{result.root_word_english}</div>
                  {result.root_word_note && (
                    <div className="mt-0.5 text-xs text-muted-foreground/70 line-clamp-1">
                      {result.root_word_note}
                    </div>
                  )}
                  {result.example_czech && (
                    <div className="mt-0.5 overflow-hidden text-xs text-muted-foreground/70 italic whitespace-nowrap text-ellipsis">
                      {result.example_czech}
                    </div>
                  )}
                  {result.example_english && (
                    <div className="overflow-hidden text-xs text-muted-foreground/50 whitespace-nowrap text-ellipsis">
                      {result.example_english}
                    </div>
                  )}
                </div>
              </ComboboxItem>
            );
          })}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
