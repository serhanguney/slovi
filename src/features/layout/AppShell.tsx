import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import type { NavTab } from './nav.types';

export interface AppShellContext {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export function AppShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<NavTab>(() =>
    pathname.startsWith('/practice') ? 'practice' : 'dictionary'
  );

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'practice') {
      navigate('/practice');
    } else if (pathname !== '/') {
      navigate('/');
    }
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} onSignOut={signOut} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Outlet context={{ activeTab, onTabChange: handleTabChange } satisfies AppShellContext} />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    </div>
  );
}
