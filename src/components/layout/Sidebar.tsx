import { Search, Bookmark, Settings, User, LogOut } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavTab } from './nav.types';
import logoColored from '@/assets/logo_colored.svg';

const NAV_ITEMS: { id: NavTab; label: string; icon: LucideIcon }[] = [
  { id: 'explore', label: 'Explore', icon: Search },
  { id: 'my-words', label: 'My Words', icon: Bookmark },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'my-account', label: 'My Account', icon: User },
];

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onSignOut: () => void;
}

export function Sidebar({ activeTab, onTabChange, onSignOut }: SidebarProps) {
  return (
    <aside className="hidden w-[240px] shrink-0 flex-col border-r border-[#F3F4F6] bg-[#FAFAFA] px-4 py-6 md:flex">
      {/* Logo */}
      <div className="mb-6 px-2 pb-6">
        <img src={logoColored} alt="slovi" className="h-10 w-auto" />
      </div>

      {/* Menu section label */}
      <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">
        Menu
      </p>

      {/* Nav items */}
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : 'font-medium text-[#6B7280] hover:bg-[#F3F4F6] hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Sign out — pushed to the bottom */}
      <div className="mt-auto">
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-foreground"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
