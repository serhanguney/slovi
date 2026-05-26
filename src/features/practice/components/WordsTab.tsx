import { useState } from 'react';
import { Info, Loader2, Search, Trash2, X } from 'lucide-react';
import { Input } from '@/features/ui/input';
import { cn } from '@/lib/utils';
import { usePracticedWords } from '../hooks/usePracticedWords';
import { useRemoveFromPracticeBox } from '../hooks/useRemoveFromPracticeBox';
import { PracticedWordCard } from './PracticedWordCard';
import { WordsInfoSheet } from './WordsInfoSheet';
import { AddMissingPronounsButton } from './AddMissingPronounsButton';

export const WordsTab = () => {
  const { search, setSearch, data: words = [], isLoading } = usePracticedWords();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showInfo, setShowInfo] = useState(false);
  const remove = useRemoveFromPracticeBox();

  const hasAnyFading = words.some(
    (w) => w.sv_status === 'fading' || w.cu_status === 'fading' || w.fr_status === 'fading'
  );

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectionCount = selectedIds.size;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-4 pb-4 pt-5 md:px-8">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-foreground">{isLoading ? '—' : words.length} words</p>
            <div className="md:hidden">
              <AddMissingPronounsButton />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <AddMissingPronounsButton />
            </div>
            <button
              onClick={() => setShowInfo(true)}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full border bg-card transition-colors hover:bg-muted',
                hasAnyFading ? 'text-warning' : 'border-border text-muted-foreground'
              )}
              aria-label="Retention status info"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative mt-4">
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

      <div className="flex-1 overflow-y-auto px-4 pb-6 md:px-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
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
          <div className="overflow-hidden rounded-2xl border border-border">
            {words.map((word) => (
              <PracticedWordCard
                key={word.root_word_id}
                word={word}
                selected={selectedIds.has(word.root_word_id)}
                onToggle={() => toggleSelect(word.root_word_id)}
              />
            ))}
          </div>
        )}
      </div>

      {selectionCount > 0 && (
        <div className="shrink-0 flex items-center justify-between border-t border-border bg-card px-4 py-3 md:px-8">
          <p className="text-sm font-semibold text-foreground">
            {selectionCount} {selectionCount === 1 ? 'word' : 'words'} selected
          </p>
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate([...selectedIds], { onSuccess: () => setSelectedIds(new Set()) })
            }
            className="flex items-center gap-1.5 rounded-full bg-destructive px-4 py-2 text-label font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
          >
            {remove.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Remove
          </button>
        </div>
      )}

      <WordsInfoSheet open={showInfo} onClose={() => setShowInfo(false)} />
    </div>
  );
};
