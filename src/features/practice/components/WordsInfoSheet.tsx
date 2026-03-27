import { X, Info } from 'lucide-react';
import { BottomSheet } from '@/features/ui/bottom-sheet';
import { CenteredDialog } from '@/features/ui/centered-dialog';
import { useMediaQuery } from '@/features/ui/use-media-query';

interface WordsInfoSheetProps {
  open: boolean;
  onClose: () => void;
}

const STATUS_ITEMS = [
  {
    label: 'Known',
    style: 'bg-success-subtle text-success',
    description:
      "You've answered this word correctly at least 3 times for all forms in Case Memory. It's part of your active vocabulary.",
  },
  {
    label: 'Learning',
    style: 'bg-muted text-muted-foreground',
    description:
      "You've started practicing this word but haven't hit 10 correct answers yet. Keep going!",
  },
  {
    label: 'Fresh',
    style: 'bg-success-subtle text-success',
    description: 'You practiced this recently and your recall is strong. Nothing to do for now.',
  },
  {
    label: 'Stable',
    style: 'bg-warning-subtle text-warning',
    description:
      'Some time has passed since your last practice. A review soon will keep the memory solid.',
  },
  {
    label: 'Fading',
    style: 'bg-destructive-subtle text-destructive',
    description:
      "It's been a while. Without a review, this word may slip from memory — prioritise it in your next session.",
  },
];

function InfoContent({ onClose }: { onClose: () => void }) {
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
        <span className="text-[18px] font-bold text-foreground">Your Word Progress</span>
        <div className="flex-1" />
        <div className="h-5 w-5" />
      </div>

      {/* Divider */}
      <div className="h-px shrink-0 bg-[#CBCCC9]" />

      {/* Scrollable content */}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
        {/* Intro */}
        <p className="text-sm leading-[1.5] text-muted-foreground">
          This page gives you a live snapshot of every word you&apos;ve encountered in practice. Use
          it to spot which words are slipping, celebrate what you&apos;ve mastered, and decide where
          to focus next.
        </p>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Status definitions */}
        <div className="flex flex-col gap-4">
          <span className="text-sm font-semibold text-foreground">What the labels mean</span>
          {STATUS_ITEMS.map(({ label, style, description }) => (
            <div key={label} className="flex flex-col gap-1">
              <span
                className={`self-start rounded-full px-2.5 py-0.5 text-caption font-semibold ${style}`}
              >
                {label}
              </span>
              <p className="text-label leading-[1.5] text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* How to use */}
        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold text-foreground">How to use this page</span>
          {[
            'Filter by Czech or English to find a specific word quickly.',
            "Expand a card to see which grammatical cases you've covered.",
            'Words with Fading status across multiple modes are your highest priority for review.',
          ].map((text) => (
            <div key={text} className="flex gap-2.5">
              <span className="text-sm text-muted-foreground">•</span>
              <p className="text-label leading-[1.5] text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        {/* Info banner */}
        <div className="flex gap-2.5 rounded-[12px] bg-[#DFDFE6] px-3.5 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
          <p className="text-label leading-[1.5] text-foreground">
            New words appear here automatically as you practice. The further you progress, the more
            complete your picture becomes.
          </p>
        </div>
      </div>

      {/* Close button */}
      <div className="shrink-0 px-6 pb-8 pt-4">
        <button
          onClick={onClose}
          className="flex h-[52px] w-full items-center justify-center rounded-[14px] bg-foreground text-base font-semibold text-white"
        >
          Got it
        </button>
      </div>
    </>
  );
}

export function WordsInfoSheet({ open, onClose }: WordsInfoSheetProps) {
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
}
