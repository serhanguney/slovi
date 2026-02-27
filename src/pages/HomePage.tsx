import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { DictionaryAutocomplete } from '@/components/dictionary/DictionaryAutocomplete';
import { WordDetail } from '@/components/dictionary/WordDetail';
import type { SearchResult } from '@/hooks/useDictionarySearch';

export function HomePage() {
  const { user, signOut } = useAuth();
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);

  const handleWordSelect = (result: SearchResult) => {
    setSelectedWordId(result.root_word_id);
  };

  const handleCloseDetail = () => {
    setSelectedWordId(null);
  };

  const handleAddToVocabulary = async (rootWordId: number) => {
    if (!user) return;

    // TODO: Implement when user_vocabulary table is added to schema
    // For now, just log the action
    console.log('Add to vocabulary:', { userId: user.id, rootWordId });
    alert('Added to vocabulary! (Feature coming soon)');
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold">Slovi</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-hidden px-4 py-8">
        {/* Dictionary */}
        <div
          className={
            selectedWordId
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
              : 'mx-auto w-full max-w-3xl'
          }
        >
          {selectedWordId ? (
            <WordDetail
              rootWordId={selectedWordId}
              onClose={handleCloseDetail}
              onAddToVocabulary={handleAddToVocabulary}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Dictionary</CardTitle>
                <CardDescription>
                  Search Czech words - finds all forms including declensions and conjugations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DictionaryAutocomplete onSelect={handleWordSelect} />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
