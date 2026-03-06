import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  CircleCheck,
  CircleX,
  Trophy,
  MapPin,
  User,
  ArrowRight,
  Target,
  MessageCircle,
  Wrench,
  GitBranch,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecordPracticeAnswer } from '../hooks/useRecordPracticeAnswer';
import { useQueryClient } from '@tanstack/react-query';
import { usePracticeProgress } from '../hooks/usePracticeProgress';
import type { PracticeCard, PracticeMode } from '../types';

// ── Czech cases ────────────────────────────────────────────────────────────────

const CASES: { id: string; title: string; description: string; Icon: LucideIcon }[] = [
  { id: 'Nominative', title: 'Nominative', description: 'Subject of the sentence', Icon: User },
  {
    id: 'Accusative',
    title: 'Accusative',
    description: 'Direct object, motion toward',
    Icon: Target,
  },
  { id: 'Genitive', title: 'Genitive', description: 'Possession, negation, "of"', Icon: GitBranch },
  { id: 'Dative', title: 'Dative', description: 'Indirect object, "to/for"', Icon: ArrowRight },
  { id: 'Locative', title: 'Locative', description: 'Location, "about/in/on"', Icon: MapPin },
  {
    id: 'Instrumental',
    title: 'Instrumental',
    description: 'Means, manner, "by/with"',
    Icon: Wrench,
  },
  { id: 'Vocative', title: 'Vocative', description: 'Direct address', Icon: MessageCircle },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function splitSentence(
  sentence: string,
  targetForm: string
): { before: string; match: string; after: string } {
  const lower = sentence.toLowerCase();
  const idx = lower.indexOf(targetForm.toLowerCase());
  if (idx === -1) return { before: sentence, match: '', after: '' };
  return {
    before: sentence.slice(0, idx),
    match: sentence.slice(idx, idx + targetForm.length),
    after: sentence.slice(idx + targetForm.length),
  };
}

function normalizeCase(value: string) {
  return value.trim().toLowerCase();
}

// ── Option card ────────────────────────────────────────────────────────────────

interface OptionCardProps {
  caseItem: (typeof CASES)[number];
  state: 'idle' | 'selected' | 'correct' | 'incorrect' | 'show-correct';
  disabled: boolean;
  onClick: () => void;
}

function OptionCard({ caseItem, state, disabled, onClick }: OptionCardProps) {
  const { Icon, title, description } = caseItem;

  const isSelected = state === 'selected';
  const isCorrect = state === 'correct' || state === 'show-correct';
  const isIncorrect = state === 'incorrect';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-[50px] w-full items-center gap-3 rounded-[14px] border-2 px-4 text-left transition-all',
        state === 'idle' && 'border-[#E5E7EB] bg-white',
        isSelected && 'border-2 border-[#1A1A1A] bg-white',
        isCorrect && 'border-green-600 bg-green-50',
        isIncorrect && 'border-red-500 bg-red-50'
      )}
    >
      {/* Icon */}
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          (state === 'idle' || isSelected) && 'bg-[#F3F4F6] text-[#6B7280]',
          isCorrect && 'bg-green-100 text-green-700',
          isIncorrect && 'bg-red-100 text-red-600'
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      {/* Text */}
      <div className="flex flex-1 flex-col">
        <span
          className={cn(
            'text-[13px] font-semibold leading-tight',
            (state === 'idle' || isSelected) && 'text-[#1A1A1A]',
            isCorrect && 'text-green-700',
            isIncorrect && 'text-red-600'
          )}
        >
          {title}
        </span>
        <span
          className={cn(
            'text-[11px] leading-tight',
            (state === 'idle' || isSelected) && 'text-[#9CA3AF]',
            isCorrect && 'text-green-600',
            isIncorrect && 'text-red-400'
          )}
        >
          {description}
        </span>
      </div>

      {/* Right indicator */}
      <span className="shrink-0">
        {state === 'idle' && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#D1D5DB]" />
        )}
        {isSelected && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#1A1A1A] bg-[#FFE59A]" />
        )}
        {isCorrect && <CircleCheck className="h-5 w-5 text-green-600" />}
        {isIncorrect && <CircleX className="h-5 w-5 text-red-500" />}
      </span>
    </button>
  );
}

