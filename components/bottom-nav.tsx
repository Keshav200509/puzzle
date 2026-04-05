'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/home', label: 'Home', icon: '🏠' },
  { href: '/play', label: 'Daily', icon: '🧩' },
  { href: '/levels', label: 'Campaign', icon: '🗺️' },
  { href: '/leaderboard', label: 'Leaders', icon: '🏆' },
  { href: '/stats', label: 'Stats', icon: '📊' }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} className={`bottom-nav-item ${active ? 'active' : ''}`}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
