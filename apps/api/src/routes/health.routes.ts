import { Router } from 'express';
import { pingDatabase } from '../config/prisma.js';
import { env } from '../config/env.js';

export const healthRouter: Router = Router();

/** Liveness: is the process up? Used by the platform to decide on restarts. */
healthRouter.get('/live', (_req, res) => {
  res.json({ data: { status: 'ok', uptimeSeconds: Math.round(process.uptime()) } });
});

/** Readiness: can we actually serve traffic? Used to gate deploys and LB rotation. */
healthRouter.get('/ready', async (_req, res) => {
  const db = await pingDatabase();
  const ready = db.ok;
  res.status(ready ? 200 : 503).json({
    data: {
      status: ready ? 'ready' : 'degraded',
      env: env.NODE_ENV,
      checks: { database: db },
    },
  });
});
