import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/client';
import { correctionSchema, fetchHistory } from '../api';
import { attachCorrections } from '../conversation';

/**
 * A thread's messages (from slovi-agent's memory) with their stored corrections (read
 * straight from Supabase: RLS lets users read their own writing_* rows).
 */
export const useCoachHistory = (threadId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ['coach-history', threadId],
    enabled,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    queryFn: async () => {
      const [history, submissions] = await Promise.all([
        fetchHistory(threadId),
        supabase
          .from('writing_submissions')
          .select(
            'text, writing_errors(id, original, corrected, error_type, explanation, lemma, root_word_id)'
          )
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true }),
      ]);
      if (submissions.error) throw new Error(submissions.error.message);
      return attachCorrections(
        history,
        submissions.data.map((submission) => ({
          text: submission.text,
          corrections: correctionSchema.array().parse(submission.writing_errors),
        }))
      );
    },
  });
};
