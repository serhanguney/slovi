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
    fresh: 'bg-[#DCFCE7] text-[#16A34A]',
    stable: 'bg-[#FEF9C3] text-[#A16207]',
    fading: 'bg-[#FEE2E2] text-[#DC2626]',
  };

  const labels: Record<RetentionStatus, string> = {
    fresh: 'Fresh',
    stable: 'Stable',
    fading: 'Fading',
  };

  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', styles[status])}>
      {labels[status]}
    </span>
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
        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#D1FAE5]">
          <Check className="h-2.5 w-2.5 text-[#059669]" />
        </div>
      ) : (
        <div className="h-4 w-4 shrink-0 rounded-full border border-[#E5E7EB]" />
      )}
      <span className="flex-1 text-[13px] text-[#374151]">{label}</span>
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
    <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
      {/* Header */}
      <div className="px-4 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-bold text-[#1A1A1A]">{word.in_czech}</span>
            <span className="rounded-md bg-[#F3F4F6] px-1.5 py-0.5 text-[11px] tracking-[0.5px] text-[#6B7280]">
              {word.word_type}
            </span>
          </div>
          {word.is_known ? (
            <span className="shrink-0 rounded-full bg-[#D1FAE5] px-2.5 py-0.5 text-[11px] font-semibold text-[#059669]">
              Known
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-[11px] font-semibold text-[#6B7280]">
              Learning
            </span>
          )}
        </div>

        {/* Translation */}
        <p className="mt-1 text-[13px] text-[#6B7280]">{word.in_english}</p>

        {/* Mode rows */}
        <div className="mt-3 flex flex-col gap-2">
          <ModeRow label="Simple Vocabulary" status={word.sv_status} />
          <ModeRow label="Case Logic" status={word.cu_status} />
          <ModeRow label="Case Memory" status={word.fr_status} />
        </div>

        {/* Last practiced */}
        <p className="mt-3 pb-1 text-[11px] text-[#9CA3AF]">Last practiced {lastPracticed}</p>

        <Link
          className="flex items-center gap-1 w-auto pb-3 text-[11px] text-[#9CA3AF] hover:underline"
          to={`/word/${word.root_word_id}`}
        >
          Go to word
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Expandable cases */}
      {hasCases && (
        <>
          <div className="border-t border-[#F3F4F6]" />

          {expanded && (
            <div className="px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.5px] text-[#9CA3AF]">
                Practiced cases
              </p>
              <div className="flex flex-wrap gap-1.5">
                {word.practiced_cases.map((c) => (
                  <div key={c} className="flex items-center gap-1 text-[12px] text-[#374151]">
                    <Check className="h-3 w-3 text-[#059669]" />
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="flex w-full items-center justify-center gap-1.5 border-t border-[#F3F4F6] px-4 py-2.5 text-[13px] font-semibold text-[#374151] transition-colors hover:bg-black/[0.03]"
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
