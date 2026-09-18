import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

type Schemas = { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny };

/**
 * Parses and REPLACES req.body/query/params with the parsed output, so
 * downstream code can never read an unvalidated field by accident.
 */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) Object.defineProperty(req, 'query', { value: schemas.query.parse(req.query) });
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
