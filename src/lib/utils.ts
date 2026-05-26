import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach twMerge about custom theme tokens so it classifies them correctly
// and doesn't drop one class when it mistakenly thinks two utilities conflict.
//
// Without this:
//   - text-caption (font-size) is confused with text-color → dropped next to text-success
//   - border-success / border-warning (border-color) are unknown → not deduplicated correctly
//   - tracking-label etc. (letter-spacing) are unknown → not deduplicated correctly
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        'success',
        'success-foreground',
        'success-subtle',
        'warning',
        'warning-foreground',
        'warning-subtle',
        'destructive-subtle',
        'violet',
        'violet-foreground',
        'violet-subtle',
      ],
    },
    classGroups: {
      'font-size': [{ text: ['2xs', 'caption', 'label', 'title', 'heading', 'display'] }],
      tracking: [{ tracking: ['label', 'body', 'tight-label'] }],
    },
  },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
