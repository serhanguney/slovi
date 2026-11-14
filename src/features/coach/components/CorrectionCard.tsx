import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Chip } from '@/features/ui/chip';
import { useAddToPracticeBox } from '@/features/practice/hooks/useAddToPracticeBox';
import type { Correction } from '../api';
import { ERROR_TYPE_LABEL } from '../conversation';

/** One mistake: the learner's words → the right ones, the rule, and a practice-box shortcut. */
export const CorrectionCard = ({ correction }: { correction: Correction }) => {
  const addToPracticeBox = useAddToPracticeBox();
  const rootWordId = correction.root_word_id;

  const handleAdd = () => {
    if (rootWordId === null) return;
    addToPracticeBox.mutate(rootWordId, {
      onSuccess: () => toast.success(`"${correction.lemma ?? 'Word'}" added to your practice box`),
      // Already pinned is the usual reason (one row per word).
      onError: () => toast.info(`"${correction.lemma ?? 'Word'}" is already in your practice box`),
    });
  };

  return (
    <li className="flex flex-col gap-1.5 rounded-2xl border border-border bg-background px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <del className="text-label text-destructive">{correction.original}</del>
        <p className="text-label text-muted-foreground" aria-hidden>
          →
        </p>
        <strong className="text-label font-semibold text-success">{correction.corrected}</strong>
      </div>
      <p className="text-label leading-relaxed text-foreground">{correction.explanation}</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Chip label={ERROR_TYPE_LABEL[correction.error_type]} variant="outlined" />
        {rootWordId !== null && (
          <button
            onClick={handleAdd}
            disabled={addToPracticeBox.isPending || addToPracticeBox.isSuccess}
            className="flex items-center gap-1 text-label font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {addToPracticeBox.isSuccess ? 'In practice box' : 'Practice box'}
          </button>
        )}
      </div>
    </li>
  );
};
