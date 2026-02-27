import { Search, Bookmark, History, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavTab } from './nav.types';

const NAV_ITEMS: { id: NavTab; label: string; icon: LucideIcon }[] = [
  { id: 'explore', label: 'Explore', icon: Search },
  { id: 'my-words', label: 'My Words', icon: Bookmark },
  { id: 'history', label: 'History', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="shrink-0 bg-white px-[21px] py-3 md:hidden">
      {/* Pill container matching the design */}
      <div className="flex h-[62px] items-stretch rounded-[36px] border border-[#F3F4F6] bg-white p-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 rounded-[26px] transition-colors',
                isActive ? 'bg-primary' : ''
              )}
            >
              <Icon
                className={cn(
                  'h-[18px] w-[18px]',
                  isActive ? 'text-primary-foreground' : 'text-[#D1D5DB]'
                )}
              />
              <span
                className={cn(
                  'text-[10px] uppercase tracking-[0.5px]',
                  isActive ? 'font-semibold text-primary-foreground' : 'font-medium text-[#D1D5DB]'
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
