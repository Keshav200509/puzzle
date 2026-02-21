import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/server/prisma';

export async function GET() {
  const status = await checkDatabaseHealth();
  const code = status.configured && status.connected ? 200 : 503;
  return NextResponse.json({ ok: status.connected, ...status }, { status: code });
}
