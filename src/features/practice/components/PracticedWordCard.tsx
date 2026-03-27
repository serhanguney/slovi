import { useState } from 'react';
import { Check, ChevronDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PracticedWord } from '../types';
import { Link } from 'react-router-dom';

interface PracticedWordCardProps {
  word: PracticedWord;
}

type RetentionStatus = 'fresh' | 'stable' | 'fading';

function isRetentionStatus(value: string | null): value is RetentionStatus {
  return value === 'fresh' || value === 'stable' || value === 'fading';
}

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string | null }) {
  if (!isRetentionStatus(status)) return null;

  const styles: Record<RetentionStatus, string> = {
    fresh: 'bg-success-subtle text-success',
    stable: 'bg-warning-subtle text-warning',
    fading: 'bg-destructive-subtle text-destructive',
  };

  const labels: Record<RetentionStatus, string> = {
    fresh: 'Fresh',
    stable: 'Stable',
    fading: 'Fading',
  };

  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs', styles[status])}>{labels[status]}</span>
  );
}

// ── Mode row ──────────────────────────────────────────────────────────────────

interface ModeRowProps {
  label: string;
  status: string | null;
}

function ModeRow({ label, status }: ModeRowProps) {
  const practiced = isRetentionStatus(status);

  return (
    <div className="flex items-center gap-2">
      {practiced ? (
        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success-subtle">
          <Check className="h-2.5 w-2.5 text-success" />
        </div>
      ) : (
        <div className="h-4 w-4 shrink-0 rounded-full border border-border" />
      )}
      <span className="flex-1 text-label text-foreground">{label}</span>
      <StatusPill status={status} />
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function PracticedWordCard({ word }: PracticedWordCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasCases = word.practiced_cases.length > 0;

  const lastPracticed = word.last_practiced
    ? new Date(word.last_practiced).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white">
      {/* Header */}
      <div className="px-4 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-bold text-foreground">{word.in_czech}</span>
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-caption tracking-body text-muted-foreground">
              {word.word_type}
            </span>
          </div>
          {word.is_known ? (
            <span className="shrink-0 rounded-full bg-success-subtle px-2.5 py-0.5 text-caption font-semibold text-success">
              Known
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-caption font-semibold text-muted-foreground">
              Learning
            </span>
          )}
        </div>

        {/* Translation */}
        <p className="mt-1 text-label text-muted-foreground">{word.in_english}</p>

        {/* Mode rows */}
        <div className="mt-3 flex flex-col gap-2">
          <ModeRow label="Simple Vocabulary" status={word.sv_status} />
          <ModeRow label="Case Logic" status={word.cu_status} />
          <ModeRow label="Case Memory" status={word.fr_status} />
        </div>

        {/* Last practiced */}
        <p className="mt-3 pb-1 text-caption text-muted-foreground">
          Last practiced {lastPracticed}
        </p>

        <Link
          className="flex items-center gap-1 w-auto pb-3 text-caption text-muted-foreground hover:underline"
          to={`/word/${word.root_word_id}`}
        >
          Go to word
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Expandable cases */}
      {hasCases && (
        <>
          <div className="border-t border-border" />

          {expanded && (
            <div className="px-4 py-3">
              <p className="mb-2 text-caption font-semibold uppercase tracking-body text-muted-foreground">
                Practiced cases
              </p>
              <div className="flex flex-wrap gap-1.5">
                {word.practiced_cases.map((c) => (
                  <div key={c} className="flex items-center gap-1 text-xs text-foreground">
                    <Check className="h-3 w-3 text-success" />
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="flex w-full items-center justify-center gap-1.5 border-t border-border px-4 py-2.5 text-label font-semibold text-foreground transition-colors hover:bg-black/[0.03]"
          >
            {expanded ? 'See less' : 'See more'}
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-200',
                expanded && 'rotate-180'
              )}
            />
          </button>
        </>
      )}
    </div>
  );
}
