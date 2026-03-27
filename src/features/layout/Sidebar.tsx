import { Search, Dumbbell, User, LogOut } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavTab } from './nav.types';
import logoColored from '@/assets/logo_colored.svg';

const NAV_ITEMS: { id: NavTab; label: string; icon: LucideIcon }[] = [
  { id: 'dictionary', label: 'Dictionary', icon: Search },
  { id: 'practice', label: 'Practice', icon: Dumbbell },
  { id: 'my-account', label: 'My Account', icon: User },
];

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onSignOut: () => void;
}

export function Sidebar({ activeTab, onTabChange, onSignOut }: SidebarProps) {
  return (
    <aside className="hidden w-[240px] shrink-0 flex-col border-r border-border bg-muted px-4 py-6 md:flex">
      {/* Logo */}
      <div className="mb-6 px-2 pb-6">
        <img src={logoColored} alt="slovi" className="h-10 w-auto" />
      </div>

      {/* Menu section label */}
      <p className="mb-1 px-3 text-caption font-semibold uppercase tracking-label text-muted-foreground">
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
                  : 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
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
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
