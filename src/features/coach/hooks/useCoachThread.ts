import { useState } from 'react';

const STORAGE_KEY = 'slovi.coach.threadId';

const newThreadId = () => crypto.randomUUID();

/** Browser storage can throw (private mode, blocked storage): fall back to a fresh thread. */
const readStoredThread = (): string | null => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const storeThread = (threadId: string) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, threadId);
  } catch {
    // Not remembered across reloads; the conversation still works.
  }
};

/** The current coach conversation, remembered in this browser; `startNew` begins another. */
export const useCoachThread = () => {
  const [threadId, setThreadId] = useState(() => {
    const stored = readStoredThread();
    if (stored) return stored;
    const created = newThreadId();
    storeThread(created);
    return created;
  });

  const startNew = () => {
    const created = newThreadId();
    storeThread(created);
    setThreadId(created);
  };

  return { threadId, startNew };
};
