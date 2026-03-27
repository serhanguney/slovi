import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CircleCheck, CircleX, Crosshair, Loader2, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecordPracticeAnswer } from '../hooks/useRecordPracticeAnswer';
import type { CaseStudyCard } from '../types';
import { SessionWrapper } from './SessionWrapper';

// ── Option card ────────────────────────────────────────────────────────────────

type OptionState = 'idle' | 'selected' | 'correct' | 'incorrect' | 'show-correct';

interface CaseStudyOptionCardProps {
  label: string;
  state: OptionState;
  disabled: boolean;
  onClick: () => void;
}

function CaseStudyOptionCard({ label, state, disabled, onClick }: CaseStudyOptionCardProps) {
  const isCorrect = state === 'correct' || state === 'show-correct';
  const isIncorrect = state === 'incorrect';
  const isSelected = state === 'selected';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-[50px] w-full items-center gap-3 rounded-[14px] border-2 px-4 text-left transition-all',
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

interface CaseStudyQuestionScreenProps {
  card: CaseStudyCard;
  cardIndex: number;
  total: number;
  isLastCard: boolean;
  isRecording: boolean;
  onAnswer: (selected: string, isCorrect: boolean) => void;
  onNext: () => void;
  onExit: () => void;
}

function CaseStudyQuestionScreen({
  card,
  cardIndex,
  total,
  isLastCard,
  isRecording,
  onAnswer,
  onNext,
  onExit,
}: CaseStudyQuestionScreenProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [options] = useState(() => [...card.options].sort(() => Math.random() - 0.5));

  const getState = (option: string): OptionState => {
    if (!submitted) return option === selectedOption ? 'selected' : 'idle';
    if (option === card.target_form) return option === selectedOption ? 'correct' : 'show-correct';
    if (option === selectedOption) return 'incorrect';
    return 'idle';
  };

  const handleContinue = () => {
    if (!selectedOption || submitted) return;
    const isCorrect = selectedOption === card.target_form;
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
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-foreground transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question prompt */}
      <div className="shrink-0 px-4 pt-2">
        <p className="flex flex-wrap items-center gap-2 text-xl text-foreground">
          <span>What is the</span>
          <span className="inline-flex items-center rounded-[8px] border border-border bg-white px-2 py-0.5 text-[18px] text-foreground">
            {card.correct_case}
          </span>
          <span className="inline-flex items-center rounded-[8px] border border-border bg-white px-2 py-0.5 text-[18px] text-foreground">
            {card.plurality}
          </span>
          {card.gender && (
            <span className="inline-flex items-center rounded-[8px] border border-border bg-white px-2 py-0.5 text-[18px] text-foreground">
              {card.gender}
            </span>
          )}
          <span>form of</span>
          <span className="inline-flex items-center rounded-[8px] border border-border bg-white px-2 py-0.5 text-[18px] text-foreground">
            {card.base_form}
          </span>
          <span>?</span>
        </p>
      </div>

      <div className="flex flex-1 items-center">
        <div className="shrink-0 flex-1 px-4 pb-3">
          <div className="flex flex-col gap-2">
            {options.map((opt) => (
              <CaseStudyOptionCard
                key={opt}
                label={opt}
                state={getState(opt)}
                disabled={submitted}
                onClick={() => !submitted && setSelectedOption(opt)}
              />
            ))}
          </div>

          {/* Explanation shown after submission */}
          {submitted && card.explanation && (
            <p className="mt-3 text-label leading-relaxed text-muted-foreground">
              {card.explanation}
            </p>
          )}
        </div>
      </div>

      {/* Continue / Next button */}
      <div className="shrink-0 px-4 pb-6">
        {!submitted ? (
          <button
            onClick={handleContinue}
            disabled={!selectedOption}
            className="flex h-[52px] w-full items-center justify-center rounded-[16px] bg-foreground text-base font-semibold text-white transition-opacity disabled:opacity-30"
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

// ── Inline complete screen ─────────────────────────────────────────────────────

interface CaseStudyCompleteScreenProps {
  correctCount: number;
  incorrectCount: number;
  onDone: () => void;
}

function CaseStudyCompleteScreen({
  correctCount,
  incorrectCount,
  onDone,
}: CaseStudyCompleteScreenProps) {
  const total = correctCount + incorrectCount;
  const sessionPct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-[24px] bg-white p-8">
        <div className="mb-5 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <Trophy className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <h2 className="text-center text-[26px] font-bold text-foreground">Session Complete!</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">Great work on this session</p>

        <div className="my-6 h-px w-full bg-muted" />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center gap-2 rounded-[14px] bg-green-50 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <CircleCheck className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-[22px] font-bold text-foreground">{correctCount}</span>
            <span className="text-xs text-green-600">Correct</span>
          </div>

          <div className="flex flex-col items-center gap-2 rounded-[14px] bg-red-50 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
              <CircleX className="h-4 w-4 text-red-500" />
            </div>
            <span className="text-[22px] font-bold text-foreground">{incorrectCount}</span>
            <span className="text-xs text-red-500">Incorrect</span>
          </div>
        </div>

        <div className="my-6 h-px w-full bg-muted" />

        <div className="flex items-center justify-between">
          <span className="text-label text-muted-foreground">Session accuracy</span>
          <span className="text-sm font-semibold text-foreground">{sessionPct}%</span>
        </div>

        <button
          onClick={onDone}
          className="mt-6 flex h-[52px] w-full items-center justify-center rounded-[16px] bg-foreground text-base font-semibold text-white transition-opacity hover:opacity-90"
        >
          Done →
        </button>
      </div>
    </div>
  );
}

// ── Session screen ─────────────────────────────────────────────────────────────

interface CaseStudySessionScreenProps {
  cards: CaseStudyCard[];
}

export function CaseStudySessionScreen({ cards }: CaseStudySessionScreenProps) {
  const navigate = useNavigate();
  const recordAnswer = useRecordPracticeAnswer();

  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<'question' | 'complete'>('question');
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [questionKey, setQuestionKey] = useState(0);

  const currentCard = cards[cardIndex];

  const handleAnswer = (_selected: string, isCorrect: boolean) => {
    if (isCorrect) setCorrectCount((n) => n + 1);
    else setIncorrectCount((n) => n + 1);

    recordAnswer.mutate({
      p_word_form_id: currentCard.word_form_id,
      p_mode: 'case_study',
      p_is_correct: isCorrect,
    });
  };

  const handleNext = () => {
    const nextIndex = cardIndex + 1;
    if (nextIndex >= cards.length) {
      setPhase('complete');
    } else {
      setCardIndex(nextIndex);
      setQuestionKey((k) => k + 1);
    }
  };

  const handleExit = () => navigate(-1);
  const handleDone = () => navigate(`/word/${cards[0].root_word_id}`, { replace: true });

  if (phase === 'complete') {
    return (
      <div className="flex h-[100dvh] flex-col items-center bg-warning-subtle md:justify-center">
        <CaseStudyCompleteScreen
          correctCount={correctCount}
          incorrectCount={incorrectCount}
          onDone={handleDone}
        />
      </div>
    );
  }

  return (
    <SessionWrapper>
      <CaseStudyQuestionScreen
        key={questionKey}
        card={currentCard}
        cardIndex={cardIndex}
        total={cards.length}
        isLastCard={cardIndex + 1 >= cards.length}
        isRecording={recordAnswer.isPending}
        onAnswer={handleAnswer}
        onNext={handleNext}
        onExit={handleExit}
      />
    </SessionWrapper>
  );
}
