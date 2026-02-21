import { NextResponse } from 'next/server';
import { logApi } from '@/lib/server/observability';
import { getPrismaClient, isDatabaseConfigured } from '@/lib/server/prisma';

export async function GET(request: Request) {
  const route = '/api/leaderboard/levels';
  const method = 'GET';

  const { searchParams } = new URL(request.url);
  const level = Number.parseInt(searchParams.get('level') ?? '0', 10);
  if (!Number.isFinite(level) || level < 1) {
    return NextResponse.json({ ok: false, code: 'BAD_REQUEST', error: 'valid level is required' }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    logApi('warn', { route, method, status: 503, code: 'DB_NOT_CONFIGURED' });
    return NextResponse.json({ ok: false, code: 'DB_NOT_CONFIGURED', error: 'Database not configured', level, leaders: [] }, { status: 503 });
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return NextResponse.json({ ok: false, code: 'DB_UNAVAILABLE', error: 'Database client unavailable', level, leaders: [] }, { status: 503 });
  }

  const leaders = await prisma.levelScore.findMany({
    where: { level },
    orderBy: [{ moves: 'asc' }, { score: 'desc' }],
    take: 100,
    include: { user: true }
  });

  logApi('info', { route, method, status: 200, details: { level, count: leaders.length } });
  return NextResponse.json({
    ok: true,
    level,
    leaders: leaders.map((entry, index) => ({ rank: index + 1, name: entry.user.name ?? 'Player', moves: entry.moves, score: entry.score, stars: entry.stars }))
  });
}
