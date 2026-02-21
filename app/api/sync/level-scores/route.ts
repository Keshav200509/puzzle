import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/server/auth';
import { logApi, reportApiError } from '@/lib/server/observability';
import { getPrismaClient, isDatabaseConfigured } from '@/lib/server/prisma';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { isBetterRun, normalizeLevelEntry, type LevelSyncEntry, validateLevelEntry } from '@/lib/server/validation';

type Body = { entries?: LevelSyncEntry[] };

function json(route: string, method: string, status: number, body: Record<string, unknown>, level: 'info' | 'warn' | 'error' = 'info') {
  logApi(level, { route, method, status, code: typeof body.code === 'string' ? body.code : undefined });
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  const route = '/api/sync/level-scores';
  const method = 'POST';

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return json(route, method, 401, { ok: false, code: 'UNAUTHORIZED', error: 'Unauthorized' }, 'warn');
    }

    const ipKey = request.headers.get('x-forwarded-for') ?? 'local';
    const rate = checkRateLimit(`level:${ipKey}`);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, code: 'RATE_LIMITED', error: 'Rate limited' }, { status: 429, headers: { 'Retry-After': `${rate.retryAfter}` } });
    }

    let body: Body = {};
    try {
      body = await request.json();
    } catch {
      return json(route, method, 400, { ok: false, code: 'BAD_JSON', error: 'Invalid JSON body' }, 'warn');
    }

    const entries = body.entries ?? [];
    for (const entry of entries) {
      const reason = validateLevelEntry(entry);
      if (reason) return json(route, method, 400, { ok: false, code: 'BAD_ENTRY', error: reason }, 'warn');
    }

    if (!isDatabaseConfigured()) {
      return json(route, method, 503, { ok: false, code: 'DB_NOT_CONFIGURED', error: 'Database not configured. Set DATABASE_URL to enable sync.' }, 'warn');
    }

    const normalized = entries.map(normalizeLevelEntry);
    const prisma = getPrismaClient();
    if (!prisma) {
      return json(route, method, 503, { ok: false, code: 'DB_UNAVAILABLE', error: 'Database client unavailable.' }, 'warn');
    }

    const user = await prisma.user.upsert({
      where: { email: session.user.email },
      update: { name: session.user.name ?? undefined, image: session.user.image ?? undefined },
      create: { email: session.user.email, name: session.user.name ?? undefined, image: session.user.image ?? undefined }
    });

    await prisma.$transaction(async (tx) => {
      for (const entry of normalized) {
        const existing = await tx.levelScore.findUnique({
          where: { userId_level: { userId: user.id, level: entry.level } }
        });

        if (!existing) {
          await tx.levelScore.create({
            data: {
              userId: user.id,
              level: entry.level,
              moves: entry.moves,
              hintsUsed: entry.hintsUsed,
              score: entry.score,
              stars: entry.stars
            }
          });
          continue;
        }

        if (isBetterRun(entry, existing)) {
          await tx.levelScore.update({
            where: { id: existing.id },
            data: {
              moves: entry.moves,
              hintsUsed: entry.hintsUsed,
              score: entry.score,
              stars: entry.stars
            }
          });
        }
      }
    });

    logApi('info', { route, method, status: 200, user: session.user.email, details: { accepted: normalized.length } });
    return NextResponse.json({ ok: true, accepted: normalized.length });
  } catch (error) {
    reportApiError(route, method, error);
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR', error: 'Unexpected server error' }, { status: 500 });
  }
}
