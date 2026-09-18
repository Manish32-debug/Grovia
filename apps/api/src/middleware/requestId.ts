import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

/** Correlates logs, error envelopes and client bug reports. */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-request-id');
  const id = incoming && incoming.length <= 64 ? incoming : randomUUID();
  req.id = id;
  res.setHeader('x-request-id', id);
  next();
};
