import { Router } from 'express';
import {
  cancelOrderSchema,
  checkoutSchema,
  orderIdParamsSchema,
  orderListQuerySchema,
  Role,
  transitionOrderSchema,
} from '@grovia/shared';
import * as controller from '../controllers/order.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  checkoutLimiter,
  paymentPollLimiter,
} from '../middleware/rateLimit.js';

export const orderRouter: Router = Router();

orderRouter.use(authenticate);

orderRouter.post(
  '/checkout',
  checkoutLimiter,
  validate({ body: checkoutSchema }),
  controller.checkout,
);

orderRouter.get(
  '/',
  validate({ query: orderListQuerySchema }),
  controller.listOrders,
);

orderRouter.get(
  '/:orderId',
  validate({ params: orderIdParamsSchema }),
  controller.getOrder,
);

orderRouter.get(
  '/:orderId/payment-status',
  paymentPollLimiter,
  validate({ params: orderIdParamsSchema }),
  controller.paymentStatus,
);

orderRouter.post(
  '/:orderId/cancel',
  validate({
    params: orderIdParamsSchema,
    body: cancelOrderSchema,
  }),
  controller.cancelOrder,
);

orderRouter.post(
  '/:orderId/reorder',
  validate({ params: orderIdParamsSchema }),
  controller.reorder,
);

orderRouter.patch(
  '/:orderId/status',
  authorize(Role.ADMIN, Role.DELIVERY_PARTNER),
  validate({
    params: orderIdParamsSchema,
    body: transitionOrderSchema,
  }),
  controller.transitionOrder,
);
