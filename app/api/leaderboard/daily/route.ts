import { NextResponse } from 'next/server';
import { logApi } from '@/lib/server/observability';
import { getPrismaClient, isDatabaseConfigured } from '@/lib/server/prisma';

export async function GET(request: Request) {
  const route = '/api/leaderboard/daily';
  const method = 'GET';

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) return NextResponse.json({ ok: false, code: 'BAD_REQUEST', error: 'date is required' }, { status: 400 });

  if (!isDatabaseConfigured()) {
    logApi('warn', { route, method, status: 503, code: 'DB_NOT_CONFIGURED' });
    return NextResponse.json({ ok: false, code: 'DB_NOT_CONFIGURED', error: 'Database not configured', date, leaders: [] }, { status: 503 });
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return NextResponse.json({ ok: false, code: 'DB_UNAVAILABLE', error: 'Database client unavailable', date, leaders: [] }, { status: 503 });
  }

  const day = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(day.getTime())) {
    return NextResponse.json({ ok: false, code: 'BAD_REQUEST', error: 'invalid date format', leaders: [] }, { status: 400 });
  }

  const leaders = await prisma.dailyScore.findMany({
    where: { date: day },
    orderBy: [{ moves: 'asc' }, { score: 'desc' }],
    take: 100,
    include: { user: true }
  });

  logApi('info', { route, method, status: 200, details: { date, count: leaders.length } });
  return NextResponse.json({
    ok: true,
    date,
    leaders: leaders.map((entry, index) => ({ rank: index + 1, name: entry.user.name ?? 'Player', moves: entry.moves, score: entry.score, stars: entry.stars }))
  });
}
