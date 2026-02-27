import {
  ArrowLeft,
  Plus,
  Loader2,
  BookOpen,
  Timer,
  Layers,
  FileText,
  TrendingUp,
  Type,
  MoreHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWordDetails, type WordForm, type ExampleSentence } from '@/hooks/useWordDetails';
import { WordFormRow } from '@/components/ui/word-form-row';
import { ExpandableSection } from '@/components/ui/expandable-section';

interface WordDetailProps {
  rootWordId: number;
  onClose: () => void;
  onAddToVocabulary: (rootWordId: number) => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const PREVIEW_COUNT = 3;

const CATEGORY_META: Record<string, { label: string; icon: LucideIcon }> = {
  case: { label: 'Cases', icon: Layers },
  tense: { label: 'Tenses', icon: Timer },
  mood: { label: 'Moods', icon: BookOpen },
  participle: { label: 'Participles', icon: FileText },
  degree: { label: 'Degrees', icon: TrendingUp },
  verbal_noun: { label: 'Verbal Noun', icon: Type },
  other: { label: 'Other', icon: MoreHorizontal },
};

const PLURALITY_ORDER: Record<string, number> = { singular: 0, plural: 1 };
const PERSON_ORDER: Record<string, number> = { '1': 0, '2': 1, '3': 2 };
const PERSON_ORDINALS: Record<string, string> = { '1': '1st', '2': '2nd', '3': '3rd' };

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatFormDescription(form: WordForm): string {
  const parts: string[] = [];
  if (form.person) parts.push(`${PERSON_ORDINALS[form.person] ?? form.person} Person`);
  if (form.gender) parts.push(form.gender);
  if (form.plurality) parts.push(form.plurality);
  if (form.tense) parts.push(form.tense);
  return parts.join(' ');
}

interface ExampleEntry {
  czech: string;
  english: string;
}

function buildExamplesMap(examples: ExampleSentence[]): Map<number, ExampleEntry> {
  return new Map(
    examples.map((e) => [e.word_form_id, { czech: e.czech_sentence, english: e.english_sentence }])
  );
}

/**
 * Renders WordFormRow elements separated by dividers.
 * `trailingDivider` adds border-b on the last row when expanded rows follow below.
 */
function renderFormRows(
  forms: WordForm[],
  trailingDivider = false,
  examplesByFormId?: Map<number, ExampleEntry>
) {
  return forms.map((form, index, arr) => {
    const isLast = index === arr.length - 1;
    const example = examplesByFormId?.get(form.id);
    return (
      <div
        key={form.id}
        className={cn((!isLast || trailingDivider) && 'border-b border-[#F3F4F6]')}
      >
        <WordFormRow
          label={form.form_type.name.toUpperCase()}
          form={form.form_in_czech}
          description={formatFormDescription(form)}
          exampleSentence={example?.czech}
          exampleTranslation={example?.english}
        />
      </div>
    );
  });
}

function sortForms(category: string, forms: WordForm[]): WordForm[] {
  if (category !== 'tense') return forms;
  return [...forms].sort((a, b) => {
    const plurDiff = (PLURALITY_ORDER[a.plurality] ?? 99) - (PLURALITY_ORDER[b.plurality] ?? 99);
    if (plurDiff !== 0) return plurDiff;
    return (PERSON_ORDER[a.person ?? ''] ?? 99) - (PERSON_ORDER[b.person ?? ''] ?? 99);
  });
}

// ── Sub-components ───────────────────────────────────────────────────────────

function WordTypeTags({
  wordType,
  wordAspect,
  size = 'sm',
}: {
  wordType: string;
  wordAspect: string | null;
  size?: 'sm' | 'md';
}) {
  const base = 'rounded-xl font-semibold text-primary-foreground bg-primary';
  const secondary = 'rounded-xl border border-[#E5E7EB] font-medium text-[#6B7280]';
  const padding = size === 'md' ? 'px-3.5 py-1.5 text-[13px]' : 'px-3 py-1 text-xs';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={cn(base, padding)}>{wordType}</span>
      {wordAspect && <span className={cn(secondary, padding)}>{wordAspect}</span>}
    </div>
  );
}

