import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/server/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function isBuildPhase() {
  // `NEXT_PHASE` is set in many local/build contexts, but Vercel build can miss it.
  // During Vercel build, CI=true and VERCEL=1 are present.
  return process.env.NEXT_PHASE === 'phase-production-build' || (process.env.CI === 'true' && process.env.VERCEL === '1');
}

export async function GET() {
  if (isBuildPhase()) {
    return NextResponse.json(
      { ok: false, configured: false, connected: false, message: 'Build phase: database checks skipped.' },
      { status: 503 }
    );
  }

  try {
    const status = await checkDatabaseHealth();
    const code = status.configured && status.connected ? 200 : 503;
    return NextResponse.json({ ok: status.connected, ...status }, { status: code });
  } catch {
    // Never throw from health route; callers need a JSON status, not a crashed build/runtime.
    return NextResponse.json(
      { ok: false, configured: true, connected: false, message: 'Database health probe failed unexpectedly.' },
      { status: 503 }
    );
  }
}
