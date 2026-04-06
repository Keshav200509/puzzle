import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions, isNextAuthConfigured } from '@/lib/server/auth';

function notConfigured(request: Request) {
  const { pathname } = new URL(request.url);

  // next-auth client polls these endpoints; keep app usable when auth env is absent.
  if (pathname.endsWith('/session')) {
    return NextResponse.json(null, { status: 200 });
  }

  if (pathname.endsWith('/_log')) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'AUTH_NOT_CONFIGURED' }, { status: 200 });
  }

  return NextResponse.json(
    { ok: false, code: 'AUTH_NOT_CONFIGURED', error: 'NEXTAUTH_URL and NEXTAUTH_SECRET are required.' },
    { status: 503 }
  );
}

function authFailureFallback(request: Request) {
  const { pathname } = new URL(request.url);
  if (pathname.endsWith('/session')) return NextResponse.json(null, { status: 200 });
  if (pathname.endsWith('/_log')) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'AUTH_RUNTIME_ERROR' }, { status: 200 });
  }

  return NextResponse.json(
    { ok: false, code: 'AUTH_RUNTIME_ERROR', error: 'Auth route failed. Check server env and logs.' },
    { status: 503 }
  );
}

async function runHandler(request: Request) {
  try {
    const handler = NextAuth(authOptions);
    return await handler(request);
  } catch {
    return authFailureFallback(request);
  }
}

export async function GET(request: Request) {
  if (!isNextAuthConfigured()) return notConfigured(request);
  return runHandler(request);

export async function GET(request: Request) {
  if (!isNextAuthConfigured()) return notConfigured(request);
  const handler = NextAuth(authOptions);
  return handler(request);
}

export async function POST(request: Request) {
  if (!isNextAuthConfigured()) return notConfigured(request);
  return runHandler(request);

  const handler = NextAuth(authOptions);
  return handler(request);
}
