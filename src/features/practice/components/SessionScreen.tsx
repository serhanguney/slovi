import { useState, useRef, useEffect } from 'react';
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
  Info,
  GraduationCap,
  Ban,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecordPracticeAnswer } from '../hooks/useRecordPracticeAnswer';
import { useQueryClient } from '@tanstack/react-query';
import { usePracticeProgress } from '../hooks/usePracticeProgress';
import { BlockWordSheet } from './BlockWordSheet';
import { useBlockWord } from '../hooks/useBlockWord';
import type { PracticeCard, PracticeMode } from '../types';
import { SessionWrapper } from './SessionWrapper';
import { ActionRowsContainer } from './ActionRowsContainer';
import { SessionQuestion } from './SessionQuestion';

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
        'flex h-12.5 w-full items-center gap-3 rounded-[14px] border-2 px-4 text-left transition-all',
        state === 'idle' && 'border-border bg-white',
        isSelected && 'border-2 border-foreground bg-white',
        isCorrect && 'border-green-600 bg-green-50',
        isIncorrect && 'border-red-500 bg-red-50'
      )}
    >
      {/* Icon */}
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          (state === 'idle' || isSelected) && 'bg-muted text-muted-foreground',
          isCorrect && 'bg-green-100 text-green-700',
          isIncorrect && 'bg-red-100 text-red-600'
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      {/* Text */}
      <div className="flex flex-1 flex-col">
        <p
          className={cn(
            'text-caption font-semibold leading-tight',
            (state === 'idle' || isSelected) && 'text-foreground',
            isCorrect && 'text-green-700',
            isIncorrect && 'text-red-600'
          )}
        >
          {title}
        </p>
        <p
          className={cn(
            'text-xs leading-tight',
            (state === 'idle' || isSelected) && 'text-muted-foreground',
            isCorrect && 'text-green-600',
            isIncorrect && 'text-red-400'
          )}
        >
          {description}
        </p>
      </div>

      {/* Right indicator */}
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
  card: PracticeCard;
  cardIndex: number;
  total: number;
  isLastCard: boolean;
  isRecording: boolean;
  onAnswer: (selectedCase: string, isCorrect: boolean) => void;
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

  // Pick 6 options once on mount: always include correct answer + 5 random others
  const [options] = useState(() => {
    const correct = CASES.find((c) => normalizeCase(c.id) === normalizeCase(card.correct_case));
    const others = CASES.filter((c) => normalizeCase(c.id) !== normalizeCase(card.correct_case));
    const five = [...others].sort(() => Math.random() - 0.5).slice(0, 5);
    const six = [...five, correct ?? CASES[0]];
    // Preserve the canonical case order defined in CASES
    return six.sort((a, b) => CASES.indexOf(a) - CASES.indexOf(b));
  });

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

      {/* Question area — fixed height to prevent layout shift */}
      <SessionQuestion
        sentence={card.sentence_czech}
        target={card.target_form}
        label={card.in_english}
        description={card.sentence_english}
      />

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
            <Icon className="h-[18px] w-[18px]" />
          </button>
        ))}
      </ActionRowsContainer>

      {/* Spacer — pushes options to bottom */}
      <div className="flex flex-1 items-center">
        {/* Answer options */}
        <div className="shrink-0 flex-1 px-4 pb-3">
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
      </div>

      {/* Button — Continue before submit, Next/Finish after */}
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

// ── Form Recall question screen ────────────────────────────────────────────────

