import type { ReactNode } from 'react';

export const ActionRowsContainer = ({ children }: { children: ReactNode }) => {
  return (
    <div className="shrink-0 px-6 pb-2 pt-2">
      <div className="flex gap-2">{children}</div>
    </div>
  );
};
