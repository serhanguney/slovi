import { CircleCheck, CircleX, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';

/** A multiple-choice option with selected / correct / incorrect states (case study, aspect choice). */
export type OptionState = 'idle' | 'selected' | 'correct' | 'incorrect' | 'show-correct';

type ChoiceOptionCardProps = {
  label: string;
  /** A short note under the label (e.g. the verb's aspect). */
  hint?: string;
  state: OptionState;
  disabled: boolean;
  onClick: () => void;
};

export const ChoiceOptionCard = ({
  label,
  hint,
  state,
  disabled,
  onClick,
}: ChoiceOptionCardProps) => {
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

      <span className="flex flex-1 flex-col">
        <span
          className={cn(
            'text-label font-semibold',
            (state === 'idle' || isSelected) && 'text-foreground',
            isCorrect && 'text-green-700',
            isIncorrect && 'text-red-600'
          )}
        >
          {label}
        </span>
        {hint && <span className="text-caption text-muted-foreground">{hint}</span>}
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
};
