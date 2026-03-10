import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DictionaryAutocomplete } from '@/features/dictionary/DictionaryAutocomplete';
import { WordDetail } from '@/features/dictionary/WordDetail';
import type { AppShellContext } from '@/features/layout/AppShell';
import type { NavTab } from '@/features/layout/nav.types';
import type { SearchResult } from '@/features/dictionary/hooks/useDictionarySearch';

export function HomePage() {
  const { user, signOut } = useAuth();
  const { activeTab, onTabChange: handleTabChange } = useOutletContext<AppShellContext>();
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const [selectedWordName, setSelectedWordName] = useState<string | null>(null);

  const handleWordSelect = (result: SearchResult) => {
    setSelectedWordId(result.root_word_id);
    setSelectedWordName(result.root_word_czech);
    handleTabChange('dictionary');
  };

  const handleCloseDetail = () => {
    setSelectedWordId(null);
    setSelectedWordName(null);
  };

  const handleAddToVocabulary = async (rootWordId: number) => {
    if (!user) return;
    // TODO: implement when user_vocabulary table is added
    console.log('Add to vocabulary:', { userId: user.id, rootWordId });
    alert('Added to vocabulary! (Feature coming soon)');
  };

  return (
    <>
      {/* Desktop top bar — only shown when a word is selected */}
      {selectedWordId && (
        <header className="hidden shrink-0 items-center justify-between border-b border-[#F3F4F6] px-10 py-[18px] md:flex">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-muted-foreground">Dictionary</span>
            {selectedWordName && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-[#D1D5DB]" />
                <span className="font-semibold text-foreground">{selectedWordName}</span>
              </>
            )}
          </div>
          <div className="w-[280px]">
            <DictionaryAutocomplete
              onSelect={handleWordSelect}
              placeholder="Search for a word..."
            />
          </div>
        </header>
      )}

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeTab === 'dictionary' ? (
          <DictionaryTab
            selectedWordId={selectedWordId}
            onWordSelect={handleWordSelect}
            onCloseDetail={handleCloseDetail}
            onAddToVocabulary={handleAddToVocabulary}
          />
        ) : activeTab === 'my-account' ? (
          <MyAccountTab user={user} onSignOut={signOut} />
        ) : (
          <PlaceholderTab tab={activeTab} />
        )}
      </main>
    </>
  );
}

// ── Tab content ───────────────────────────────────────────────────────────────

interface DictionaryTabProps {
  selectedWordId: number | null;
  onWordSelect: (result: SearchResult) => void;
  onCloseDetail: () => void;
  onAddToVocabulary: (rootWordId: number) => Promise<void>;
}

function DictionaryTab({
  selectedWordId,
  onWordSelect,
  onCloseDetail,
  onAddToVocabulary,
}: DictionaryTabProps) {
  if (selectedWordId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 md:px-10 md:py-8">
        <WordDetail
          rootWordId={selectedWordId}
          onClose={onCloseDetail}
          onAddToVocabulary={onAddToVocabulary}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
      <div className="flex w-full max-w-[480px] flex-col items-center gap-8 text-center">
        <div>
          <h1 className="text-[26px] font-bold text-foreground md:text-[32px]">Hello</h1>
        </div>
        <div className="w-full">
          <DictionaryAutocomplete onSelect={onWordSelect} variant="lg" />
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
      <h2 className="text-[20px] font-bold text-foreground">My Account</h2>

      <div className="mt-6 rounded-2xl border border-[#F3F4F6] bg-white p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">
          Email
        </p>
        <p className="mt-1 text-[15px] text-foreground">{user?.email ?? '—'}</p>
      </div>

      <div className="mt-4">
        <button
          onClick={onSignOut}
          className="flex items-center gap-2 rounded-2xl border border-[#F3F4F6] bg-white px-5 py-3.5 text-[15px] font-medium text-[#EF4444] transition-colors hover:bg-[#FEF2F2]"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
