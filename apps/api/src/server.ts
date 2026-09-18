import { createApp, API_PREFIX } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma, pingDatabase } from './config/prisma.js';
import * as orderService from './services/order/order.service.js';
import * as intelligenceService from './services/intelligence/intelligence.service.js';

const app = createApp();

const db = await pingDatabase();
if (db.ok) logger.info({ latencyMs: db.latencyMs }, 'postgres reachable');
else logger.warn({ error: db.error }, 'postgres unreachable — /health/ready will report degraded');

void orderService.expireStalePendingOrders().catch((err) => logger.error({ err }, 'initial stale-order maintenance failed'));
void Promise.all([intelligenceService.rebuildDemandStats(), intelligenceService.rebuildAssociations()]).catch((err) => logger.error({ err }, 'initial intelligence maintenance failed'));

const maintenance = setInterval(() => {
  void orderService.expireStalePendingOrders().catch((err) => logger.error({ err }, 'stale-order maintenance failed'));
}, 5 * 60_000);
maintenance.unref();

const dailyIntelligence = setInterval(() => {
  void Promise.all([intelligenceService.rebuildDemandStats(), intelligenceService.rebuildAssociations()]).catch((err) => logger.error({ err }, 'intelligence maintenance failed'));
}, 24 * 60 * 60_000);
dailyIntelligence.unref();

const server = app.listen(env.PORT, () => {
  logger.info(`Grovia API listening on ${env.BACKEND_URL}${API_PREFIX} [${env.NODE_ENV}]`);
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  clearInterval(maintenance);
  clearInterval(dailyIntelligence);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Don't let a hung connection hold the deploy hostage.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
