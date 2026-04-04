import Link from 'next/link';
import { TheGridLogo } from '@/components/the-grid-logo';

export default function LandingPage() {
  return (
    <main className="onboarding-page">
      <div className="onboarding-pattern" />
      <section className="glass-card hero-glass">
        <div className="cover-badge">Daily Puzzle Campaign</div>
        <TheGridLogo size={128} style={{ margin: '0 auto 12px', display: 'block' }} />
        <h1 style={{ margin: 0, textAlign: 'center', fontSize: 'clamp(2rem, 8vw, 3rem)' }}>The Grid: Tunnel Quest</h1>
        <p style={{ textAlign: 'center', opacity: 0.9 }}>
          Slide, route, and clear. A mobile-first pipe puzzle adventure inspired by roll-the-ball gameplay loops.
        </p>

        <div className="cover-flow">
          <article>
            <strong>1. Briefing</strong>
            <span>Daily and campaign missions with objectives.</span>
          </article>
          <article>
            <strong>2. Route Build</strong>
            <span>Slide only adjacent blocks and avoid lock traps.</span>
          </article>
          <article>
            <strong>3. Rewards</strong>
            <span>Earn stars, streaks and leaderboard rank.</span>
          </article>
        </div>

        <div className="chip-row">
          <span className="feature-chip">🧩 Dynamic puzzle pathing</span>
          <span className="feature-chip">📴 Fully offline gameplay</span>
          <span className="feature-chip">🏆 Campaign + daily loop</span>
        </div>
        <div className="action-row" style={{ justifyContent: 'center' }}>
          <Link className="wood-btn" href="/auth">Start Adventure</Link>
          <Link className="ghost-btn" href="/home">Guest Preview</Link>
        </div>
      </section>
    </main>
  );
}
