import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabase/client';

export type FormRecallEligibility = { scope: string; word_type: string; eligible_count: number }[];

export function useFormRecallEligibleCount() {
  return useQuery({
    queryKey: ['form-recall-eligible-count'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_form_recall_eligible_count');
      if (error) throw new Error(error.message);
      return (data ?? []) as FormRecallEligibility;
    },
  });
}