// ── Question screen ────────────────────────────────────────────────────────────

interface QuestionScreenProps {
  card: PracticeCard;
  cardIndex: number;
  total: number;
  isLastCard: boolean;
  isRecording: boolean;
  onAnswer: (selectedCase: string, isCorrect: boolean) => void;
  onNext: () => void;
  onExit: () => void;
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
}: QuestionScreenProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Pick 6 options once on mount: always include correct answer + 5 random others
  const [options] = useState(() => {
    const correct = CASES.find((c) => normalizeCase(c.id) === normalizeCase(card.correct_case));
    const others = CASES.filter((c) => normalizeCase(c.id) !== normalizeCase(card.correct_case));
    const five = [...others].sort(() => Math.random() - 0.5).slice(0, 5);
    const six = [...five, correct ?? CASES[0]];
    // Preserve the canonical case order defined in CASES
    return six.sort((a, b) => CASES.indexOf(a) - CASES.indexOf(b));
  });

  const { before, match, after } = splitSentence(card.sentence_czech, card.target_form);

  const getState = (caseId: string): OptionCardProps['state'] => {
    if (!submitted) {
      return normalizeCase(caseId) === normalizeCase(selectedOption ?? '') ? 'selected' : 'idle';
    }
    const isCorrect = normalizeCase(caseId) === normalizeCase(card.correct_case);
    if (normalizeCase(caseId) === normalizeCase(selectedOption!)) {
      return isCorrect ? 'correct' : 'incorrect';
    }
    if (isCorrect) return 'show-correct';
    return 'idle';
  };

  const handleContinue = () => {
    if (!selectedOption || submitted) return;
    const isCorrect = normalizeCase(selectedOption) === normalizeCase(card.correct_case);
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
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-[#F3F4F6]"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-medium text-[#6B7280]">
          {cardIndex + 1}/{total}
        </span>
        <div className="h-8 w-8" />
      </div>

      {/* Progress bar */}
      <div className="shrink-0 px-4 pb-2">
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-[#E5E7EB]">
          <div
            className="h-full rounded-full bg-[#1A1A1A] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question area — fixed height to prevent layout shift */}
      <div className="shrink-0 px-4 py-4">
        <p className="line-clamp-2 h-[50px] text-[18px] leading-snug text-[#1A1A1A]">
          {before}
          <span className="font-bold">{match}</span>
          {after}
        </p>
        <p className="mt-1.5 line-clamp-2 h-[39px] text-[13px] leading-normal text-[#9CA3AF]">
          {card.sentence_english}
        </p>
      </div>

      {/* Spacer — pushes options to bottom */}
      <div className="flex-1" />

      {/* Answer options */}
      <div className="shrink-0 px-4 pb-3">
        <div className="flex flex-col gap-2">
          {options.map((c) => (
            <OptionCard
              key={c.id}
              caseItem={c}
              state={getState(c.id)}
              disabled={submitted}
              onClick={() => !submitted && setSelectedOption(c.id)}
            />
          ))}
        </div>
      </div>

      {/* Button — Continue before submit, Next/Finish after */}
      <div className="shrink-0 px-4 pb-6">
        {!submitted ? (
          <button
            onClick={handleContinue}
            disabled={!selectedOption}
            className="flex h-[52px] w-full items-center justify-center rounded-[16px] bg-[#1A1A1A] text-[16px] font-semibold text-white transition-opacity disabled:opacity-30"
          >
            Continue →
          </button>
        ) : (
          <button
            onClick={onNext}
            disabled={isRecording}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#1A1A1A] text-[16px] font-semibold text-white transition-opacity disabled:opacity-60"
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

// ── Complete screen ────────────────────────────────────────────────────────────

interface CompleteScreenProps {
  correctCount: number;
  incorrectCount: number;
  mode: PracticeMode;
  onDone: () => void;
}

function skillProgressLabel(accuracy: number, attempts: number): string {
  if (attempts < 30) return 'Keep practicing';
  if (accuracy < 0.5) return 'Low — keep going';
  if (accuracy < 0.75) return 'Improving';
  if (accuracy < 0.9) return 'Good';
  return 'Strong';
}

function CompleteScreen({ correctCount, incorrectCount, mode, onDone }: CompleteScreenProps) {
  const { data: progress } = usePracticeProgress();
  const total = correctCount + incorrectCount;
  const sessionPct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const totalAttempts = progress?.[0]?.total_attempts ?? 0;
  const avgAccuracy =
    progress && progress.length > 0
      ? progress.reduce((sum, p) => sum + (p.case_understanding ?? 0), 0) / progress.length
      : 0;
  const modeLabel = mode === 'case_understanding' ? 'Case Logic' : 'Case Memory';

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-[24px] bg-white p-8">
        {/* Trophy */}
        <div className="mb-5 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <Trophy className="h-8 w-8 text-green-600" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-center text-[26px] font-bold text-[#1A1A1A]">Session Complete!</h2>
        <p className="mt-2 text-center text-[14px] text-[#9CA3AF]">Great work on this session</p>

        {/* Divider */}
        <div className="my-6 h-px w-full bg-[#F3F4F6]" />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center gap-2 rounded-[14px] bg-green-50 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <CircleCheck className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-[22px] font-bold text-[#1A1A1A]">{correctCount}</span>
            <span className="text-[12px] text-green-600">Correct</span>
          </div>

          <div className="flex flex-col items-center gap-2 rounded-[14px] bg-red-50 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
              <CircleX className="h-4 w-4 text-red-500" />
            </div>
            <span className="text-[22px] font-bold text-[#1A1A1A]">{incorrectCount}</span>
            <span className="text-[12px] text-red-500">Incorrect</span>
          </div>
        </div>

        {/* Divider */}
        <div className="my-6 h-px w-full bg-[#F3F4F6]" />

        {/* Session accuracy */}
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-[#6B7280]">Session accuracy</span>
          <span className="text-[15px] font-semibold text-[#1A1A1A]">{sessionPct}%</span>
        </div>

        {/* Skill progress */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[13px] text-[#6B7280]">{modeLabel}</span>
          <span className="text-[13px] font-medium text-[#6B7280]">
            {skillProgressLabel(avgAccuracy, totalAttempts)}
          </span>
        </div>

        {/* Done button */}
        <button
          onClick={onDone}
          className="mt-6 flex h-[52px] w-full items-center justify-center rounded-[16px] bg-[#1A1A1A] text-[16px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Done →
        </button>
      </div>
    </div>
  );
}

// ── Session screen (main export) ───────────────────────────────────────────────

interface SessionScreenProps {
  cards: PracticeCard[];
  mode: PracticeMode;
}

export function SessionScreen({ cards, mode }: SessionScreenProps) {
  const navigate = useNavigate();
  const recordAnswer = useRecordPracticeAnswer();

  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<'question' | 'complete'>('question');
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [questionKey, setQuestionKey] = useState(0);

  const queryClient = useQueryClient();

  const currentCard = cards[cardIndex];

  const handleAnswer = (_selectedCase: string, isCorrect: boolean) => {
    if (isCorrect) setCorrectCount((n) => n + 1);
    else setIncorrectCount((n) => n + 1);

    recordAnswer.mutate({
      p_word_form_id: currentCard.word_form_id,
      p_mode: mode,
      p_is_correct: isCorrect,
    });
  };

  const handleNext = () => {
    const nextIndex = cardIndex + 1;
    if (nextIndex >= cards.length) {
      queryClient.invalidateQueries({ queryKey: ['practice-progress'] });
      setPhase('complete');
    } else {
      setCardIndex(nextIndex);
      setQuestionKey((k) => k + 1);
    }
  };

  const handleExit = () => navigate('/practice');
  const handleDone = () => navigate('/practice');

  if (phase === 'complete') {
    return (
      <div className="flex h-[100dvh] flex-col bg-[#FEF7EE]">
        <CompleteScreen
          correctCount={correctCount}
          incorrectCount={incorrectCount}
          mode={mode}
          onDone={handleDone}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-[#FEF7EE]">
      <QuestionScreen
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
    </div>
  );
}
