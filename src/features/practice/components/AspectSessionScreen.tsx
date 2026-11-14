import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2 } from 'lucide-react';
import { paths } from '@/features/routes/paths';
import { useRecordPracticeAnswer } from '../hooks/useRecordPracticeAnswer';
import { segmentSentence } from '../aspectSentence';
import type { AspectCard } from '../types';
import { SessionWrapper } from './SessionWrapper';
import { ChoiceOptionCard, type OptionState } from './ChoiceOptionCard';
import { SessionCompleteCard } from './SessionCompleteCard';

const ASPECT_LABEL: Record<string, string> = {
  imperfective: 'imperfective',
  perfective: 'perfective',
};

type Option = { form: string; aspect: string };

const optionsOf = (card: AspectCard): Option[] => {
  const otherAspect = card.answer_aspect === 'perfective' ? 'imperfective' : 'perfective';
  const options = [
    { form: card.answer_form, aspect: card.answer_aspect },
    { form: card.distractor_form, aspect: otherAspect },
  ];
  return Math.random() < 0.5 ? options : [...options].reverse();
};

// ── Sentence ──────────────────────────────────────────────────────────────────

/** The sentence with the verb blanked; after answering, the answer and its signal are marked. */
const AspectSentence = ({ card, submitted }: { card: AspectCard; submitted: boolean }) => (
  <p className="text-xl leading-relaxed text-foreground">
    {segmentSentence(card.sentence_czech, card.answer_form, card.signal).map((segment, index) => {
      if (segment.kind === 'answer') {
        return submitted ? (
          <strong key={index} className="font-semibold text-success">
            {segment.text}
          </strong>
        ) : (
          <span
            key={index}
            aria-label="blank"
            className="inline-block w-20 border-b-2 border-foreground align-baseline"
          >
            &nbsp;
          </span>
        );
      }
      if (segment.kind === 'signal' && submitted) {
        return (
          <mark key={index} className="rounded-sm bg-warning-subtle px-0.5 text-foreground">
            {segment.text}
          </mark>
        );
      }
      return <span key={index}>{segment.text}</span>;
    })}
  </p>
);

// ── Question screen ────────────────────────────────────────────────────────────

type AspectQuestionScreenProps = {
  card: AspectCard;
  cardIndex: number;
  total: number;
  isLastCard: boolean;
  isRecording: boolean;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  onExit: () => void;
};

const AspectQuestionScreen = ({
  card,
  cardIndex,
  total,
  isLastCard,
  isRecording,
  onAnswer,
  onNext,
  onExit,
}: AspectQuestionScreenProps) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [options] = useState(() => optionsOf(card));

  const getState = (form: string): OptionState => {
    if (!submitted) return form === selected ? 'selected' : 'idle';
    if (form === card.answer_form) return form === selected ? 'correct' : 'show-correct';
    if (form === selected) return 'incorrect';
    return 'idle';
  };

  const handleContinue = () => {
    if (!selected || submitted) return;
    setSubmitted(true);
    onAnswer(selected === card.answer_form);
  };

  const progress = ((cardIndex + 1) / total) * 100;

  return (
    <div className="flex flex-1 flex-col">
      {/* TopBar */}
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <button
          onClick={onExit}
          aria-label="Exit session"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="text-label font-medium text-muted-foreground">
          {cardIndex + 1}/{total}
        </p>
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

      {/* Prompt + sentence */}
      <div className="flex shrink-0 flex-col gap-3 px-4 pt-2">
        <p className="text-caption font-semibold uppercase tracking-label text-muted-foreground">
          Which verb fits? · {card.imperfective} / {card.perfective}
        </p>
        <AspectSentence card={card} submitted={submitted} />
        {submitted && (
          <div className="flex flex-col gap-1 animate-in fade-in duration-500">
            <p className="text-sm text-muted-foreground">{card.sentence_english}</p>
            <p className="text-label leading-relaxed text-foreground">{card.explanation}</p>
          </div>
        )}
      </div>

      <div className="flex flex-1 items-center">
        <div className="flex flex-1 flex-col gap-2 px-4 pb-3">
          {options.map((option) => (
            <ChoiceOptionCard
              key={option.form}
              label={option.form}
              hint={ASPECT_LABEL[option.aspect] ?? option.aspect}
              state={getState(option.form)}
              disabled={submitted}
              onClick={() => !submitted && setSelected(option.form)}
            />
          ))}
        </div>
      </div>

      {/* Continue / Next button */}
      <div className="shrink-0 px-4 pb-6">
        {!submitted ? (
          <button
            onClick={handleContinue}
            disabled={!selected}
            className="flex h-13 w-full items-center justify-center rounded-2xl bg-foreground text-base font-semibold text-background transition-opacity disabled:opacity-30"
          >
            Continue →
          </button>
        ) : (
          <button
            onClick={onNext}
            disabled={isRecording}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-foreground text-base font-semibold text-background transition-opacity disabled:opacity-60"
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

export const AspectSessionScreen = ({ cards }: { cards: AspectCard[] }) => {
  const navigate = useNavigate();
  const recordAnswer = useRecordPracticeAnswer();

  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<'question' | 'complete'>('question');
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);

  const currentCard = cards[cardIndex];

  const handleAnswer = (isCorrect: boolean) => {
    if (isCorrect) setCorrectCount((n) => n + 1);
    else setIncorrectCount((n) => n + 1);
    if (!currentCard) return;
    recordAnswer.mutate({
      p_word_form_id: currentCard.word_form_id,
      p_mode: 'aspect_choice',
      p_is_correct: isCorrect,
    });
  };

  const handleNext = () => {
    if (cardIndex + 1 >= cards.length) setPhase('complete');
    else setCardIndex(cardIndex + 1);
  };

  const handleExit = () => navigate(paths.practice);

  if (phase === 'complete' || !currentCard) {
    return (
      <div className="flex h-dvh flex-col items-center bg-warning-subtle md:justify-center">
        <SessionCompleteCard
          correctCount={correctCount}
          incorrectCount={incorrectCount}
          onDone={handleExit}
        />
      </div>
    );
  }

  return (
    <SessionWrapper>
      <AspectQuestionScreen
        key={currentCard.aspect_example_id}
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
