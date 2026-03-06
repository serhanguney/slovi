import { Dumbbell, TrendingUp, BookOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PracticeTab = 'practice' | 'progress' | 'words';

const TABS: { id: PracticeTab; label: string; icon: LucideIcon }[] = [
  { id: 'practice', label: 'Practice', icon: Dumbbell },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'words', label: 'Words', icon: BookOpen },
];

interface PracticeNavProps {
  activeTab: PracticeTab;
  onTabChange: (tab: PracticeTab) => void;
}

export function PracticeNav({ activeTab, onTabChange }: PracticeNavProps) {
  return (
    <nav className="shrink-0 px-[21px] pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
      <div className="flex h-[62px] items-stretch rounded-[36px] border border-[#F3F4F6] bg-white p-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 rounded-[26px] transition-colors',
                isActive ? 'bg-[#FFE59A]' : ''
              )}
            >
              <Icon
                className={cn('h-[18px] w-[18px]', isActive ? 'text-[#1A1A1A]' : 'text-[#D1D5DB]')}
              />
              <span
                className={cn(
                  'text-[10px] uppercase tracking-[0.5px]',
                  isActive ? 'font-semibold text-[#1A1A1A]' : 'font-medium text-[#D1D5DB]'
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
