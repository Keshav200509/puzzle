import Link from 'next/link';

export default function LandingPage() {
  // Static mini-grid layout: row 2 is the pipe path (col 0=start, 1=empty, 2-3=pipe, 4=end)
  const cells = Array.from({ length: 25 }, (_, i) => {
    const row = Math.floor(i / 5);
    const col = i % 5;
    if (row === 2 && col === 0) return 'start';
    if (row === 2 && col === 4) return 'end';
    if (row === 2 && col === 1) return 'empty';
    if (row === 2) return 'path';
    return 'default';
  });

  return (
    <main className="onboarding-page">
      <div className="onboarding-pattern" />

      <section className="glass-card" style={{ textAlign: 'center' }}>
        <span className="cover-badge">Daily Puzzle Game</span>

        <h1 style={{ margin: '10px 0 6px', letterSpacing: '-0.02em' }}>The Grid</h1>
        <p className="muted" style={{ marginBottom: 20, fontSize: '0.95rem' }}>
          One puzzle every day. Slide tiles, build the pipe route, earn your streak.
        </p>

        {/* Mini board preview */}
        <div className="mini-grid" aria-hidden>
          {cells.map((type, i) => (
            <div key={i} className={`mini-cell ${type}`} />
          ))}
        </div>

        {/* How it works */}
        <div className="cover-flow">
          <article>
            <span className="step-num">1</span>
            <div>
              <strong>Slide tiles</strong>
              <span>Move pieces adjacent to the blank into the empty space</span>
            </div>
          </article>
          <article>
            <span className="step-num">2</span>
            <div>
              <strong>Build the route</strong>
              <span>Align pipes to connect S → E without gaps</span>
            </div>
          </article>
          <article>
            <span className="step-num">3</span>
            <div>
              <strong>Earn your streak</strong>
              <span>Fewer moves = more stars. Come back daily to keep your streak</span>
            </div>
          </article>
        </div>

        <div className="action-row" style={{ justifyContent: 'center', marginTop: 16 }}>
          <Link className="wood-btn" href="/play" style={{ minWidth: 180 }}>
            Play Today&apos;s Puzzle
          </Link>
          <Link className="ghost-btn" href="/home">
            My Dashboard
          </Link>
        </div>

        <p className="muted" style={{ marginTop: 14, fontSize: '0.76rem' }}>
          Free · Offline-ready · Sign in to sync and join global leaderboards
        </p>
      </section>
    </main>
  );
}
