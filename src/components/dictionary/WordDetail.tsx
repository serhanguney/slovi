import { X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWordDetails, type WordForm, type ExampleSentence } from '@/hooks/useWordDetails';

interface WordDetailProps {
  rootWordId: number;
  onClose: () => void;
  onAddToVocabulary: (rootWordId: number) => void;
}

export function WordDetail({ rootWordId, onClose, onAddToVocabulary }: WordDetailProps) {
  const { data, isLoading, error } = useWordDetails(rootWordId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-8 text-center text-destructive">
        Failed to load word details. Please try again.
      </div>
    );
  }

  const { rootWord, forms, examples } = data;

  return (
    <div className="space-y-6">
      {/* Header with title and actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">{rootWord.in_czech}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onAddToVocabulary(rootWordId)}>
            <Plus className="mr-1 h-4 w-4" />
            Add to vocabulary
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Card 1: Translation and word type */}
      <Card>
        <CardHeader>
          <CardTitle>Translation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-xl">{rootWord.in_english}</p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded bg-secondary px-2 py-1 text-sm">{rootWord.word_type}</span>
              {rootWord.word_aspect && (
                <span className="rounded bg-secondary px-2 py-1 text-sm">
                  {rootWord.word_aspect}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Word forms */}
      <Card>
        <CardHeader>
          <CardTitle>Word Forms</CardTitle>
          <CardDescription>All declensions and conjugations of this word</CardDescription>
        </CardHeader>
        <CardContent>
          <WordFormsTable forms={forms} />
        </CardContent>
      </Card>

      {/* Card 3: Example sentences */}
      <Card>
        <CardHeader>
          <CardTitle>Example Sentences</CardTitle>
          <CardDescription>See how this word is used in context</CardDescription>
        </CardHeader>
        <CardContent>
          <ExamplesList examples={examples} forms={forms} />
        </CardContent>
      </Card>
    </div>
  );
}

function WordFormsTable({ forms }: { forms: WordForm[] }) {
  if (forms.length === 0) {
    return <p className="text-muted-foreground">No word forms available.</p>;
  }

  // Group forms by form_type category
  const groupedForms = forms.reduce(
    (acc, form) => {
      const category = form.form_type?.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(form);
      return acc;
    },
    {} as Record<string, WordForm[]>
  );

  const pluralityOrder: Record<string, number> = { singular: 0, plural: 1 };
  const personOrder: Record<string, number> = { '1': 0, '2': 1, '3': 2 };

  const categoryLabels: Record<string, string> = {
    case: 'Cases',
    tense: 'Tenses',
    mood: 'Moods',
    participle: 'Participles',
    degree: 'Degrees',
    verbal_noun: 'Verbal Noun',
    other: 'Other',
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedForms).map(([category, categoryForms]) => {
        const sortedForms =
          category === 'tense'
            ? [...categoryForms].sort((a, b) => {
                const plurDiff =
                  (pluralityOrder[a.plurality] ?? 99) - (pluralityOrder[b.plurality] ?? 99);
                if (plurDiff !== 0) return plurDiff;
                return (personOrder[a.person ?? ''] ?? 99) - (personOrder[b.person ?? ''] ?? 99);
              })
            : categoryForms;

        return (
          <div key={category}>
            <h4 className="mb-3 font-semibold text-muted-foreground">
              {categoryLabels[category] || category}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left font-medium">Form</th>
                    <th className="pb-2 text-left font-medium">Type</th>
                    <th className="pb-2 text-left font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedForms.map((form) => (
                    <tr key={form.id} className="border-b last:border-0">
                      <td className="py-2 font-medium">{form.form_in_czech}</td>
                      <td className="py-2 text-muted-foreground">{form.form_type?.name || '-'}</td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1">
                          {form.gender && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                              {form.gender}
                            </span>
                          )}
                          {form.plurality && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                              {form.plurality}
                            </span>
                          )}
                          {form.person && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                              {form.person} person
                            </span>
                          )}
                          {form.tense && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                              {form.tense}
                            </span>
                          )}
                          {!form.is_primary && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs italic">
                              alternative
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExamplesList({ examples, forms }: { examples: ExampleSentence[]; forms: WordForm[] }) {
  if (examples.length === 0) {
    return <p className="text-muted-foreground">No example sentences available.</p>;
  }

  // Create a map of form_id to form for quick lookup
  const formMap = new Map(forms.map((f) => [f.id, f]));

  // Group examples by form_type name
  const groupedExamples = examples.reduce(
    (acc, example) => {
      const form = formMap.get(example.word_form_id);
      const groupName = form?.form_type?.name || 'Other';
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(example);
      return acc;
    },
    {} as Record<string, ExampleSentence[]>
  );

  return (
    <div className="space-y-6">
      {Object.entries(groupedExamples).map(([formTypeName, groupExamples]) => (
        <div key={formTypeName}>
          <h4 className="mb-3 font-semibold text-muted-foreground">{formTypeName}</h4>
          <div className="space-y-3">
            {groupExamples.map((example) => {
              const form = formMap.get(example.word_form_id);
              return (
                <div key={example.id} className="rounded-lg border p-4">
                  <p className="font-medium">{example.czech_sentence}</p>
                  <p className="mt-1 text-muted-foreground">{example.english_sentence}</p>
                  {example.explanation && (
                    <p className="mt-2 text-sm text-muted-foreground italic">
                      {example.explanation}
                    </p>
                  )}
                  {form && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">{form.form_in_czech}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
