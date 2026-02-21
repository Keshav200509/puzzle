import { NextResponse } from 'next/server';
import { isGoogleAuthConfigured, isNextAuthConfigured } from '@/lib/server/auth';

export async function GET() {
  const nextAuthConfigured = isNextAuthConfigured();
  const googleConfigured = isGoogleAuthConfigured();

  return NextResponse.json({
    ok: nextAuthConfigured,
    nextAuthConfigured,
    googleConfigured,
    message: nextAuthConfigured
      ? 'Auth core is configured.'
      : 'NEXTAUTH_URL and NEXTAUTH_SECRET are required for production auth sessions.'
  }, { status: nextAuthConfigured ? 200 : 503 });
}
