import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { paths } from '@/features/routes/paths';
import { cn } from '@/lib/utils';
import { useBuildPracticeSession } from '../hooks/useBuildPracticeSession';
import { useBuildVocabularySession } from '../hooks/useBuildVocabularySession';
import { useFormRecallEligibleCount } from '../hooks/useFormRecallEligibleCount';
import { usePracticedWords } from '../hooks/usePracticedWords';
import type { PracticeMode, PracticeScope, WordType } from '../types';
import { WarningTooltip } from '@/components/WarningTooltip';
import { Chip } from '@/features/ui/chip';

const formRecallConditionMessage =
  'Case Memory mode will ask about what you practiced in Case Logic mode. In order for all options to be available, keep practicing Case Logic.';
const FORM_RECALL_MIN = 10;

const CASE_TYPES: { id: PracticeScope; label: string; prepositions: string }[] = [
  { id: 'mixed', label: 'Mixed', prepositions: 'all' },
  { id: 'nominative', label: 'Nominative', prepositions: '-' },
  { id: 'accusative', label: 'Accusative', prepositions: 'na, pro, etc.' },
  { id: 'genitive', label: 'Genitive', prepositions: 'od, do, etc.' },
  { id: 'dative', label: 'Dative', prepositions: 'k, kvůli, etc.' },
  { id: 'locative', label: 'Locative', prepositions: 'v, na, etc.' },
  { id: 'instrumental', label: 'Instrumental', prepositions: 's, za, etc.' },
  { id: 'vocative', label: 'Vocative', prepositions: '-' },
];

type ModeCardProps = {
  title: string;
  description: string;
  badge: React.ReactNode;
  selected: boolean;
  disabled?: boolean;
  lockedMessage?: string;
  onClick: () => void;
  note: React.ReactNode;
};

const ModeCard = ({
  title,
  description,
  badge,
  selected,
  disabled,
  lockedMessage,
  note,
  onClick,
}: ModeCardProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full flex-col justify-between rounded-[14px] bg-white p-4 text-left transition-all',
        lockedMessage ? 'h-40' : 'h-35',
        selected ? 'border-2 border-foreground' : 'border border-border',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span className="text-sm font-bold text-foreground">{title}</span>
      <span className="text-xs leading-[1.4] text-muted-foreground">{description}</span>
      {lockedMessage && (
        <span className="text-caption leading-[1.4] text-warning">{lockedMessage}</span>
      )}
      <div className="flex justify-between items-center">
        {badge}
        {note}
      </div>
    </button>
  );
};
type EligiblePracticeModes = Exclude<PracticeMode, 'case_study'>;
const MODES: {
  id: EligiblePracticeModes;
  title: string;
  description: string;
  badge: string;
  color: 'success' | 'warning' | 'secondary';
  disabled?: boolean;
}[] = [
  {
    id: 'simple_vocabulary',
    title: 'Simple vocabulary',
    description: 'Recognise Czech words from their English translation',
    badge: 'Easy',
    color: 'success',
  },
  {
    id: 'case_understanding',
    title: 'Case logic',
    description: 'Familiarize yourself with new words and conjugations',
    badge: 'Medium',
    color: 'warning',
  },
  {
    id: 'form_recall',
    title: 'Case memory',
    description: 'Practice your actual memory of Czech vocabulary and conjugations',
    badge: 'Hard',
    color: 'secondary',
  },
];

const WORD_TYPES: { id: WordType | undefined; label: string; examples: string }[] = [
  { id: undefined, label: 'All', examples: 'All word types' },
  { id: 'noun', label: 'Nouns', examples: 'pes, město, žena' },
  { id: 'pronoun', label: 'Pronouns', examples: 'já, ten, kdо' },
  { id: 'adjective', label: 'Adjectives', examples: 'malý, nový, dobrý' },
  { id: 'adverb', label: 'Adverbs', examples: 'rychle, dobře, vždy' },
];

