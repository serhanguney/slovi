import { useMutation } from '@tanstack/react-query';
import { requestWord } from '../api';

/** Ask slovi-agent to generate a word for the dictionary (reported in Telegram). */
export const useRequestWord = () => {
  return useMutation({ mutationFn: (word: string) => requestWord(word) });
};
