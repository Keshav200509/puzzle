'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/home',         label: 'HQ',       emoji: '🧭' },
  { href: '/play',         label: 'Daily',    emoji: '🌟' },
  { href: '/levels',       label: 'Campaign', emoji: '🗺️' },
  { href: '/studio',       label: 'Studio',   emoji: '🎨' },
  { href: '/leaderboard',  label: 'Leaders',  emoji: '🏆' },
  { href: '/stats',        label: 'Stats',    emoji: '📈' },
  { href: '/achievements', label: 'Badges',   emoji: '🎖️' },
  { href: '/auth',         label: 'Account',  emoji: '👤' }
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <header className="top-nav-wrap">
      <nav className="top-nav" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href === '/play' && pathname === '/');
          return (
            <Link
              key={item.href}
              className={`top-nav-item${active ? ' active' : ''}`}
              href={item.href}
            >
              <span aria-hidden>{item.emoji}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
