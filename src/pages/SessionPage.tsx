import { useLocation, Navigate } from 'react-router-dom';
import { SessionScreen } from '@/features/practice/components/SessionScreen';
import type { PracticeCard, PracticeMode } from '@/features/practice/types';

interface SessionLocationState {
  mode: PracticeMode;
  cards: PracticeCard[];
}

export function SessionPage() {
  const location = useLocation();
  const state = location.state as SessionLocationState | null;

  if (!state?.cards?.length || !state.mode) {
    return <Navigate to="/practice" replace />;
  }

  return <SessionScreen cards={state.cards} mode={state.mode} />;
}
