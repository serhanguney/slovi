import { cn } from '@/lib/utils';

interface WordFormRowProps {
  label: string;
  form: string;
  description?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  className?: string;
}

export function WordFormRow({
  label,
  form,
  description,
  exampleSentence,
  exampleTranslation,
  className,
}: WordFormRowProps) {
  return (
    <div className={cn('flex flex-col gap-0.5 py-3', className)}>
      {/* Label + description on the same line, 8px apart */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold tracking-[0.5px] text-muted-foreground">
          {label}
        </span>
        {description && (
          <span className="text-[11px] font-medium tracking-[0.3px] text-muted-foreground">
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
}
