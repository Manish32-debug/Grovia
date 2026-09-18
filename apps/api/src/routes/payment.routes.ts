import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { isProd } from '../config/env.js';

export const paymentRouter: Router = Router();

/**
 * The Cashfree webhook itself is NOT mounted here — it needs the raw,
 * unparsed request body for HMAC verification and must be registered in
 * app.ts with express.raw() ahead of express.json(). See app.ts.
 *
 * Everything below runs after express.json(), same as every other route.
 */

const paymentIdParamsSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID.'),
});

// devConfirmMockPayment() is a no-op guard failure in production regardless,
// but routing it out entirely keeps it out of the production route table.
if (!isProd) {
  paymentRouter.post(
    '/:paymentId/dev-confirm',
    authenticate,
    validate({ params: paymentIdParamsSchema }),
    controller.devConfirm,
  );
}
