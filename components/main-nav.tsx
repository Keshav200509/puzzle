'use client';

import Link from 'next/link';

export function MainNav() {
  return (
    <nav className="panel" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
      <Link className="wood-btn" href="/">
        Landing
      </Link>
      <Link className="wood-btn" href="/auth">
        Auth
      </Link>
      <Link className="wood-btn" href="/home">
        Home
      </Link>
      <Link className="wood-btn" href="/play">
        Play
      </Link>
      <Link className="wood-btn" href="/stats">
        Stats
      </Link>
      <Link className="wood-btn" href="/leaderboard">
        Leaderboard
      </Link>
    </nav>
  );
}
