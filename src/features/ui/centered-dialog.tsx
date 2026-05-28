import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type CenteredDialogProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Max width of the dialog panel, defaults to max-w-lg */
  maxWidth?: string;
};

export const CenteredDialog = ({
  open,
  onClose,
  children,
  maxWidth = 'max-w-lg',
}: CenteredDialogProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  if (!open && !visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-200',
          open && visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none'
        )}
      >
        <div
          className={cn(
            'pointer-events-auto flex max-h-[85vh] w-full flex-col rounded-4xl bg-white shadow-dialog transition-opacity-transform duration-200',
            maxWidth,
            open && visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          )}
          onTransitionEnd={(e) => {
            if (!open && e.propertyName === 'opacity') setVisible(false);
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
};
