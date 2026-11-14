import { ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { paths } from '@/features/routes/paths';
import { useAspectPartners } from '@/features/dictionary/hooks/useAspectPartners';

const ASPECT_HINT: Record<string, string> = {
  perfective: 'Perfective: one completed action or result.',
  imperfective: 'Imperfective: a process, an ongoing or repeated action.',
};

type AspectPartnersProps = {
  rootWordId: number;
  isVerb: boolean;
};

/** The verb's aspect counterpart(s): same meaning, other aspect (dělat ↔ udělat). */
export const AspectPartners = ({ rootWordId, isVerb }: AspectPartnersProps) => {
  const { data: partners, isLoading, error } = useAspectPartners(rootWordId, isVerb);

  if (!isVerb) return null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-2">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load the aspect partner.</p>;
  }

  if (!partners || partners.length === 0) return null;

  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="text-caption font-semibold uppercase tracking-label text-muted-foreground">
        Aspect partner
      </h3>
      <ul className="flex flex-col gap-2">
        {partners.map((partner) => (
          <li key={partner.id}>
            <Link
              to={paths.word(partner.id)}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3 transition-colors hover:bg-muted"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="flex flex-wrap items-center gap-2">
                  <strong className="text-lg font-semibold">{partner.in_czech}</strong>
                  {partner.word_aspect && (
                    <span className="rounded-xl border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {partner.word_aspect}
                    </span>
                  )}
                </p>
                <p className="truncate text-sm text-muted-foreground">{partner.in_english}</p>
                {partner.word_aspect && ASPECT_HINT[partner.word_aspect] && (
                  <p className="text-xs text-muted-foreground">
                    {ASPECT_HINT[partner.word_aspect]}
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
