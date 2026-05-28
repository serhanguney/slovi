import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ExpandableSectionProps = {
  icon: LucideIcon;
  title: string;
  count: number;
  /** Always-visible content (e.g. first N preview rows). */
  children: ReactNode;
  /** Extra content revealed when expanded. If omitted, no toggle is rendered. */
  expandedChildren?: ReactNode;
  expandLabel?: string;
  collapseLabel?: string;
  defaultExpanded?: boolean;
  className?: string;
};

export const ExpandableSection = ({
  icon: Icon,
  title,
  count,
  children,
  expandedChildren,
  expandLabel = 'See all forms',
  collapseLabel = 'See fewer forms',
  defaultExpanded = false,
  className,
}: ExpandableSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasMore = expandedChildren !== undefined;

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border bg-muted', className)}>
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <Icon className="size-4.5 shrink-0 text-foreground" />
        <span className="text-lg font-bold text-foreground">{title}</span>
        <span className="ml-1 rounded-xl bg-primary px-2.5 py-0.5 text-caption font-semibold text-primary-foreground">
          {count} {count === 1 ? 'form' : 'forms'}
        </span>
      </div>

      {/* Preview content — always visible */}
      <div className="px-4">{children}</div>

      {/* Expanded content — only rendered when open */}
      {hasMore && isExpanded && <div className="px-4">{expandedChildren}</div>}

      {/* Toggle button — only shown when expandedChildren is provided */}
      {hasMore && (
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-border px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5"
        >
          {isExpanded ? collapseLabel : expandLabel}
          <ChevronDown
            className={cn('h-4 w-4 transition-transform duration-200', isExpanded && 'rotate-180')}
          />
        </button>
      )}
    </div>
  );
};
