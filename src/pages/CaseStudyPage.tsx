import { useParams, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { CaseStudySessionScreen } from '@/features/practice/components/CaseStudySessionScreen';
import { useBuildCaseStudySession } from '@/features/practice/hooks/useBuildCaseStudySession';

export const CaseStudyPage = () => {
  const { id } = useParams<{ id: string }>();
  const rootWordId = Number(id);

  const { data: cards, isPending, isError } = useBuildCaseStudySession(rootWordId);

  if (isPending) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !cards?.length) {
    return <Navigate to={`/word/${rootWordId}`} replace />;
  }

  return <CaseStudySessionScreen cards={cards} />;
};
