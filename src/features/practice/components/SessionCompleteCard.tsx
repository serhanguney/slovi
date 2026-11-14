import { CircleCheck, CircleX, Trophy } from 'lucide-react';

/** End-of-session summary: correct / incorrect counts and accuracy. */
type SessionCompleteCardProps = {
  correctCount: number;
  incorrectCount: number;
  onDone: () => void;
};

export const SessionCompleteCard = ({
  correctCount,
  incorrectCount,
  onDone,
}: SessionCompleteCardProps) => {
  const total = correctCount + incorrectCount;
  const sessionPct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-[24px] bg-white p-8">
        <div className="mb-5 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <Trophy className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <h2 className="text-center text-[26px] font-bold text-foreground">Session Complete!</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">Great work on this session</p>

        <div className="my-6 h-px w-full bg-muted" />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center gap-2 rounded-[14px] bg-green-50 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <CircleCheck className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-[22px] font-bold text-foreground">{correctCount}</span>
            <span className="text-xs text-green-600">Correct</span>
          </div>

          <div className="flex flex-col items-center gap-2 rounded-[14px] bg-red-50 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
              <CircleX className="h-4 w-4 text-red-500" />
            </div>
            <span className="text-[22px] font-bold text-foreground">{incorrectCount}</span>
            <span className="text-xs text-red-500">Incorrect</span>
          </div>
        </div>

        <div className="my-6 h-px w-full bg-muted" />

        <div className="flex items-center justify-between">
          <span className="text-label text-muted-foreground">Session accuracy</span>
          <span className="text-sm font-semibold text-foreground">{sessionPct}%</span>
        </div>

        <button
          onClick={onDone}
          className="mt-6 flex h-[52px] w-full items-center justify-center rounded-[16px] bg-foreground text-base font-semibold text-white transition-opacity hover:opacity-90"
        >
          Done →
        </button>
      </div>
    </div>
  );
};
