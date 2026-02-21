import type { CSSProperties } from 'react';

export function TheGridLogo({ size = 130, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 220 220" width={size} height={size} style={style} role="img" aria-label="The Grid logo">
      <defs>
        <linearGradient id="badge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0b1024" />
          <stop offset="100%" stopColor="#1d4f59" />
        </linearGradient>
        <linearGradient id="pipe" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <circle cx="110" cy="110" r="102" fill="url(#badge)" stroke="#fbbf24" strokeWidth="6" />
      <g opacity="0.45" stroke="#94a3b8" strokeWidth="2">
        {Array.from({ length: 6 }).map((_, i) => (
          <line key={`v-${i}`} x1={35 + i * 30} y1="38" x2={35 + i * 30} y2="182" />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <line key={`h-${i}`} x1="35" y1={38 + i * 29} x2="185" y2={38 + i * 29} />
        ))}
      </g>
      <path d="M 35 145 Q 90 145 90 90 Q 90 55 130 55 L 185 55" stroke="#111827" strokeWidth="30" fill="none" strokeLinecap="round" />
      <path d="M 35 145 Q 90 145 90 90 Q 90 55 130 55 L 185 55" stroke="url(#pipe)" strokeWidth="24" fill="none" strokeLinecap="round" />
      <circle cx="150" cy="55" r="14" fill="#f8fafc" stroke="#64748b" strokeWidth="3" />
      <text x="110" y="195" textAnchor="middle" fill="#fef3c7" fontSize="26" fontWeight="800" letterSpacing="2">
        THE GRID
      </text>
    </svg>
  );
}
