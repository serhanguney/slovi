import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SecondaryNav } from '@/features/ui/secondary-nav';
import type { SecondaryNavTab } from '@/features/ui/secondary-nav';
import { PracticeSetup } from '@/features/practice/components/PracticeSetup';
import { ProgressTab } from '@/features/practice/components/ProgressTab';
import { WordsTab } from '@/features/practice/components/WordsTab';
import type { AppShellContext } from '@/features/layout/AppShell';

type PracticeTab = 'setup' | 'progress' | 'words';

const TABS: SecondaryNavTab<PracticeTab>[] = [
  { id: 'setup', label: 'Setup' },
  { id: 'progress', label: 'Progress' },
  { id: 'words', label: 'Words' },
];

export function PracticePage() {
  const { onTabChange } = useOutletContext<AppShellContext>();
  const [activeTab, setActiveTab] = useState<PracticeTab>('setup');

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Secondary nav */}
      <div className="shrink-0 pt-4 md:pt-8">
        <SecondaryNav
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          leftSlot={
            <button
              onClick={() => onTabChange('dictionary')}
              className="md:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#1A1A1A] transition-colors hover:bg-black/[0.05] mr-1"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          }
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {activeTab === 'setup' && <PracticeSetup />}
        {activeTab === 'progress' && <ProgressTab />}
        {activeTab === 'words' && <WordsTab />}
      </div>
    </div>
  );
}
