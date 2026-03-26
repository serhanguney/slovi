import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CenteredDialog } from '@/features/ui/centered-dialog';
import { useMissingPronouns } from '../hooks/useMissingPronouns';
import { useAddMissingPronouns } from '../hooks/useAddMissingPronouns';

export function AddMissingPronounsButton() {
  const { data: missingIds = [], isLoading } = useMissingPronouns();
  const { mutate: addAll, isPending } = useAddMissingPronouns();
  const [showConfirm, setShowConfirm] = useState(false);

  if (isLoading || missingIds.length === 0) return null;

  const count = missingIds.length;

  const handleConfirm = () => {
    addAll(missingIds, { onSuccess: () => setShowConfirm(false) });
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="shrink-0 rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-[12px] font-medium text-[#374151] transition-colors hover:bg-[#F9FAFB]"
      >
        Add missing pronouns
      </button>

      <CenteredDialog open={showConfirm} onClose={() => setShowConfirm(false)} maxWidth="max-w-sm">
        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-[17px] font-bold text-[#1A1A1A]">Add missing pronouns</h2>
            <p className="text-[14px] text-[#6B7280]">
              Are you sure you want to add all {count} missing{' '}
              {count === 1 ? 'pronoun' : 'pronouns'} to your practice box?
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirm(false)}
              disabled={isPending}
              className="flex-1 rounded-xl border border-[#E5E7EB] py-2.5 text-[14px] font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB]"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] py-2.5 text-[14px] font-semibold text-white transition-colors hover:brightness-95"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add {count}
            </button>
          </div>
        </div>
      </CenteredDialog>
    </>
  );
}
