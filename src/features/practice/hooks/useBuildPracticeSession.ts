import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/supabase/client';
import type { PracticeMode, PracticeScope } from '../types';

export function useBuildPracticeSession() {
  return useMutation({
    mutationFn: async ({ mode, scope }: { mode: PracticeMode; scope: PracticeScope }) => {
      const { data, error } = await supabase.rpc('build_practice_session', {
        p_mode: mode,
        p_scope: scope,
      });
      if (error) throw new Error(error.message);
      return data;
    },
  });
}
