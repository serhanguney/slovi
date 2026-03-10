import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { usePracticeBoxCount } from '../hooks/usePracticeBoxCount';
import { useBuildPracticeSession } from '../hooks/useBuildPracticeSession';
import { useBuildVocabularySession } from '../hooks/useBuildVocabularySession';
import type { PracticeMode, WordType } from '../types';

interface ModeCardProps {
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  selected: boolean;
  disabled?: boolean;
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
  onClick,
}: ModeCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-[140px] w-full flex-col justify-between rounded-[14px] bg-white p-4 text-left transition-all',
        selected ? 'border-2 border-[#1A1A1A]' : 'border border-[#E5E7EB]',
        disabled && 'cursor-not-allowed opacity-40'
      )}
    >
      <span className="text-[14px] font-bold text-[#1A1A1A]">{title}</span>
      <span className="text-[12px] leading-[1.4] text-[#9CA3AF]">{description}</span>
      <span
        className="self-start rounded-[10px] px-2 py-[3px] text-[11px] font-semibold"
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
    id: 'case_understanding',
    title: 'Case logic',
    description: 'Familiarize yourself with new words and conjugations',
    badge: 'Easy',
    badgeColor: '#16A34A',
    badgeBg: '#F0FDF4',
  },
  {
    id: 'form_recall',
    title: 'Case memory',
    description: 'Practice your actual memory of Czech vocabulary and conjugations',
    badge: 'Hard',
    badgeColor: '#EA580C',
    badgeBg: '#FFF7ED',
    disabled: true,
  },
  {
    id: 'simple_vocabulary',
    title: 'Simple vocabulary',
    description: 'Recognise Czech words from their English translation',
    badge: 'Vocabulary',
    badgeColor: '#7C3AED',
    badgeBg: '#F5F3FF',
    disabled: true,
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

  const { data: pinnedCount = 0 } = usePracticeBoxCount();
  const buildPractice = useBuildPracticeSession();
  const buildVocabulary = useBuildVocabularySession();

  const isPending = buildPractice.isPending || buildVocabulary.isPending;

  const handleStart = async () => {
    if (selectedMode === 'simple_vocabulary') {
      const cards = await buildVocabulary.mutateAsync();
      navigate('/practice/session', { state: { mode: selectedMode, cards } });
    } else {
      const cards = await buildPractice.mutateAsync({
        mode: selectedMode,
        scope: 'mixed',
        wordType: selectedWordType,
      });
      navigate('/practice/session', { state: { mode: selectedMode, scope: 'mixed', cards } });
    }
  };

  return (
    <div className="flex h-full flex-col gap-8 p-6">
      {/* Mode section */}
      <div className="flex flex-col gap-[10px]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#9CA3AF]">
          Mode
        </span>
        <div className="grid grid-cols-2 gap-3">
          {MODES.map((mode) => (
            <ModeCard
              key={mode.id}
              title={mode.title}
              description={mode.description}
              badge={mode.badge}
              badgeColor={mode.badgeColor}
              badgeBg={mode.badgeBg}
              selected={selectedMode === mode.id}
              disabled={mode.disabled}
              onClick={() => setSelectedMode(mode.id)}
            />
          ))}
        </div>
      </div>

      {/* Word type section */}
      <div className="flex flex-col gap-[10px]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#9CA3AF]">
          Word Type
        </span>
        <div className="grid grid-cols-2 gap-2">
          {WORD_TYPES.map((wt) => (
            <button
              key={wt.id ?? 'all'}
              onClick={() => setSelectedWordType(wt.id)}
              className={cn(
                'flex flex-col gap-[2px] rounded-[12px] border p-3 text-left transition-all',
                selectedWordType === wt.id ? 'border-2 border-[#1A1A1A]' : 'border border-[#E5E7EB]'
              )}
            >
              <span className="text-[13px] font-semibold text-[#1A1A1A]">{wt.label}</span>
              <span className="text-[11px] text-[#9CA3AF]">{wt.examples}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Start button pushed to bottom */}
      <div className="mt-auto flex flex-col gap-3">
        {pinnedCount > 0 && (
          <p className="text-center text-[12px] text-[#9CA3AF]">
            {pinnedCount} pinned {pinnedCount === 1 ? 'word' : 'words'} queued
          </p>
        )}
        <button
          onClick={handleStart}
          disabled={isPending}
          className="flex h-[52px] w-full items-center justify-center rounded-[14px] bg-[#FFE59A] text-[16px] font-semibold text-[#000] transition-opacity disabled:opacity-60"
        >
          {isPending ? 'Building session…' : 'Start Practice'}
        </button>
      </div>
    </div>
  );
}
