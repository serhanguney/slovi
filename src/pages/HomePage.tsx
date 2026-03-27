import { useOutletContext, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DictionaryAutocomplete } from '@/features/dictionary/DictionaryAutocomplete';
import type { AppShellContext } from '@/features/layout/AppShell';
import type { NavTab } from '@/features/layout/nav.types';
import type { SearchResult } from '@/features/dictionary/hooks/useDictionarySearch';
import { useGetRootWords } from '@/features/dictionary/hooks/useGetRootWords';

export function HomePage() {
  const { user, signOut } = useAuth();
  const { activeTab } = useOutletContext<AppShellContext>();
  const navigate = useNavigate();

  const handleWordSelect = (result: SearchResult) => {
    navigate(`/word/${result.root_word_id}`);
  };

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {activeTab === 'dictionary' ? (
        <DictionaryTab onWordSelect={handleWordSelect} />
      ) : activeTab === 'my-account' ? (
        <MyAccountTab user={user} onSignOut={signOut} />
      ) : (
        <PlaceholderTab tab={activeTab} />
      )}
    </main>
  );
}

// ── Tab content ───────────────────────────────────────────────────────────────

function DictionaryTab({ onWordSelect }: { onWordSelect: (result: SearchResult) => void }) {
  const { data: rootWords, isLoading: isLoadingRootWords } = useGetRootWords();
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
      <div className="flex w-full max-w-120 flex-col items-center gap-6 text-center">
        <div>
          <h1 className="text-xl font-bold text-foreground md:text-heading">Hello</h1>
        </div>
        <div className="w-full flex flex-col gap-2">
          <DictionaryAutocomplete onSelect={onWordSelect} variant="lg" />
          <p className="text-sm text-muted-foreground">
            Slovi currently has {isLoadingRootWords ? '...' : (rootWords?.length ?? 0)} words
          </p>
        </div>
      </div>
    </div>
  );
}

function PlaceholderTab({ tab }: { tab: NavTab }) {
  const labels: Record<NavTab, string> = {
    dictionary: 'Dictionary',
    practice: 'Practice',
    'my-account': 'My Account',
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2">
      <p className="text-base font-semibold">{labels[tab]}</p>
      <p className="text-sm text-muted-foreground">Coming soon</p>
    </div>
  );
}

interface MyAccountTabProps {
  user: { email?: string } | null;
  onSignOut: () => void;
}

function MyAccountTab({ user, onSignOut }: MyAccountTabProps) {
  return (
    <div className="flex flex-1 flex-col px-4 py-8 md:px-10">
      <h2 className="text-xl font-bold text-foreground">My Account</h2>

      <div className="mt-6 rounded-2xl border border-border bg-white p-5">
        <p className="text-caption font-semibold uppercase tracking-label text-muted-foreground">
          Email
        </p>
        <p className="mt-1 text-sm text-foreground">{user?.email ?? '—'}</p>
      </div>

      <div className="mt-4">
        <button
          onClick={onSignOut}
          className="flex items-center gap-2 rounded-2xl border border-border bg-white px-5 py-3.5 text-sm font-medium text-destructive transition-colors hover:bg-[#FEF2F2]"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
