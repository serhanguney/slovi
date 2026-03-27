import { X, Ban, Info, Loader2 } from 'lucide-react';
import { BottomSheet } from '@/features/ui/bottom-sheet';
import { CenteredDialog } from '@/features/ui/centered-dialog';
import { useMediaQuery } from '@/features/ui/use-media-query';

interface BlockWordSheetProps {
  open: boolean;
  word: string;
  onClose: () => void;
  onConfirm: () => void;
  isPending?: boolean;
}

const WHAT_HAPPENS = [
  'The word will be removed from all future practice sessions',
  'Your existing progress and scores will be preserved',
  'The word will still appear in the dictionary',
];

function BlockWordContent({
  word,
  onClose,
  onConfirm,
  isPending,
}: Omit<BlockWordSheetProps, 'open'>) {
  return (
    <>
      {/* Header */}
      <div className="flex shrink-0 items-center px-6 py-4">
        <button
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center text-muted-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1" />
        <span className="text-[18px] font-bold text-foreground">Block Word</span>
        <div className="flex-1" />
        <div className="h-5 w-5" />
      </div>

      {/* Divider */}
      <div className="h-px shrink-0 bg-[#CBCCC9]" />

      {/* Scrollable content */}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
        {/* Warning icon */}
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E9E3D8]">
            <Ban className="h-[22px] w-[22px] text-[#804200]" />
          </div>
        </div>

        {/* Explanation */}
        <p className="text-sm leading-[1.5] text-muted-foreground">
          Blocking <strong>&ldquo;{word}&rdquo;</strong> will prevent this word from appearing in
          all practice modules. This affects all forms and cases of the word.
        </p>

        <p className="text-label font-medium text-muted-foreground">
          You can unblock words anytime from Practice → Words.
        </p>

        {/* Divider */}
        <div className="h-px bg-[#CBCCC9]" />

        {/* What happens */}
        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold text-foreground">
            What happens when you block a word
          </span>
          {WHAT_HAPPENS.map((text) => (
            <div key={text} className="flex gap-2.5">
              <span className="text-sm text-muted-foreground">•</span>
              <p className="text-sm leading-[1.5] text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        {/* Info note */}
        <div className="flex gap-2.5 rounded-[12px] bg-[#DFDFE6] px-3.5 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
          <p className="text-label leading-[1.5] text-foreground">
            Tip: If you&apos;re struggling with a word, consider using the Study action instead to
            review all its forms before blocking it.
          </p>
        </div>
      </div>

      {/* Block button */}
      <div className="shrink-0 px-6 pb-8 pt-4">
        <button
          onClick={onConfirm}
          disabled={isPending}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-destructive text-base font-semibold text-white transition-opacity disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Block Word'}
        </button>
      </div>
    </>
  );
}

export function BlockWordSheet({
  open,
  word,
  onClose,
  onConfirm,
  isPending = false,
}: BlockWordSheetProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <CenteredDialog open={open} onClose={onClose}>
        <BlockWordContent
          word={word}
          onClose={onClose}
          onConfirm={onConfirm}
          isPending={isPending}
        />
      </CenteredDialog>
    );
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <BlockWordContent word={word} onClose={onClose} onConfirm={onConfirm} isPending={isPending} />
    </BottomSheet>
  );
}
