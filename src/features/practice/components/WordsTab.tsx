import { useState } from 'react';
import { Search, Info, X } from 'lucide-react';
import { Input } from '@/features/ui/input';
import { cn } from '@/lib/utils';
import { usePracticedWords } from '../hooks/usePracticedWords';
import { PracticedWordCard } from './PracticedWordCard';
import { WordsInfoSheet } from './WordsInfoSheet';
import { AddMissingPronounsButton } from './AddMissingPronounsButton';

export function WordsTab() {
  const { search, setSearch, data: words = [], isLoading } = usePracticedWords();
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="shrink-0 px-4 pb-3 pt-5 md:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-foreground">
              {isLoading ? '—' : words.length} {words.length === 1 ? 'word' : 'words'}
            </span>
            {/* Desktop: inline next to word count */}
            <div className="hidden md:block">
              <AddMissingPronounsButton />
            </div>
          </div>
          <button
            onClick={() => setShowInfo(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Retention status info"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile: underneath the word count row */}
        <div className="mt-2 md:hidden">
          <AddMissingPronounsButton />
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search Czech or English..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn('pl-9', search && 'pr-9')}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Word list */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 md:px-6">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <p className="text-label text-muted-foreground">Loading…</p>
          </div>
        ) : words.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-semibold text-foreground">
              {search ? 'No words found' : 'No practiced words yet'}
            </p>
            <p className="mt-1 text-label text-muted-foreground">
              {search
                ? 'Try a different search term'
                : 'Start practicing to see your progress here'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">
            {words.map((word) => (
              <PracticedWordCard key={word.root_word_id} word={word} />
            ))}
          </div>
        )}
      </div>

      <WordsInfoSheet open={showInfo} onClose={() => setShowInfo(false)} />
    </div>
  );
}
