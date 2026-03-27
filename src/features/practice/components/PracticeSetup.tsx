import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { usePracticeBoxCount } from '../hooks/usePracticeBoxCount';
import { useBuildPracticeSession } from '../hooks/useBuildPracticeSession';
import { useBuildVocabularySession } from '../hooks/useBuildVocabularySession';
import { useFormRecallEligibleCount } from '../hooks/useFormRecallEligibleCount';
import type { PracticeMode, PracticeScope, WordType } from '../types';
import { WarningTooltip } from '@/components/WarningTooltip';

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

interface ModeCardProps {
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  selected: boolean;
  disabled?: boolean;
  lockedMessage?: string;
  onClick: () => void;
}

function ModeCard({
  title,
  description,
  badge,
  badgeColor,
  badgeBg,
  selected,
  disabled,
  lockedMessage,
  onClick,
}: ModeCardProps) {
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
      <span
        className="self-start rounded-[10px] px-2 py-0.75 text-caption font-semibold"
        style={{ color: badgeColor, backgroundColor: badgeBg }}
      >
        {badge}
      </span>
    </button>
  );
}

const MODES: {
  id: PracticeMode;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  disabled?: boolean;
}[] = [
  {
    id: 'simple_vocabulary',
    title: 'Simple vocabulary',
    description: 'Recognise Czech words from their English translation',
    badge: 'Easy',
    badgeColor: '#16A34A',
    badgeBg: '#F0FDF4',
  },
  {
    id: 'case_understanding',
    title: 'Case logic',
    description: 'Familiarize yourself with new words and conjugations',
    badge: 'Medium',
    badgeColor: '#7C3AED',
    badgeBg: '#F5F3FF',
  },
  {
    id: 'form_recall',
    title: 'Case memory',
    description: 'Practice your actual memory of Czech vocabulary and conjugations',
    badge: 'Hard',
    badgeColor: '#EA580C',
    badgeBg: '#FFF7ED',
  },
];

const WORD_TYPES: { id: WordType | undefined; label: string; examples: string }[] = [
  { id: undefined, label: 'All', examples: 'All word types' },
  { id: 'noun', label: 'Nouns', examples: 'pes, město, žena' },
  { id: 'pronoun', label: 'Pronouns', examples: 'já, ten, kdо' },
  { id: 'adjective', label: 'Adjectives', examples: 'malý, nový, dobrý' },
  { id: 'adverb', label: 'Adverbs', examples: 'rychle, dobře, vždy' },
];

export function PracticeSetup() {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<PracticeMode>('case_understanding');
  const [selectedWordType, setSelectedWordType] = useState<WordType | undefined>(undefined);
  const [selectedScope, setSelectedScope] = useState<PracticeScope>('mixed');

  const { data: pinnedCount = 0 } = usePracticeBoxCount();
  const { data: eligibility = [] } = useFormRecallEligibleCount();
  const buildPractice = useBuildPracticeSession();
  const buildVocabulary = useBuildVocabularySession();

  const getEligibleCount = (scope: string, wordType: WordType | undefined) => {
    const wt = wordType ?? 'all';
    return eligibility.find((e) => e.scope === scope && e.word_type === wt)?.eligible_count ?? 0;
  };

  const formRecallLocked = getEligibleCount('mixed', undefined) < FORM_RECALL_MIN;

  const isPending = buildPractice.isPending || buildVocabulary.isPending;

  const handleStart = async () => {
    if (selectedMode === 'simple_vocabulary') {
      const cards = await buildVocabulary.mutateAsync();
      navigate('/practice/session', { state: { mode: selectedMode, cards } });
    } else {
      const cards = await buildPractice.mutateAsync({
        mode: selectedMode,
        scope: selectedScope,
        wordType: selectedWordType,
      });
      navigate('/practice/session', { state: { mode: selectedMode, scope: 'mixed', cards } });
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
          <div className="grid max-sm:grid-cols-2 grid-cols-3 gap-3">
            {MODES.map((mode) => {
              const isLocked = mode.id === 'form_recall' && formRecallLocked;
              return (
                <ModeCard
                  title={mode.title}
                  description={mode.description}
                  badge={mode.badge}
                  badgeColor={mode.badgeColor}
                  badgeBg={mode.badgeBg}
                  selected={selectedMode === mode.id}
                  disabled={isLocked}
                  lockedMessage={
                    isLocked
                      ? `${getEligibleCount('mixed', undefined)}/${FORM_RECALL_MIN} words ready in Case Logic`
                      : undefined
                  }
                  onClick={() => !isLocked && setSelectedMode(mode.id)}
                />
              );
            })}
          </div>
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
        {pinnedCount > 0 && (
          <p className="mb-3 text-center text-xs text-muted-foreground">
            {pinnedCount} pinned {pinnedCount === 1 ? 'word' : 'words'} queued
          </p>
        )}
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
}
