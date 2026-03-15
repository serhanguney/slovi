import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

interface WarningTooltipProps {
  message: string;
}

export function WarningTooltip({ message }: WarningTooltipProps) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const computePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setStyle({
      top: rect.bottom + 8,
      // centre under the icon, clamped to viewport edges
      left: Math.max(8, Math.min(rect.left + rect.width / 2, window.innerWidth - 128)),
    });
  };

  // Close on outside click (mobile)
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        aria-label="Warning"
        className="flex items-center justify-center rounded-full border p-1.5 md:rounded-none md:border-0 md:bg-transparent md:p-0"
        onMouseEnter={() => {
          computePosition();
          setOpen(true);
        }}
        onMouseLeave={() => setOpen(false)}
        onClick={() => {
          computePosition();
          setOpen((o) => !o);
        }}
      >
        <AlertTriangle className="h-3.5 w-3.5 text-[#9CA3AF]" />
      </button>

      {open &&
        createPortal(
          <div
            style={style}
            className="fixed z-50 max-w-[240px] -translate-x-1/2 rounded-[10px] border border-[#E5E7EB] bg-white px-3 py-2 text-[12px] leading-snug text-[#1A1A1A] shadow-sm"
          >
            {message}
          </div>,
          document.body
        )}
    </>
  );
}
