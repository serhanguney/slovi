import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { WordDetail } from '@/features/dictionary/WordDetail';

export function WordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const rootWordId = Number(id);
  if (!id || isNaN(rootWordId)) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-[100dvh] flex-col px-4 py-4 md:px-10 md:py-8">
      <WordDetail
        rootWordId={rootWordId}
        onClose={() => navigate(-1)}
        onAddToVocabulary={() => {}}
      />
    </div>
  );
}
