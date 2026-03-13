function splitSentence(
  sentence: string,
  targetForm: string
): { before: string; match: string; after: string } {
  const lower = sentence.toLowerCase();
  const idx = lower.indexOf(targetForm.toLowerCase());
  if (idx === -1) return { before: sentence, match: '', after: '' };
  return {
    before: sentence.slice(0, idx),
    match: sentence.slice(idx, idx + targetForm.length),
    after: sentence.slice(idx + targetForm.length),
  };
}

type SessionQuestionProps = {
  sentence: string;
  target: string;
  description?: string;
};
export const SessionQuestion = ({ sentence, target, description }: SessionQuestionProps) => {
  console.log({ target });
  const { before, match, after } = splitSentence(sentence, target);
  return (
    <div className="shrink-0 px-4 pt-4">
      <p className="line-clamp-2 h-[50px] text-[18px] leading-snug text-[#1A1A1A]">
        {before}
        <span className="font-bold">{match}</span>
        {after}
      </p>
      {description ? (
        <p className="mt-1.5 line-clamp-2 h-[39px] text-[13px] leading-normal text-[#9CA3AF]">
          {description}
        </p>
      ) : null}
    </div>
  );
};
