'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { TheGridLogo } from './the-grid-logo';

export function AuthClient({ googleConfigured, nextAuthConfigured }: { googleConfigured: boolean; nextAuthConfigured: boolean }) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
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
        <h1 style={{ marginTop: 0, textAlign: 'center' }}>{tab === 'login' ? 'Sign in to The Grid' : 'Create your Grid account'}</h1>
        <div className="action-row" style={{ justifyContent: 'center', marginBottom: 8 }}>
          <button className={`ghost-btn ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Login</button>
          <button className={`ghost-btn ${tab === 'signup' ? 'active' : ''}`} onClick={() => setTab('signup')}>Signup</button>
        </div>

        <label className="field-label">Email</label>
        <input className="game-input" placeholder="you@example.com" />
        <label className="field-label">Password</label>
        <input className="game-input" type="password" placeholder="••••••••" />
        {tab === 'signup' && (
          <>
            <label className="field-label">Confirm Password</label>
            <input className="game-input" type="password" placeholder="••••••••" />
          </>
        )}

        <button className="wood-btn" style={{ width: '100%', marginTop: 10 }}>{tab === 'login' ? 'Login' : 'Create account'}</button>
        <button className="ghost-btn" style={{ width: '100%', marginTop: 8 }} onClick={handleGoogle} disabled={!signInAvailable}>Sign in with Google</button>
        {!signInAvailable && <p className="muted">Sign-in unavailable (not configured). Set NEXTAUTH_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.</p>}
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
