import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  // `visible` drives CSS classes. It follows `open` but is delayed on enter
  // so the initial render starts from the off-screen position.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Delay one frame so the browser paints the initial hidden state before
    // the transition starts — this gives us the slide-in animation.
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Unmount once the exit animation finishes.
  // While open or still visible (during exit animation), keep in DOM.
  if (!open && !visible) return null;

  return (
    <>
      {/* White overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-white transition-opacity duration-300',
          open && visible ? 'opacity-70' : 'opacity-0'
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 flex h-[80vh] flex-col rounded-t-[24px] bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)] transition-transform duration-300',
          open && visible ? 'translate-y-0' : 'translate-y-full'
        )}
        onTransitionEnd={(e) => {
          // Unmount after the slide-out transition completes
          if (!open && e.propertyName === 'transform') setVisible(false);
        }}
      >
        {/* Handle */}
        <div className="flex shrink-0 justify-center pb-1 pt-3">
          <div className="h-1 w-9 rounded-full bg-[#D1D5DB]" />
        </div>

        {children}
      </div>
    </>
  );
}
