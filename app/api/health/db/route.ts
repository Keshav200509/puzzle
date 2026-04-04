import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/server/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET() {
  const status = await checkDatabaseHealth();
  const code = status.configured && status.connected ? 200 : 503;
  return NextResponse.json({ ok: status.connected, ...status }, { status: code });
}
