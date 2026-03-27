function splitSentence(
  sentence: string,
  targetForm: string
): { before: string; match: string; after: string } {
  const escaped = targetForm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu');
  const m = regex.exec(sentence);
  if (!m) return { before: sentence, match: '', after: '' };
  return {
    before: sentence.slice(0, m.index),
    match: sentence.slice(m.index, m.index + m[0].length),
    after: sentence.slice(m.index + m[0].length),
  };
}

type SessionQuestionProps = {
  sentence: string;
  target: string;
  label?: string;
  description?: string;
  hidden?: boolean;
};
export const SessionQuestion = ({
  sentence,
  target,
  label,
  description,
  hidden,
}: SessionQuestionProps) => {
  const { before, match, after } = splitSentence(sentence, target);

  return (
    <div className="shrink-0 px-4 pt-4">
      {description && (
        <p className="mt-1.5 text-label leading-normal text-[#9CA3AF]">{description}</p>
      )}
      <h4 className="line-clamp-2 h-12.5 text-2xl leading-snug text-[#1A1A1A]">
        {before}
        {hidden ? <span>_____</span> : <span className="font-bold">{match}</span>}
        {after}
      </h4>
      {label && (
        <div className="my-2 flex items-center gap-1">
          <span className="text-label text-[#9CA3AF]">Type the correct form for</span>
          {label && (
            <span className="inline-flex items-center rounded-md border border-[#E5E7EB] bg-white px-2 py-1 text-[14px] font-semibold text-[#1A1A1A]">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
