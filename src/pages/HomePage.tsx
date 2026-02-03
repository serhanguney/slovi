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
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold">Slovi</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold">Welcome to Slovi</h2>
          <p className="mt-2 text-muted-foreground">Your Czech language learning companion</p>
        </div>

        {/* Dictionary */}
        <div className="mb-8 max-w-3xl mx-auto">
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
