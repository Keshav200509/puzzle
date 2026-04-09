'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { TheGridLogo } from './the-grid-logo';

export function AuthClient({ googleConfigured, nextAuthConfigured }: { googleConfigured: boolean; nextAuthConfigured: boolean }) {
  const [message, setMessage] = useState('');
  const signInAvailable = googleConfigured && nextAuthConfigured;

  async function handleGoogle() {
    if (!signInAvailable) {
      setMessage('Sign-in unavailable (not configured).');
      return;
    }
    const result = await signIn('google', { callbackUrl: '/home', redirect: false });
    if (result?.error) {
      setMessage('Sign-in failed. Check Google OAuth and NextAuth env configuration.');
    }
  }

  return (
    <main className="onboarding-page">
      <div className="onboarding-pattern" />
      <section className="glass-card" style={{ maxWidth: 440 }}>
        <TheGridLogo size={92} style={{ margin: '0 auto 8px', display: 'block' }} />
        <h1 style={{ marginTop: 0, textAlign: 'center' }}>Sign in to The Grid</h1>

        <button className="wood-btn" style={{ width: '100%', marginTop: 10 }} onClick={handleGoogle} disabled={!signInAvailable}>
          Sign in with Google
        </button>

        {!signInAvailable && (
          <p className="muted" style={{ marginTop: 8 }}>
            Sign-in unavailable (not configured). Set NEXTAUTH_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
          </p>
        )}
        {message && <p className="muted">{message}</p>}

        <p className="muted" style={{ marginTop: 10 }}>
          Guest mode always works offline. Sign in to sync across devices and view global leaderboards.
        </p>
        <Link href="/home" className="wood-btn" style={{ width: '100%', display: 'block', textAlign: 'center', marginTop: 8 }}>
          Continue as Guest
        </Link>
      </section>
    </main>
  );
}
