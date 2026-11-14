import { BookPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '../conversation';
import { useRequestWord } from '../hooks/useRequestWord';
import { CorrectionCard } from './CorrectionCard';

const MissingWordButton = ({ word }: { word: string }) => {
  const requestWord = useRequestWord();
  const handleClick = () =>
    requestWord.mutate(word, {
      onSuccess: () => toast.success(`Generating "${word}". Telegram will report when it's in.`),
      onError: (error) => toast.error(error.message),
    });
  return (
    <button
      onClick={handleClick}
      disabled={requestWord.isPending || requestWord.isSuccess}
      className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-label font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
    >
      <BookPlus className="h-3.5 w-3.5" />
      {requestWord.isSuccess ? `Adding ${word}…` : `Add "${word}" to dictionary`}
    </button>
  );
};

/** A chat bubble; the learner's own messages carry their corrections underneath. */
export const ChatMessageView = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';
  const corrections = message.corrections ?? [];

  return (
    <li className={cn('flex flex-col gap-2', isUser ? 'items-end' : 'items-start')}>
      <p
        className={cn(
          'max-w-5/6 whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-base leading-relaxed',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
        )}
      >
        {message.text}
        {message.streaming && !message.text && (
          <Loader2 className="inline h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </p>

      {isUser && message.check === 'checking' && (
        <p className="flex items-center gap-1.5 text-label text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…
        </p>
      )}
      {isUser && message.check === 'failed' && (
        <p className="text-label text-muted-foreground">Couldn't check this message.</p>
      )}
      {isUser && message.check === 'done' && corrections.length === 0 && (
        <p className="text-label text-success">No mistakes 🎉</p>
      )}

      {corrections.length > 0 && (
        <ul className="flex w-full max-w-5/6 flex-col gap-2">
          {corrections.map((correction) => (
            <CorrectionCard key={correction.id} correction={correction} />
          ))}
        </ul>
      )}

      {(message.missingWords ?? []).length > 0 && (
        <div className="flex max-w-5/6 flex-wrap justify-end gap-2">
          {(message.missingWords ?? []).map((word) => (
            <MissingWordButton key={word} word={word} />
          ))}
        </div>
      )}
    </li>
  );
};