function WordFormSections({
  sections,
  examplesByFormId,
}: {
  sections: ReturnType<typeof buildSections>;
  examplesByFormId: Map<number, ExampleEntry>;
}) {
  return (
    // max-w-[700px] caps the section width on large screens and centers it
    <div className="mx-auto flex w-full max-w-[700px] flex-col gap-4">
      {sections.map(({ category, meta, forms, preview, rest }) => (
        <ExpandableSection
          key={category}
          icon={meta.icon}
          title={meta.label}
          count={forms.length}
          expandedChildren={
            rest.length > 0 ? renderFormRows(rest, false, examplesByFormId) : undefined
          }
        >
          {renderFormRows(preview, rest.length > 0, examplesByFormId)}
        </ExpandableSection>
      ))}
    </div>
  );
}

// ── Data preparation ─────────────────────────────────────────────────────────

function buildSections(forms: WordForm[]) {
  const grouped = forms.reduce(
    (acc, form) => {
      const category = form.form_type?.category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(form);
      return acc;
    },
    {} as Record<string, WordForm[]>
  );

  return Object.entries(grouped).map(([category, categoryForms]) => {
    const sorted = sortForms(category, categoryForms);
    const meta = CATEGORY_META[category] ?? CATEGORY_META.other;
    return {
      category,
      meta,
      forms: sorted,
      preview: sorted.slice(0, PREVIEW_COUNT),
      rest: sorted.slice(PREVIEW_COUNT),
    };
  });
}

// ── Main component ────────────────────────────────────────────────────────────

export function WordDetail({ rootWordId, onClose, onAddToVocabulary }: WordDetailProps) {
  const { data, isLoading, error } = useWordDetails(rootWordId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-8 text-center text-destructive">
        Failed to load word details. Please try again.
      </div>
    );
  }

  const { rootWord, forms, examples } = data;
  const sections = buildSections(forms);
  const examplesByFormId = buildExamplesMap(examples);

  return (
    // min-h-0 is required on every flex-1 node so overflow-y-auto actually triggers
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      {/* ── MOBILE layout (< md) ────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:hidden">
        {/* Header: back arrow + word title + save */}
        <div className="flex items-center justify-between px-6 py-2">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-[#F3F4F6]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-[28px] font-bold leading-tight">{rootWord.in_czech}</h1>
          </div>
          <button
            id="bt"
            onClick={() => onAddToVocabulary(rootWordId)}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Save
          </button>
        </div>

        {/* Translation */}
        <div className="flex flex-col gap-2.5 px-6 py-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">
            Translation
          </span>
          <p className="text-[20px] font-medium leading-snug">{rootWord.in_english}</p>
          <WordTypeTags wordType={rootWord.word_type} wordAspect={rootWord.word_aspect} />
          {rootWord.note && (
            <p className="text-sm leading-relaxed text-muted-foreground">{rootWord.note}</p>
          )}
        </div>

        <div className="h-px bg-[#F3F4F6]" />

        {/* Word forms */}
        <div className="flex flex-col gap-4 px-6 py-4">
          <h2 className="text-[20px] font-bold">Word Forms</h2>
          <WordFormSections sections={sections} examplesByFormId={examplesByFormId} />
        </div>
      </div>

      {/* ── DESKTOP layout (≥ md) ───────────────────────────────────────── */}
      {/* min-h-0 on every node in the chain is what allows overflow-y-auto to work */}
      <div className="hidden min-h-0 md:flex md:flex-1">
        {/* Left column — stays fixed while right scrolls */}
        <div className="flex w-[400px] shrink-0 flex-col gap-6 border-r border-[#F3F4F6] pr-10">
          {/* Word hero */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-[#F3F4F6]"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-[40px] font-extrabold leading-tight">{rootWord.in_czech}</h1>
            </div>
            <WordTypeTags
              wordType={rootWord.word_type}
              wordAspect={rootWord.word_aspect}
              size="md"
            />
          </div>

          {/* Translation card */}
          <div className="flex flex-col gap-2 rounded-2xl border border-[#F3F4F6] bg-[#F9FAFB] p-6">
            <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">
              Translation
            </span>
            <p className="text-2xl font-medium leading-snug">{rootWord.in_english}</p>
            {rootWord.note && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground overflow-y-auto max-h-[200px]">
                {rootWord.note}
              </p>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={() => onAddToVocabulary(rootWordId)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-[14px] font-semibold text-primary-foreground transition-colors hover:brightness-95"
          >
            <Plus className="h-[18px] w-[18px]" />
            Save to My Words
          </button>
        </div>

        {/* Right column — independently scrollable */}
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pl-10 items-center">
          <h2 className="text-2xl font-bold">Word Forms</h2>
          <WordFormSections sections={sections} examplesByFormId={examplesByFormId} />
        </div>
      </div>
    </div>
  );
}
