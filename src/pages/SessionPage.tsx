import { useLocation, Navigate } from 'react-router-dom';
import { SessionScreen } from '@/features/practice/components/SessionScreen';
import { VocabularySessionScreen } from '@/features/practice/components/VocabularySessionScreen';
import { CaseStudySessionScreen } from '@/features/practice/components/CaseStudySessionScreen';
import type { PracticeCard, VocabularyCard, CaseStudyCard } from '@/features/practice/types';

type SessionLocationState =
  | { mode: 'simple_vocabulary'; cards: VocabularyCard[] }
  | { mode: 'case_understanding' | 'form_recall'; cards: PracticeCard[] }
  | { mode: 'case_study'; cards: CaseStudyCard[] };

export function SessionPage() {
  const location = useLocation();
  const state = location.state as SessionLocationState | null;

  if (!state?.cards?.length || !state.mode) {
    return <Navigate to="/practice" replace />;
  }

  if (state.mode === 'simple_vocabulary') {
    return <VocabularySessionScreen cards={state.cards} />;
  }

  if (state.mode === 'case_study') {
    return <CaseStudySessionScreen cards={state.cards} />;
  }

  return <SessionScreen cards={state.cards} mode={state.mode} />;
}
