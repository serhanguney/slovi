import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DictionaryAutocomplete } from '@/components/dictionary/DictionaryAutocomplete';
import { WordDetail } from '@/components/dictionary/WordDetail';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import type { NavTab } from '@/components/layout/nav.types';
import type { SearchResult } from '@/hooks/useDictionarySearch';

export function HomePage() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('explore');
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const [selectedWordName, setSelectedWordName] = useState<string | null>(null);

  const handleWordSelect = (result: SearchResult) => {
    setSelectedWordId(result.root_word_id);
    setSelectedWordName(result.root_word_czech);
    setActiveTab('explore');
  };

  const handleCloseDetail = () => {
    setSelectedWordId(null);
    setSelectedWordName(null);
  };

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab !== 'explore') {
      setSelectedWordId(null);
      setSelectedWordName(null);
    }
  };

  const handleAddToVocabulary = async (rootWordId: number) => {
    if (!user) return;
    // TODO: implement when user_vocabulary table is added
    console.log('Add to vocabulary:', { userId: user.id, rootWordId });
    alert('Added to vocabulary! (Feature coming soon)');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar — hidden on mobile, flex on md+ */}
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} onSignOut={signOut} />

      {/* Right side: top bar + content + mobile nav */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Desktop top bar — breadcrumb left, search right */}
        <header className="hidden shrink-0 items-center justify-between border-b border-[#F3F4F6] px-10 py-[18px] md:flex">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-muted-foreground">Explore</span>
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

        {/* Page content */}
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {activeTab === 'explore' ? (
            <ExploreTab
              selectedWordId={selectedWordId}
              onWordSelect={handleWordSelect}
              onCloseDetail={handleCloseDetail}
              onAddToVocabulary={handleAddToVocabulary}
            />
          ) : (
            <PlaceholderTab tab={activeTab} />
          )}
        </main>

        {/* Mobile bottom nav — hidden on desktop */}
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    </div>
  );
}

// ── Tab content ───────────────────────────────────────────────────────────────

interface ExploreTabProps {
  selectedWordId: number | null;
  onWordSelect: (result: SearchResult) => void;
  onCloseDetail: () => void;
  onAddToVocabulary: (rootWordId: number) => Promise<void>;
}

function ExploreTab({
  selectedWordId,
  onWordSelect,
  onCloseDetail,
  onAddToVocabulary,
}: ExploreTabProps) {
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
    <div className="flex min-h-0 flex-1 flex-col items-center px-4 py-8 md:py-16">
      <div className="w-full max-w-2xl">
        {/* Mobile: search lives here. Desktop: search is always in the TopBar. */}
        <div className="md:hidden">
          <DictionaryAutocomplete onSelect={onWordSelect} />
        </div>
        <div className="hidden text-center md:block">
          <p className="text-lg font-medium">Search for a Czech word to begin</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the search bar above to find words, declensions, and conjugations
          </p>
        </div>
      </div>
    </div>
  );
}

function PlaceholderTab({ tab }: { tab: NavTab }) {
  const labels: Record<NavTab, string> = {
    explore: 'Explore',
    'my-words': 'My Words',
    history: 'History',
    settings: 'Settings',
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2">
      <p className="text-base font-semibold">{labels[tab]}</p>
      <p className="text-sm text-muted-foreground">Coming soon</p>
    </div>
  );
}
