import { useState } from 'react';
import { User, Users, BookOpen, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FetchedWordForm, ExampleSentence } from '@/features/dictionary/hooks/useWordDetails';
import type { Gender, Plurality } from '@/supabase/types';

// ── Constants ────────────────────────────────────────────────────────────────

const CASE_ORDER: Record<string, number> = {
  nominative: 0,
  genitive: 1,
  dative: 2,
  accusative: 3,
  vocative: 4,
  locative: 5,
  instrumental: 6,
};

const GENDER_LABELS: Record<Gender, string> = {
  masculine_animate: 'masc. animate',
  masculine_inanimate: 'masc. inanimate',
  masculine: 'masculine',
  feminine: 'feminine',
  neuter: 'neuter',
};

const GENDER_ORDER: Record<Gender, number> = {
  masculine_animate: 0,
  masculine_inanimate: 1,
  masculine: 2,
  feminine: 3,
  neuter: 4,
};

// ── Types ────────────────────────────────────────────────────────────────────

type FormExample = {
  sentence: ExampleSentence;
  gender: Gender | null;
};

type FormGroup = {
  formInCzech: string;
  genders: Gender[];
  examples: FormExample[];
};

type CaseSection = {
  caseName: string;
  formGroups: FormGroup[];
};

type NumberBlock = {
  plurality: Plurality;
  cases: CaseSection[];
};

// ── Data preparation ─────────────────────────────────────────────────────────

function buildNumberBlocks(forms: FetchedWordForm[], examples: ExampleSentence[]): NumberBlock[] {
  const caseForms = forms.filter((f) => f.form_type.category === 'case');
  const examplesByFormId = new Map(examples.map((e) => [e.word_form_id, e]));

  const byPlurality: Record<string, FetchedWordForm[]> = {};
  for (const form of caseForms) {
    if (!byPlurality[form.plurality]) byPlurality[form.plurality] = [];
    byPlurality[form.plurality].push(form);
  }

  const blocks: NumberBlock[] = [];
  for (const plurality of ['singular', 'plural'] as const) {
    const pluralityForms = byPlurality[plurality] ?? [];
    if (pluralityForms.length === 0) continue;

    const byCaseName: Record<string, FetchedWordForm[]> = {};
    for (const form of pluralityForms) {
      const name = form.form_type.name;
      if (!byCaseName[name]) byCaseName[name] = [];
      byCaseName[name].push(form);
    }

    const cases: CaseSection[] = Object.entries(byCaseName)
      .sort(([a], [b]) => (CASE_ORDER[a] ?? 99) - (CASE_ORDER[b] ?? 99))
      .map(([caseName, caseForms]) => {
        const sorted = [...caseForms].sort(
          (a, b) =>
            (a.gender !== null ? GENDER_ORDER[a.gender] : 99) -
            (b.gender !== null ? GENDER_ORDER[b.gender] : 99)
        );

        // Group forms with the same value — preserves first-occurrence order
        const seen = new Map<string, FormGroup>();
        for (const form of sorted) {
          const existing = seen.get(form.form_in_czech);
          const sentence = examplesByFormId.get(form.id);
          if (existing) {
            if (form.gender !== null) existing.genders.push(form.gender);
            if (sentence) existing.examples.push({ sentence, gender: form.gender });
          } else {
            seen.set(form.form_in_czech, {
              formInCzech: form.form_in_czech,
              genders: form.gender !== null ? [form.gender] : [],
              examples: sentence ? [{ sentence, gender: form.gender }] : [],
            });
          }
        }

        return { caseName, formGroups: [...seen.values()] };
      });

    blocks.push({ plurality, cases });
  }

  return blocks;
}

// ── Sub-components ───────────────────────────────────────────────────────────

const CaseSectionItem = ({
  caseName,
  formGroups,
  showExamples,
}: CaseSection & { showExamples: boolean }) => {
  return (
    <div className="flex flex-col px-4 py-3">
      <span className="mb-1.5 text-sm capitalize text-muted-foreground">{caseName}</span>

      <div className="flex flex-col">
        {formGroups.map((group, index, arr) => {
          return (
            <div
              key={group.formInCzech}
              className={cn(
                'flex flex-col gap-1 py-1.5',
                index < arr.length - 1 && 'border-b border-border'
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-foreground">{group.formInCzech}</h3>
                {group.genders.length > 0 && (
                  <p className="text-caption text-muted-foreground">
                    {group.genders
                      .map((g) => GENDER_LABELS[g])
                      .join(', ')
                      .replace(
                        `${GENDER_LABELS.masculine_animate}, ${GENDER_LABELS.masculine_inanimate}`,
                        GENDER_LABELS.masculine
                      )}
                  </p>
                )}
              </div>
              {showExamples &&
                group.examples.map(({ sentence, gender }) => {
                  return (
                    <div key={sentence.id} className="flex justify-between gap-4">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-caption italic text-muted-foreground">
                          {sentence.czech_sentence}
                        </p>
                        <p className="text-caption italic text-muted-foreground">
                          {sentence.english_sentence}
                        </p>
                      </div>
                      {gender !== null && (
                        <p className="shrink-0 text-caption text-muted-foreground">
                          {GENDER_LABELS[gender]}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const NumberCard = ({ plurality, cases }: NumberBlock) => {
  const [showExamples, setShowExamples] = useState(false);
  const isSingular = plurality === 'singular';
  const Icon = isSingular ? User : Users;
  const hasExamples = cases.some((c) => c.formGroups.some((g) => g.examples.length > 0));

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted">
      <div className="flex items-center gap-2.5 p-4">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span className="text-lg font-bold text-foreground capitalize">{plurality}</span>
      </div>

      <div className="h-px bg-border" />

      <div className="flex flex-col py-2">
        {cases.map((caseSection, index, arr) => (
          <div
            key={caseSection.caseName}
            className={cn(index < arr.length - 1 && 'border-b border-border')}
          >
            <CaseSectionItem {...caseSection} showExamples={showExamples} />
          </div>
        ))}
      </div>

      {hasExamples && (
        <button
          onClick={() => setShowExamples((prev) => !prev)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-border py-3 text-caption font-medium text-muted-foreground transition-colors hover:bg-muted/50"
        >
          <BookOpen className="h-3.5 w-3.5" />
          {showExamples ? 'Hide examples' : 'Show examples'}
          <ChevronDown
            className={cn('h-3 w-3 transition-transform', showExamples && 'rotate-180')}
          />
        </button>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

type CaseWordDetailProps = {
  forms: FetchedWordForm[];
  examples: ExampleSentence[];
};

export const CaseWordDetail = ({ forms, examples }: CaseWordDetailProps) => {
  const blocks = buildNumberBlocks(forms, examples);

  if (blocks.length === 0) return null;

  return (
    <div className="mx-auto flex w-full max-w-175 flex-col gap-5">
      {blocks.map((block) => (
        <NumberCard key={block.plurality} {...block} />
      ))}
    </div>
  );
};
