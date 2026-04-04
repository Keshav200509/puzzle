import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import { isNextAuthConfigured } from '@/lib/server/auth';
import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers authConfigured={isNextAuthConfigured()}>{children}</Providers>
      </body>
    </html>
  );
}
