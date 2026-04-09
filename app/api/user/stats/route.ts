import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/server/auth';
import { isDatabaseConfigured, getPrismaClient } from '@/lib/server/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      // User authenticated but no DB record yet (hasn't synced)
      return NextResponse.json({
        totalDailySolves: 0,
        totalLevelSolves: 0,
        totalStars: 0,
        bestDailyScore: 0,
        dailyDates: []
      });
    }

    const [dailyScores, levelScores] = await Promise.all([
      prisma.dailyScore.findMany({
        where: { userId: user.id },
        select: { stars: true, score: true, moves: true, date: true }
      }),
      prisma.levelScore.findMany({
        where: { userId: user.id },
        select: { stars: true, score: true, level: true }
      })
    ]);

    const totalDailySolves = dailyScores.length;
    const totalLevelSolves = levelScores.length;
    const totalStars =
      dailyScores.reduce((s, r) => s + (r.stars ?? 0), 0) +
      levelScores.reduce((s, r) => s + (r.stars ?? 0), 0);
    const bestDailyScore = dailyScores.reduce((max, r) => Math.max(max, r.score), 0);
    // Sorted dates for streak calculation on the client
    const dailyDates = dailyScores.map((r) => r.date).sort();

    return NextResponse.json({
      totalDailySolves,
      totalLevelSolves,
      totalStars,
      bestDailyScore,
      dailyDates
    });
  } catch (err) {
    console.error('[user/stats]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
