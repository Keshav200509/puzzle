import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/server/auth';
import { isDatabaseConfigured, getPrismaClient } from '@/lib/server/prisma';

// GET — list all earned achievement IDs for the current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ earned: [] });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ earned: [] });
  }
  const prisma = getPrismaClient();
  if (!prisma) return NextResponse.json({ earned: [] });

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!user) return NextResponse.json({ earned: [] });

    const rows = await prisma.userAchievement.findMany({
      where: { userId: user.id },
      select: { achievementId: true, earnedAt: true }
    });
    return NextResponse.json({ earned: rows.map((r) => ({ id: r.achievementId, earnedAt: r.earnedAt })) });
  } catch {
    return NextResponse.json({ earned: [] });
  }
}

// POST — unlock one or more achievements
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'DB not configured' }, { status: 503 });
  }
  const prisma = getPrismaClient();
  if (!prisma) return NextResponse.json({ ok: false, error: 'DB unavailable' }, { status: 503 });

  const { ids }: { ids?: string[] } = await request.json().catch(() => ({}));
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ ok: false, error: 'ids required' }, { status: 400 });
  }

  try {
    const user = await prisma.user.upsert({
      where: { email: session.user.email },
      update: { name: session.user.name ?? undefined, image: session.user.image ?? undefined },
      create: { email: session.user.email, name: session.user.name ?? undefined, image: session.user.image ?? undefined }
    });

    // Upsert each — ignore duplicates
    await Promise.all(
      ids.map((achievementId) =>
        prisma.userAchievement.upsert({
          where: { userId_achievementId: { userId: user.id, achievementId } },
          update: {},
          create: { userId: user.id, achievementId }
        })
      )
    );

    return NextResponse.json({ ok: true, unlocked: ids });
  } catch (err) {
    console.error('[achievements POST]', err);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
