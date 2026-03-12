import { useState } from 'react';
import { SecondaryNav } from '@/features/ui/secondary-nav';
import type { SecondaryNavTab } from '@/features/ui/secondary-nav';
import { PracticeSetup } from '@/features/practice/components/PracticeSetup';
import { WordsTab } from '@/features/practice/components/WordsTab';

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
  const [activeTab, setActiveTab] = useState<PracticeTab>('setup');

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 pt-8">
        <SecondaryNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {activeTab === 'setup' && <PracticeSetup />}
        {activeTab === 'progress' && <PlaceholderTab label="Progress" />}
        {activeTab === 'words' && <WordsTab />}
      </div>
    </div>
  );
}
