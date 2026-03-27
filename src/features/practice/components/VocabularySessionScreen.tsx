import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  CircleCheck,
  CircleX,
  Crosshair,
  Info,
  GraduationCap,
  Ban,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecordPracticeAnswer } from '../hooks/useRecordPracticeAnswer';
import { useBlockWord } from '../hooks/useBlockWord';
import { useQueryClient } from '@tanstack/react-query';
import { BlockWordSheet } from './BlockWordSheet';
import { CompleteScreen } from './SessionScreen';
import type { VocabularyCard } from '../types';
import { SessionWrapper } from './SessionWrapper';
import { ActionRowsContainer } from './ActionRowsContainer';
import { SessionQuestion } from './SessionQuestion';

// ── Option card ────────────────────────────────────────────────────────────────

type OptionState = 'idle' | 'selected' | 'correct' | 'incorrect' | 'show-correct';

interface VocabularyOptionCardProps {
  label: string;
  state: OptionState;
  disabled: boolean;
  onClick: () => void;
}

function VocabularyOptionCard({ label, state, disabled, onClick }: VocabularyOptionCardProps) {
  const isCorrect = state === 'correct' || state === 'show-correct';
  const isIncorrect = state === 'incorrect';
  const isSelected = state === 'selected';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-12.5 w-full items-center gap-3 rounded-[14px] border-2 px-4 text-left transition-all',
        state === 'idle' && 'border-border bg-white',
        isSelected && 'border-foreground bg-white',
        isCorrect && 'border-green-600 bg-green-50',
        isIncorrect && 'border-red-500 bg-red-50'
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          (state === 'idle' || isSelected) && 'bg-muted text-muted-foreground',
          isCorrect && 'bg-green-100 text-green-700',
          isIncorrect && 'bg-red-100 text-red-600'
        )}
      >
        <Crosshair className="h-4 w-4" />
      </span>

      <span
        className={cn(
          'flex-1 text-label font-semibold',
          (state === 'idle' || isSelected) && 'text-foreground',
          isCorrect && 'text-green-700',
          isIncorrect && 'text-red-600'
        )}
      >
        {label}
      </span>

      <span className="shrink-0">
        {state === 'idle' && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-border" />
        )}
        {isSelected && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-foreground bg-primary" />
        )}
        {isCorrect && <CircleCheck className="h-5 w-5 text-green-600" />}
        {isIncorrect && <CircleX className="h-5 w-5 text-red-500" />}
      </span>
    </button>
  );
}

// ── Question screen ────────────────────────────────────────────────────────────

interface QuestionScreenProps {
  card: VocabularyCard;
  cardIndex: number;
  total: number;
  isLastCard: boolean;
  isRecording: boolean;
  onAnswer: (selected: string, isCorrect: boolean) => void;
  onNext: () => void;
  onExit: () => void;
  onBlockWord: () => void;
}

