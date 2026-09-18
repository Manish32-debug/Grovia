import { PrismaClient } from '@prisma/client';
import { isProd, isTest } from './env.js';
import { logger } from './logger.js';

/**
 * One client per process. `globalThis` caching keeps tsx watch-mode reloads
 * from opening a new connection pool on every file save.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd || isTest ? ['error'] : ['warn', 'error'],
  });

if (!isProd) globalForPrisma.prisma = prisma;

export async function pingDatabase(): Promise<
  { ok: true; latencyMs: number } | { ok: false; error: string }
> {
  const started = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Math.round(performance.now() - started) };
  } catch (err) {
    const message = err instanceof Error ? err.message.split('\n')[0] ?? 'unknown' : 'unknown error';
    logger.debug({ err }, 'database ping failed');
    return { ok: false, error: message };
  }
}
