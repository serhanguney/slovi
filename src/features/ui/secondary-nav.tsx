import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SecondaryNavTab<T extends string = string> {
  id: T;
  label: string;
}

interface SecondaryNavProps<T extends string = string> {
  tabs: SecondaryNavTab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  leftSlot?: ReactNode;
}

export function SecondaryNav<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  leftSlot,
}: SecondaryNavProps<T>) {
  return (
    <div className="w-full">
      <div className="flex items-center px-6">
        {leftSlot}
        {tabs.map(({ id, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className="flex flex-col items-center gap-2 px-4 py-3"
            >
              <span
                className={cn(
                  'text-[14px] transition-colors',
                  isActive ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
                )}
              >
                {label}
              </span>
              <span
                className={cn(
                  'h-[2px] w-full rounded-[1px] transition-colors',
                  isActive ? 'bg-foreground' : 'bg-transparent'
                )}
              />
            </button>
          );
        })}
      </div>
      <div className="h-px w-full bg-border" />
    </div>
  );
}
