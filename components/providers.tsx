'use client';

import type { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';

export function Providers({ children, authConfigured }: { children: ReactNode; authConfigured: boolean }) {
  if (!authConfigured) {
    return (
      <SessionProvider session={null} refetchInterval={0} refetchOnWindowFocus={false}>
        {children}
      </SessionProvider>
    );
  }

  return <SessionProvider>{children}</SessionProvider>;
}