const ALLOW_NEW_WORDS_KEY = 'practice.allowNewWords';

export const PracticeSetup = () => {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<PracticeMode>('case_understanding');
  const [selectedWordType, setSelectedWordType] = useState<WordType | undefined>(undefined);
  const [selectedScope, setSelectedScope] = useState<PracticeScope>('mixed');
  const [allowNewWords, setAllowNewWords] = useState(() => {
    // On by default — only an explicit opt-out turns it off.
    return localStorage.getItem(ALLOW_NEW_WORDS_KEY) !== 'false';
  });

  const handleAllowNewWordsChange = (value: boolean) => {
    setAllowNewWords(value);
    localStorage.setItem(ALLOW_NEW_WORDS_KEY, String(value));
  };

  const { data: eligibility = [] } = useFormRecallEligibleCount();
  const { data: words = [] } = usePracticedWords();

  const fadingCounts = useMemo<Record<EligiblePracticeModes, number>>(
    () => ({
      simple_vocabulary: words.filter((w) => w.sv_status === 'fading').length,
      case_understanding: words.filter((w) => w.cu_status === 'fading').length,
      form_recall: words.filter((w) => w.fr_status === 'fading').length,
    }),
    [words]
  );
  const buildPractice = useBuildPracticeSession();
  const buildVocabulary = useBuildVocabularySession();

  const getEligibleCount = (scope: string, wordType: WordType | undefined) => {
    const wt = wordType ?? 'all';
    return eligibility.find((e) => e.scope === scope && e.word_type === wt)?.eligible_count ?? 0;
  };

  const formRecallLocked = getEligibleCount('mixed', undefined) < FORM_RECALL_MIN;

  const isPending = buildPractice.isPending || buildVocabulary.isPending;

  const buildCards = () =>
    selectedMode === 'simple_vocabulary'
      ? buildVocabulary.mutateAsync({ allowNewWords })
      : buildPractice.mutateAsync({
          mode: selectedMode,
          scope: selectedScope,
          wordType: selectedWordType,
          allowNewWords,
        });

  const handleStart = async () => {
    try {
      const cards = await buildCards();
      // SessionPage redirects back here on an empty session, which looks like
      // a silent reset — explain it instead of navigating.
      if (!cards?.length) {
        toast.info(
          allowNewWords
            ? 'No words to practice right now. Try another mode or word type.'
            : 'No words to review yet. Turn on "Include new words" to start with new ones.'
        );
        return;
      }
      navigate(paths.session, { state: { mode: selectedMode, scope: 'mixed', cards } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not build a practice session.');
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl min-h-0 w-full flex-1 flex-col">
      {/* Scrollable content */}
      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto p-6 pb-2">
        {/* Mode section */}
        <div className="flex flex-col gap-2.5">
          <span className="text-caption font-semibold uppercase tracking-label text-muted-foreground">
            Mode
          </span>
          <div className="grid max-sm:grid-cols-1 grid-cols-3 gap-3">
            {MODES.map((mode) => {
              const isLocked = mode.id === 'form_recall' && formRecallLocked;
              const fadingCount = fadingCounts[mode.id];
              return (
                <ModeCard
                  key={mode.id}
                  title={mode.title}
                  description={mode.description}
                  badge={<Chip label={mode.badge} color={mode.color} />}
                  selected={selectedMode === mode.id}
                  disabled={isLocked}
                  lockedMessage={
                    isLocked
                      ? `${getEligibleCount('mixed', undefined)}/${FORM_RECALL_MIN} words ready in Case Logic`
                      : undefined
                  }
                  onClick={() => !isLocked && setSelectedMode(mode.id)}
                  note={
                    fadingCount > 0 ? (
                      <p className="text-caption text-warning">
                        {fadingCount} fading {fadingCount === 1 ? 'word' : 'words'}
                      </p>
                    ) : null
                  }
                />
              );
            })}
          </div>
        </div>

        <div className="flex flex-col border rounded-xl p-4">
          <label className="flex cursor-pointer items-center justify-between gap-2.5">
            <span className="text-sm text-muted-foreground">Include new words</span>
            <button
              role="switch"
              aria-checked={allowNewWords}
              onClick={() => handleAllowNewWordsChange(!allowNewWords)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors',
                allowNewWords ? 'bg-foreground' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                  allowNewWords ? 'translate-x-5' : 'translate-x-1'
                )}
              />
            </button>
          </label>
        </div>

        {/* Word type section */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between md:justify-start gap-1.5">
            <span className="text-caption font-semibold uppercase tracking-label text-muted-foreground">
              Word Type
            </span>
            {selectedMode === 'form_recall' &&
              WORD_TYPES.some((wt) => getEligibleCount(selectedScope, wt.id) < FORM_RECALL_MIN) && (
                <WarningTooltip message={formRecallConditionMessage} />
              )}
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
            {WORD_TYPES.map((wt) => {
              const unavailable =
                selectedMode === 'form_recall' &&
                getEligibleCount(selectedScope, wt.id) < FORM_RECALL_MIN;
              return (
                <button
                  key={wt.id ?? 'all'}
                  onClick={() => !unavailable && setSelectedWordType(wt.id)}
                  disabled={unavailable}
                  className={cn(
                    'flex flex-col gap-0.5 rounded-2xl border p-3 text-left transition-all md:min-w-30',
                    selectedWordType === wt.id
                      ? 'border-2 border-foreground'
                      : 'border border-border',
                    unavailable && 'cursor-not-allowed opacity-35'
                  )}
                >
                  <span className="text-label font-semibold text-foreground">{wt.label}</span>
                  <span className="text-caption text-muted-foreground">{wt.examples}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Case type section */}
        <div
          className={cn(
            'flex flex-col gap-2.5',
            selectedMode !== 'form_recall' && 'opacity-40 pointer-events-none'
          )}
        >
          <div className="flex items-center justify-between gap-1.5 md:justify-start">
            <div className="flex gap-2">
              <span className="text-caption font-semibold uppercase tracking-label text-muted-foreground">
                Case
              </span>
              {selectedMode !== 'form_recall' && (
                <span className="text-caption text-muted-foreground">
                  available only for Case Memory mode
                </span>
              )}
            </div>
            {selectedMode === 'form_recall' &&
              CASE_TYPES.some(
                (ct) => getEligibleCount(ct.id, selectedWordType) < FORM_RECALL_MIN
              ) && <WarningTooltip message={formRecallConditionMessage} />}
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
            {CASE_TYPES.map((ct) => {
              const unavailable =
                selectedMode === 'form_recall' &&
                getEligibleCount(ct.id, selectedWordType) < FORM_RECALL_MIN;
              return (
                <button
                  key={ct.id}
                  onClick={() => !unavailable && setSelectedScope(ct.id)}
                  disabled={unavailable || selectedMode !== 'form_recall'}
                  className={cn(
                    'flex flex-col gap-0.5 rounded-2xl border p-3 text-left transition-all md:min-w-30',
                    selectedScope === ct.id ? 'border-2 border-foreground' : 'border border-border',
                    unavailable && 'cursor-not-allowed opacity-35'
                  )}
                >
                  <span className="text-label font-semibold text-foreground">{ct.label}</span>
                  <span className="text-caption text-muted-foreground">{ct.prepositions}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky footer — always visible at the bottom */}
      <div className="shrink-0 p-6 pt-4">
        <button
          onClick={handleStart}
          disabled={isPending}
          className="flex h-13 px-6 mx-auto items-center justify-center rounded-[14px] bg-primary text-base font-semibold text-primary-foreground transition-opacity disabled:opacity-60"
        >
          {isPending ? 'Building session…' : 'Start Practice'}
        </button>
      </div>
    </div>
  );
};