function QuestionScreen({
  card,
  cardIndex,
  total,
  isLastCard,
  isRecording,
  onAnswer,
  onNext,
  onExit,
  onBlockWord,
}: QuestionScreenProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [options] = useState(() => {
    const all = [card.in_english, ...card.distractors.slice(0, 5)];
    return all.sort(() => Math.random() - 0.5);
  });

  const getState = (option: string): OptionState => {
    if (!submitted) return option === selectedOption ? 'selected' : 'idle';
    if (option === card.in_english) return option === selectedOption ? 'correct' : 'show-correct';
    if (option === selectedOption) return 'incorrect';
    return 'idle';
  };

  const handleContinue = () => {
    if (!selectedOption || submitted) return;
    const isCorrect = selectedOption === card.in_english;
    setSubmitted(true);
    onAnswer(selectedOption, isCorrect);
  };

  const progress = ((cardIndex + 1) / total) * 100;

  return (
    <div className="flex flex-1 flex-col">
      {/* TopBar */}
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <button
          onClick={onExit}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-label font-medium text-muted-foreground">
          {cardIndex + 1}/{total}
        </span>
        <div className="h-8 w-8" />
      </div>

      {/* Progress bar */}
      <div className="shrink-0 px-4 pb-2">
        <div className="h-0.75 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-foreground transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <SessionQuestion sentence={card.sentence_czech} target={card.target_form} />

      {/* Action row */}
      <ActionRowsContainer>
        {(
          [
            { icon: Info, label: 'Info', onClick: () => {} },
            { icon: GraduationCap, label: 'Study', onClick: () => {} },
            { icon: Ban, label: 'Block', onClick: onBlockWord },
          ] as { icon: LucideIcon; label: string; onClick: () => void }[]
        ).map(({ icon: Icon, label, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            aria-label={label}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#CBCCC9] bg-white text-muted-foreground transition-colors hover:bg-muted"
          >
            <Icon className="h-4.5 w-4.5" />
          </button>
        ))}
      </ActionRowsContainer>

      <div className="flex flex-1 items-center">
        {/* Answer options */}
        <div className="shrink-0 flex-1 px-4 pb-3">
          <div className="flex flex-col gap-2">
            {options.map((opt) => (
              <VocabularyOptionCard
                key={opt}
                label={opt}
                state={getState(opt)}
                disabled={submitted}
                onClick={() => !submitted && setSelectedOption(opt)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Continue / Next button */}
      <div className="shrink-0 px-4 pb-6">
        {!submitted ? (
          <button
            onClick={handleContinue}
            disabled={!selectedOption}
            className="flex h-13 w-full items-center justify-center rounded-3xl bg-foreground text-base font-semibold text-white transition-opacity disabled:opacity-30"
          >
            Continue →
          </button>
        ) : (
          <button
            onClick={onNext}
            disabled={isRecording}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-foreground text-base font-semibold text-white transition-opacity disabled:opacity-60"
          >
            {isRecording ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isLastCard ? (
              'Finish →'
            ) : (
              'Next →'
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Session screen ─────────────────────────────────────────────────────────────

interface VocabularySessionScreenProps {
  cards: VocabularyCard[];
}

export function VocabularySessionScreen({ cards }: VocabularySessionScreenProps) {
  const navigate = useNavigate();
  const recordAnswer = useRecordPracticeAnswer();
  const blockWord = useBlockWord();
  const queryClient = useQueryClient();

  const [activeCards, setActiveCards] = useState(cards);
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<'question' | 'complete'>('question');
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [questionKey, setQuestionKey] = useState(0);
  const [blockSheetOpen, setBlockSheetOpen] = useState(false);

  const currentCard = activeCards[cardIndex];

  const handleAnswer = (_selected: string, isCorrect: boolean) => {
    if (isCorrect) setCorrectCount((n) => n + 1);
    else setIncorrectCount((n) => n + 1);

    recordAnswer.mutate({
      p_word_form_id: currentCard.word_form_id,
      p_mode: 'simple_vocabulary',
      p_is_correct: isCorrect,
    });
  };

  const handleNext = () => {
    const nextIndex = cardIndex + 1;
    if (nextIndex >= activeCards.length) {
      queryClient.invalidateQueries({ queryKey: ['practice-progress'] });
      setPhase('complete');
    } else {
      setCardIndex(nextIndex);
      setQuestionKey((k) => k + 1);
    }
  };

  const handleBlockConfirm = () => {
    const blockedId = currentCard.root_word_id;
    const skipped = activeCards.filter(
      (c, i) => i >= cardIndex && c.root_word_id === blockedId
    ).length;
    const newCards = activeCards.filter((c, i) => i < cardIndex || c.root_word_id !== blockedId);
    blockWord.mutate(blockedId);
    setSkippedCount((n) => n + skipped);
    setActiveCards(newCards);
    setBlockSheetOpen(false);
    if (cardIndex >= newCards.length) {
      queryClient.invalidateQueries({ queryKey: ['practice-progress'] });
      setPhase('complete');
    } else {
      setQuestionKey((k) => k + 1);
    }
  };

  const handleExit = () => navigate('/practice');
  const handleDone = () => navigate('/practice');

  if (phase === 'complete') {
    return (
      <div className="flex h-dvh flex-col items-center bg-warning-subtle md:justify-center">
        <CompleteScreen
          correctCount={correctCount}
          incorrectCount={incorrectCount}
          skippedCount={skippedCount}
          mode="simple_vocabulary"
          onDone={handleDone}
        />
      </div>
    );
  }

  return (
    <SessionWrapper>
      <QuestionScreen
        key={questionKey}
        card={currentCard}
        cardIndex={cardIndex}
        total={activeCards.length}
        isLastCard={cardIndex + 1 >= activeCards.length}
        isRecording={recordAnswer.isPending}
        onAnswer={handleAnswer}
        onNext={handleNext}
        onExit={handleExit}
        onBlockWord={() => setBlockSheetOpen(true)}
      />
      <BlockWordSheet
        open={blockSheetOpen}
        word={currentCard.base_form}
        onClose={() => setBlockSheetOpen(false)}
        onConfirm={handleBlockConfirm}
        isPending={blockWord.isPending}
      />
    </SessionWrapper>
  );
}
