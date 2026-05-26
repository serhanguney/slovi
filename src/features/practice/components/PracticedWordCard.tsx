import { z } from 'zod';
import {
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Hash,
  Link2,
  Milestone,
  MoveRight,
  Play,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Chip } from '@/features/ui/chip';
import { paths } from '@/features/routes/paths';
import type { PracticedWord } from '../types';

type Props = {
  word: PracticedWord;
  selected: boolean;
  onToggle: () => void;
};

const wordTypeSchema = z.enum([
  'noun',
  'verb',
  'pronoun',
  'adjective',
  'adverb',
  'preposition',
  'conjunction',
  'numeral',
]);

type WordType = z.infer<typeof wordTypeSchema>;

const typeIcons: Record<WordType, React.ElementType> = {
  noun: BookOpen,
  verb: Play,
  adjective: Sparkles,
  pronoun: UserRound,
  adverb: MoveRight,
  preposition: Milestone,
  conjunction: Link2,
  numeral: Hash,
};

const isAnyModeFading = (word: PracticedWord) =>
  word.sv_status === 'fading' || word.cu_status === 'fading' || word.fr_status === 'fading';

const relativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  const weeks = Math.floor(days / 7);
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${weeks}w ago`;
};

export const PracticedWordCard = ({ word, selected, onToggle }: Props) => {
  const typeResult = wordTypeSchema.safeParse(word.word_type);
  const TypeIcon = typeResult.success ? typeIcons[typeResult.data] : BookOpen;
  const wordTypeLabel = typeResult.success ? typeResult.data : word.word_type;

  const fading = isAnyModeFading(word);

  return (
    <div
      className={cn(
        'flex items-center gap-3 border-b border-border px-5 py-3.5 transition-colors last:border-b-0',
        selected ? 'bg-muted' : 'bg-card hover:bg-muted/50'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={selected ? 'Deselect word' : 'Select word'}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
          selected ? 'border-foreground bg-foreground' : 'border-input bg-transparent'
        )}
      >
        {selected && <Check className="h-3 w-3 text-background" />}
      </button>

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent">
        <TypeIcon className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h6 className="text-sm font-semibold text-foreground">{word.in_czech}</h6>
        <div className="flex items-center gap-1.5">
          <p className="text-label text-muted-foreground whitespace-nowrap text-ellipsis overflow-hidden">
            {word.in_english}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 md:flex-row md:items-center md:gap-3">
        <Chip label={wordTypeLabel} variant="outlined" />
        <p
          className={cn(
            'flex items-center gap-1 text-caption',
            fading ? 'text-warning' : 'text-muted-foreground'
          )}
        >
          <Clock3 className="h-3 w-3 shrink-0" />
          {word.last_practiced ? (
            <>
              <span className="hidden sm:inline">Last practiced</span>{' '}
              {relativeTime(word.last_practiced)}
            </>
          ) : (
            'Not yet practiced'
          )}
        </p>
      </div>

      <Link
        to={paths.word(word.root_word_id)}
        aria-label={`View ${word.in_czech}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-muted-foreground transition-colors hover:bg-muted"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
};
