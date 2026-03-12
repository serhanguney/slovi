import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SecondaryNav } from '@/features/ui/secondary-nav';
import type { SecondaryNavTab } from '@/features/ui/secondary-nav';
import { PracticeSetup } from '@/features/practice/components/PracticeSetup';
import { WordsTab } from '@/features/practice/components/WordsTab';
import type { AppShellContext } from '@/features/layout/AppShell';

type PracticeTab = 'setup' | 'progress' | 'words';

const TABS: SecondaryNavTab<PracticeTab>[] = [
  { id: 'setup', label: 'Setup' },
  { id: 'progress', label: 'Progress' },
  { id: 'words', label: 'Words' },
];

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2">
      <p className="text-base font-semibold">{label}</p>
      <p className="text-sm text-muted-foreground">Coming soon</p>
    </div>
  );
}

export function PracticePage() {
  const { onTabChange } = useOutletContext<AppShellContext>();
  const [activeTab, setActiveTab] = useState<PracticeTab>('setup');

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Mobile top bar with back button */}
      <div className="flex shrink-0 items-center px-2 pt-4 md:hidden">
        <button
          onClick={() => onTabChange('dictionary')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#1A1A1A] transition-colors hover:bg-black/[0.05]"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Secondary nav */}
      <div className="shrink-0 pt-2 md:pt-8">
        <SecondaryNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {activeTab === 'setup' && <PracticeSetup />}
        {activeTab === 'progress' && <PlaceholderTab label="Progress" />}
        {activeTab === 'words' && <WordsTab />}
      </div>
    </div>
  );
}