function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function FormRecallQuestionScreen({
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
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (!value.trim() || submitted) return;
    const correct = normalizeAnswer(value) === normalizeAnswer(card.target_form);
    setIsCorrect(correct);
    setSubmitted(true);
    onAnswer(value, correct);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
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

      {/* Question */}
      <SessionQuestion
        sentence={card.sentence_czech}
        target={card.target_form}
        label={card.in_english}
        description={card.sentence_english}
        hidden={!submitted}
      />

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
            <Icon className="h-[18px] w-[18px]" />
          </button>
        ))}
      </ActionRowsContainer>

      {/* Input area */}
      <div className="shrink-0 px-5 pt-4">
        <div
          className={cn(
            'flex h-[52px] w-full items-center justify-between rounded-[12px] border-2 px-4',
            !submitted && 'border-border bg-white',
            submitted && isCorrect && 'border-green-600 bg-green-50',
            submitted && !isCorrect && 'border-red-500 bg-red-50'
          )}
        >
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={submitted}
            placeholder="Type the answer here"
            className={cn(
              'flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground',
              submitted && isCorrect && 'font-semibold text-green-700',
              submitted && !isCorrect && 'font-semibold text-red-600'
            )}
          />
          {submitted && isCorrect && (
            <CircleCheck className="h-[22px] w-[22px] shrink-0 text-green-600" />
          )}
          {submitted && !isCorrect && (
            <CircleX className="h-[22px] w-[22px] shrink-0 text-red-500" />
          )}
        </div>
        {!submitted && (
          <p className="mt-2 text-xs text-muted-foreground">
            You can use all English characters and skip š, á, í, ř, etc.
          </p>
        )}
        {submitted && !isCorrect && (
          <p className="mt-2 text-label font-medium text-green-700">Correct: {card.target_form}</p>
        )}
      </div>

      <div className="flex-1" />

      {/* Button */}
      <div className="shrink-0 px-4 pb-6">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
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

// ── Complete screen ────────────────────────────────────────────────────────────

interface CompleteScreenProps {
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
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

export function CompleteScreen({
  correctCount,
  incorrectCount,
  skippedCount,
  mode,
  onDone,
}: CompleteScreenProps) {
  const { data: progress } = usePracticeProgress();
  const total = correctCount + incorrectCount;
  const sessionPct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const totalAttempts = progress?.[0]?.total_attempts ?? 0;
  const avgAccuracy =
    progress && progress.length > 0
      ? progress.reduce((sum, p) => sum + (p.case_understanding ?? 0), 0) / progress.length
      : 0;
  const modeLabel =
    mode === 'case_understanding'
      ? 'Case Logic'
      : mode === 'simple_vocabulary'
        ? 'Vocabulary'
        : 'Case Memory';

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
        <h2 className="text-center text-[26px] font-bold text-foreground">Session Complete!</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">Great work on this session</p>

        {/* Divider */}
        <div className="my-6 h-px w-full bg-muted" />

        {/* Stats */}
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

        {skippedCount > 0 && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {skippedCount} {skippedCount === 1 ? 'word' : 'words'} skipped
          </p>
        )}

        {/* Divider */}
        <div className="my-6 h-px w-full bg-muted" />

        {/* Session accuracy */}
        <div className="flex items-center justify-between">
          <span className="text-label text-muted-foreground">Session accuracy</span>
          <span className="text-sm font-semibold text-foreground">{sessionPct}%</span>
        </div>

        {/* Skill progress */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-label text-muted-foreground">{modeLabel}</span>
          <span className="text-label font-medium text-muted-foreground">
            {skillProgressLabel(avgAccuracy, totalAttempts)}
          </span>
        </div>

        {/* Done button */}
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

// ── Session screen (main export) ───────────────────────────────────────────────

interface SessionScreenProps {
  cards: PracticeCard[];
  mode: PracticeMode;
}

export function SessionScreen({ cards, mode }: SessionScreenProps) {
  const navigate = useNavigate();
  const recordAnswer = useRecordPracticeAnswer();
  const blockWord = useBlockWord();

  const [activeCards, setActiveCards] = useState(cards);
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<'question' | 'complete'>('question');
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [questionKey, setQuestionKey] = useState(0);
  const [blockSheetOpen, setBlockSheetOpen] = useState(false);

  const queryClient = useQueryClient();

  const currentCard = activeCards[cardIndex];

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
      <div className="flex h-[100dvh] flex-col items-center bg-warning-subtle md:justify-center">
        <CompleteScreen
          correctCount={correctCount}
          incorrectCount={incorrectCount}
          skippedCount={skippedCount}
          mode={mode}
          onDone={handleDone}
        />
      </div>
    );
  }

  const QuestionComponent = mode === 'form_recall' ? FormRecallQuestionScreen : QuestionScreen;

  return (
    <SessionWrapper>
      <QuestionComponent
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
