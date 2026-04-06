import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import { MainNav } from '@/components/main-nav';
import { isNextAuthConfigured } from '@/lib/server/auth';
import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers authConfigured={isNextAuthConfigured()}>
          <MainNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
