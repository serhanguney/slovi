import type { ReactNode } from 'react';

export const SessionWrapper = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex h-[100dvh] flex-col bg-[#FEF7EE] md:items-center md:justify-center">
      <div className="flex w-full min-h-0 flex-col md:w-[560px] md:max-h-[860px] flex-1">
        {children}
      </div>
    </div>
  );
};
