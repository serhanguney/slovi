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

function barColor(score: number): string {
  if (score >= 0.7) return '#16A34A';
  if (score >= 0.2) return '#D97706';
  return '#DC2626';
}

export function ProgressTab() {
  const { data: knownWords = [] } = useKnownWords();
  const { data: learningCount = 0 } = useLearnigCount();
  const { data: caseProgress = [] } = usePracticeProgress();

  const knownCount = knownWords.length;
  const reviewCount = knownWords.filter((w) => w.is_dusty).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
      <div className="flex flex-col gap-6">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5 rounded-[12px] border border-[#E5E7EB] bg-white p-4">
            <CircleCheck className="h-[18px] w-[18px] text-[#16A34A]" />
            <span className="font-mono text-[24px] font-bold text-[#1A1A1A]">{knownCount}</span>
            <span className="text-[12px] text-[#9CA3AF]">Known</span>
            <span className="text-[11px] leading-snug text-[#C4C9D4]">
              A word is known when its accurately practiced in Case Memory mode.
            </span>
          </div>
          <div className="flex flex-col gap-1.5 rounded-[12px] border border-[#E5E7EB] bg-white p-4">
            <BookOpen className="h-[18px] w-[18px] text-[#9CA3AF]" />
            <span className="font-mono text-[24px] font-bold text-[#1A1A1A]">{learningCount}</span>
            <span className="text-[12px] text-[#9CA3AF]">Learning</span>
            <span className="text-[11px] leading-snug text-[#C4C9D4]">
              Words not yet reached the expected success in Case Memory mode
            </span>
          </div>
          <div className="flex flex-col gap-1.5 rounded-[12px] border border-[#E5E7EB] bg-white p-4">
            <Clock3 className="h-[18px] w-[18px] text-[#D97706]" />
            <span className="font-mono text-[24px] font-bold text-[#1A1A1A]">{reviewCount}</span>
            <span className="text-[12px] text-[#9CA3AF]">Review</span>
            <span className="text-[11px] leading-snug text-[#C4C9D4]">
              Known words not practiced in 90 days
            </span>
          </div>
        </div>

        {/* Case mastery */}
        {caseProgress.length > 0 && (
          <div className="flex flex-col gap-4">
            <span className="text-[11px] font-semibold uppercase tracking-[1px] text-[#9CA3AF]">
              Case Mastery
            </span>
            <div className="flex max-w-[500px] flex-col gap-3">
              {caseProgress.map((row) => {
                const score = row.case_understanding * 0.3 + row.form_recall * 0.7;
                const pct = Math.round(score * 100);
                return (
                  <div key={row.case_name} className="flex items-center gap-3">
                    <span className="w-[90px] shrink-0 text-[13px] font-medium capitalize text-[#1A1A1A]">
                      {row.case_name}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E5E7EB]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: barColor(score) }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right font-mono text-[12px] font-semibold text-[#1A1A1A]">
                      {pct}%
                    </span>
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
