import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Loader2, MessageSquarePlus, SendHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { paths } from '@/features/routes/paths';
import { CoachError, isCoachConfigured, streamChat, type CoachEvent } from '@/features/coach/api';
import { missedWordIds, type ChatMessage } from '@/features/coach/conversation';
import { ChatMessageView } from '@/features/coach/components/ChatMessageView';
import { useCoachHistory } from '@/features/coach/hooks/useCoachHistory';
import { useCoachThread } from '@/features/coach/hooks/useCoachThread';
import { useStudyMissedWords } from '@/features/coach/hooks/useStudyMissedWords';

const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  text: 'Ahoj! Napiš mi česky, co děláš dnes nebo co jsi dělal včera. (Write to me in Czech — I’ll reply and mark your mistakes.)',
};

/** Apply one stream event to the turn's two messages (the learner's and the coach's). */
const applyEvent =
  (userId: string, replyId: string, event: CoachEvent) =>
  (messages: ChatMessage[]): ChatMessage[] =>
    messages.map((message) => {
      if (message.id === replyId) {
        if (event.type === 'text') return { ...message, text: message.text + event.delta };
        if (event.type === 'error')
          return { ...message, streaming: false, text: message.text || '⚠️ ' + event.message };
        if (event.type === 'done') return { ...message, streaming: false };
      }
      if (message.id === userId) {
        if (event.type === 'corrections')
          return {
            ...message,
            check: 'done',
            corrections: event.errors,
            missingWords: event.missingWords,
          };
        if (event.type === 'corrections_failed') return { ...message, check: 'failed' };
        if (event.type === 'done' && message.check === 'checking')
          return { ...message, check: 'failed' };
      }
      return message;
    });

export const ChatPage = () => {
  const navigate = useNavigate();
  const configured = isCoachConfigured();
  const { threadId, startNew } = useCoachThread();
  const {
    data: history,
    isPending: historyPending,
    error: historyError,
  } = useCoachHistory(threadId, configured);
  const studyMissed = useStudyMissedWords();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listEnd = useRef<HTMLLIElement>(null);

  // A loaded or switched thread replaces what is on screen.
  useEffect(() => {
    if (history) setMessages(history);
  }, [history]);

  useEffect(() => {
    listEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const notAllowed = historyError instanceof CoachError && historyError.status === 403;

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    const userId = crypto.randomUUID();
    const replyId = crypto.randomUUID();
    setDraft('');
    setSending(true);
    setMessages((current) => [
      ...current,
      { id: userId, role: 'user', text, check: 'checking' },
      { id: replyId, role: 'assistant', text: '', streaming: true },
    ]);
    try {
      await streamChat({ threadId, message: text }, (event) =>
        setMessages(applyEvent(userId, replyId, event))
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The coach is unavailable.';
      setMessages(applyEvent(userId, replyId, { type: 'error', message }));
      setMessages(applyEvent(userId, replyId, { type: 'done' }));
    } finally {
      setSending(false);
    }
  };

  const handleNewChat = () => {
    if (sending) return;
    setMessages([]);
    startNew();
  };

  const missedIds = missedWordIds(messages);

  const handleStudyMissed = () =>
    studyMissed.mutate(missedIds, {
      onSuccess: (cards) => {
        if (cards.length === 0) {
          // Case study covers case forms only (nouns, adjectives, pronouns), not verbs.
          toast.info(
            'Nothing to practise here yet: case study covers nouns, adjectives and pronouns.'
          );
          return;
        }
        navigate(paths.session, { state: { mode: 'case_study', cards } });
      },
      onError: (error) => toast.error(error.message),
    });

  const shown = messages.length > 0 ? messages : [GREETING];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-8 md:pt-8">
        <h1 className="text-lg font-semibold text-foreground">Chat</h1>
        <div className="flex items-center gap-2">
          {missedIds.length > 0 && (
            <button
              onClick={handleStudyMissed}
              disabled={studyMissed.isPending}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-label font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              {studyMissed.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Dumbbell className="h-4 w-4" />
              )}
              Practice what I missed
            </button>
          )}
          <button
            onClick={handleNewChat}
            disabled={sending}
            aria-label="New chat"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <MessageSquarePlus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-8">
        {!configured || notAllowed ? (
          <p className="mx-auto max-w-md pt-10 text-center text-sm text-muted-foreground">
            {notAllowed
              ? 'The coach is not enabled for this account.'
              : 'The coach is not configured: set VITE_SLOVI_AGENT_URL.'}
          </p>
        ) : historyPending ? (
          <div className="flex justify-center pt-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ul className="mx-auto flex max-w-2xl flex-col gap-4">
            {shown.map((message) => (
              <ChatMessageView key={message.id} message={message} />
            ))}
            <li ref={listEnd} aria-hidden />
          </ul>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
        className="shrink-0 border-t border-border px-4 py-3 md:px-8"
      >
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Napiš něco česky…"
            disabled={!configured || notAllowed}
            className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-base text-foreground outline-none focus:border-foreground disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending || !configured || notAllowed}
            aria-label="Send"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <SendHorizontal className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
