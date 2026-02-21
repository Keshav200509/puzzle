import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPrismaClient() {
  if (!isDatabaseConfigured()) return null;
  if (!global.__prisma) {
    global.__prisma = new PrismaClient();
  }
  return global.__prisma;
}

export async function checkDatabaseHealth() {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      connected: false,
      message: 'DATABASE_URL is not configured.'
    };
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return {
      configured: true,
      connected: false,
      message: 'Prisma client unavailable.'
    };
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      configured: true,
      connected: true,
      message: 'Database reachable.'
    };
  } catch {
    return {
      configured: true,
      connected: false,
      message: 'Database connection failed.'
    };
  }
}
