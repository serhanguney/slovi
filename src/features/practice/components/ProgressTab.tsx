import { CircleCheck, BookOpen, Clock3 } from 'lucide-react';
import { useKnownWords } from '../hooks/useKnownWords';
import { usePracticeProgress } from '../hooks/usePracticeProgress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabase/client';

function useLearnigCount() {
  return useQuery({
    queryKey: ['user-word-list-count'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_word_list', { p_search: '' });
      if (error) throw new Error(error.message);
      return (data ?? []).filter((w) => !w.is_known).length;
    },
    staleTime: 1000 * 60 * 5,
  });
}

function barColor(score: number) {
  if (score >= 0.7) return 'bg-success/70';
  if (score >= 0.2) return 'bg-warning/70';
  return 'bg-destructive/70';
}

export function ProgressTab() {
  const { data: knownWords = [] } = useKnownWords();
  const { data: learningCount = 0 } = useLearnigCount();
  const { data: caseProgress = [] } = usePracticeProgress();

  const knownCount = knownWords.length;
  const reviewCount = knownWords.filter((w) => w.is_dusty).length;

  const cards = [
    {
      label: 'Known',
      description: 'A word is known when its accurately practiced in Case Memory mode.',
      icon: <CircleCheck className="h-4.5 w-4.5 text-success" />,
      count: knownCount,
    },
    {
      label: 'Learning',
      description: 'Words not yet reached the expected success in Case Memory mode',
      icon: <BookOpen className="h-4.5 w-4.5 text-gray-500" />,
      count: learningCount,
    },
    {
      label: 'Review',
      description: 'Known words not practiced in 90 days',
      icon: <Clock3 className="h-4.5 w-4.5 text-warning" />,
      count: reviewCount,
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
      <div className="flex flex-col gap-6">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          {cards.map((card) => (
            <div
              key={card.label}
              className="flex flex-col gap-1.5 rounded-2xl border border-border bg-white p-4"
            >
              <div className="flex gap-2 items-center">
                {card.icon}
                <h3 className="font-mono text-2xl text-foreground">{card.count}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-caption leading-snug text-[#C4C9D4]">{card.description}</p>
            </div>
          ))}
        </div>

        {/* Case mastery */}
        {caseProgress.length > 0 && (
          <div className="flex flex-col gap-4">
            <span className="text-caption font-semibold uppercase tracking-label text-muted-foreground">
              Case Mastery
            </span>
            <div className="flex max-w-125 flex-col gap-3">
              {caseProgress.map((row) => {
                const score = row.case_understanding * 0.3 + row.form_recall * 0.7;
                const pct = Math.round(score * 100);
                return (
                  <div key={row.case_name} className="flex items-center gap-3">
                    <p className="w-22.5 shrink-0 text-label font-medium capitalize text-foreground">
                      {row.case_name}
                    </p>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor(score)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="w-8 shrink-0 text-right font-mono text-xs text-foreground">
                      {pct}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
