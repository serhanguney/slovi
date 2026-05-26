import { X, Info } from 'lucide-react';
import { BottomSheet } from '@/features/ui/bottom-sheet';
import { CenteredDialog } from '@/features/ui/centered-dialog';
import { useMediaQuery } from '@/features/ui/use-media-query';
import { Chip } from '@/features/ui/chip';

type WordsInfoSheetProps = {
  open: boolean;
  onClose: () => void;
};

const Divider = () => <div className="h-px bg-border shrink-0" />;
const InfoContent = ({ onClose }: { onClose: () => void }) => (
  <>
    <div className="flex shrink-0 items-center px-6 py-4">
      <button
        onClick={onClose}
        className="flex h-5 w-5 items-center justify-center text-muted-foreground"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="flex-1" />
      <p className="text-lg font-bold text-foreground">Your Word Progress</p>
      <div className="flex-1" />
      <div className="h-5 w-5" />
    </div>

    <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Every word you practice is tracked across three practice modes. Each mode has its own
        progress — a word can be <span className="font-semibold">fresh</span> in one and{' '}
        <span className="font-semibold">fading</span> in another.
      </p>

      <Divider />

      <div className="flex flex-col gap-3">
        <Chip label="Fading" color="warning" className="w-fit" />
        <p className="text-label leading-relaxed text-muted-foreground">
          A word will warn you when your last practice time exceeds 7 days. The timestamp on each
          word turns orange to signal this. Sessions in that mode will automatically surface fading
          words first.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Chip label="Known" color="success" className="w-fit" />
        <p className="text-label leading-relaxed text-muted-foreground">
          A word becomes Known once you&apos;ve answered all its forms correctly enough times in{' '}
          <span className="text-violet font-semibold">Case Memory</span>. Known words are no longer
          at risk of fading.
        </p>
      </div>

      <Divider />

      <div className="flex gap-2.5 rounded-xl bg-destructive-subtle px-3.5 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <p className="text-label leading-relaxed text-destructive">
          Removing a word permanently deletes all its practice history. If you add it again, it will
          start completely from scratch.
        </p>
      </div>
    </div>

    <div className="shrink-0 px-6 pb-8 pt-4">
      <button
        onClick={onClose}
        className="flex h-13 w-full items-center justify-center rounded-2xl bg-foreground text-base font-semibold text-background"
      >
        Got it
      </button>
    </div>
  </>
);

export const WordsInfoSheet = ({ open, onClose }: WordsInfoSheetProps) => {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <CenteredDialog open={open} onClose={onClose}>
        <InfoContent onClose={onClose} />
      </CenteredDialog>
    );
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <InfoContent onClose={onClose} />
    </BottomSheet>
  );
};
