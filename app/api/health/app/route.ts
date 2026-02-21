import { NextResponse } from 'next/server';

const startedAt = Date.now();

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'logic-looper',
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    timestamp: new Date().toISOString()
  });
}
