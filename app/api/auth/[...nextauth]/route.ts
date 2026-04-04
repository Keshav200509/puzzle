import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions, isNextAuthConfigured } from '@/lib/server/auth';

function notConfigured() {
  return NextResponse.json(
    { ok: false, code: 'AUTH_NOT_CONFIGURED', error: 'NEXTAUTH_URL and NEXTAUTH_SECRET are required.' },
    { status: 503 }
  );
}

export async function GET(request: Request) {
  if (!isNextAuthConfigured()) return notConfigured();
  const handler = NextAuth(authOptions);
  return handler(request);
}

export async function POST(request: Request) {
  if (!isNextAuthConfigured()) return notConfigured();
  const handler = NextAuth(authOptions);
  return handler(request);
}
