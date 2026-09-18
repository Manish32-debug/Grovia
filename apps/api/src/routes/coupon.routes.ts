import { Router } from 'express';
import { validateCouponQuerySchema } from '@grovia/shared';
import * as controller from '../controllers/coupon.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

export const couponRouter: Router = Router();
couponRouter.use(authenticate);

couponRouter.get(
  '/preview',
  validate({ query: validateCouponQuerySchema }),
  controller.previewCoupon,
);
