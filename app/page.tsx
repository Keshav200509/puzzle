import Link from 'next/link';
import { TheGridLogo } from '@/components/the-grid-logo';

export default function LandingPage() {
  return (
    <main className="onboarding-page">
      <div className="onboarding-pattern" />
      <section className="glass-card hero-glass">
        <TheGridLogo size={128} style={{ margin: '0 auto 12px', display: 'block' }} />
        <h1 style={{ margin: 0, textAlign: 'center', fontSize: 'clamp(2rem, 8vw, 3rem)' }}>The Grid</h1>
        <p style={{ textAlign: 'center', opacity: 0.9 }}>
          Route the ball through carved tunnels. Solve the daily board and climb your local leaderboard.
        </p>
        <div className="chip-row">
          <span className="feature-chip">🧩 Daily deterministic puzzle</span>
          <span className="feature-chip">📴 Fully offline gameplay</span>
          <span className="feature-chip">🏆 Local + global leaderboard</span>
        </div>
        <div className="action-row" style={{ justifyContent: 'center' }}>
          <Link className="wood-btn" href="/auth">Start</Link>
          <Link className="ghost-btn" href="/home">Guest Preview</Link>
        </div>
      </section>
    </main>
  );
}
