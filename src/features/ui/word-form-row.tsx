import { cn } from '@/lib/utils';

type WordFormRowProps = {
  label: string;
  form: string;
  description?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  className?: string;
};

export const WordFormRow = ({
  label,
  form,
  description,
  exampleSentence,
  exampleTranslation,
  className,
}: WordFormRowProps) => {
  return (
    <div className={cn('flex flex-col gap-0.5 py-3', className)}>
      {/* Label + description on the same line, 8px apart */}
      <div className="flex items-center gap-2">
        <span className="text-caption font-semibold tracking-body text-muted-foreground">
          {label}
        </span>
        {description && (
          <span className="text-caption font-medium tracking-tight-label text-muted-foreground">
            {description}
          </span>
        )}
      </div>

      {/* Word form */}
      <strong className="text-base font-bold text-foreground">{form}</strong>

      {/* Example sentences — 8px below the form */}
      {exampleSentence && (
        <div className="mt-2 flex flex-col gap-0.5">
          <p className="text-sm leading-relaxed text-muted-foreground">{exampleSentence}</p>
          {exampleTranslation && (
            <p className="text-sm italic leading-relaxed text-muted-foreground">
              {exampleTranslation}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
