import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecordPracticeAnswer } from '../hooks/useRecordPracticeAnswer';
import type { CaseStudyCard } from '../types';
import { SessionWrapper } from './SessionWrapper';
import { ChoiceOptionCard, type OptionState } from './ChoiceOptionCard';
import { SessionCompleteCard } from './SessionCompleteCard';

// ── Question screen ────────────────────────────────────────────────────────────

type CaseStudyQuestionScreenProps = {
  card: CaseStudyCard;
  cardIndex: number;
  total: number;
  isLastCard: boolean;
  isRecording: boolean;
  onAnswer: (selected: string, isCorrect: boolean) => void;
  onNext: () => void;
  onExit: () => void;
};

const CaseStudyQuestionScreen = ({
  card,
  cardIndex,
  total,
  isLastCard,
  isRecording,
  onAnswer,
  onNext,
  onExit,
}: CaseStudyQuestionScreenProps) => {
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
        {card.sentence_czech && (
          <div className={cn('mt-3', submitted ? 'animate-in fade-in duration-500' : 'opacity-0')}>
            <p className="text-caption italic text-muted-foreground">{card.sentence_czech}</p>
            {card.sentence_english && (
              <p className="text-caption text-muted-foreground/60">{card.sentence_english}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 items-center">
        <div className="shrink-0 flex-1 px-4 pb-3">
          <div className="flex flex-col gap-2">
            {options.map((opt) => (
              <ChoiceOptionCard
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
};

// ── Session screen ─────────────────────────────────────────────────────────────

type CaseStudySessionScreenProps = {
  cards: CaseStudyCard[];
};

export const CaseStudySessionScreen = ({ cards }: CaseStudySessionScreenProps) => {
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
        <SessionCompleteCard
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
};
