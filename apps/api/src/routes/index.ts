import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { categoryRouter, productRouter } from './catalog.routes.js';
import { cartRouter, wishlistRouter } from './cart.routes.js';
import { addressRouter } from './address.routes.js';
import { slotRouter } from './slot.routes.js';
import { couponRouter } from './coupon.routes.js';
import { orderRouter } from './order.routes.js';
import { paymentRouter } from './payment.routes.js';
import { notificationRouter } from './notification.routes.js';
import { reviewRouter } from './review.routes.js';
import { deliveryRouter } from './delivery.routes.js';
import { adminRouter } from './admin.routes.js';
import { intelligenceRouter } from './intelligence.routes.js';

export const apiRouter: Router = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/categories', categoryRouter);
apiRouter.use('/products', productRouter);
apiRouter.use('/cart', cartRouter);
apiRouter.use('/wishlist', wishlistRouter);
apiRouter.use('/addresses', addressRouter);
apiRouter.use('/slots', slotRouter);
apiRouter.use('/coupons', couponRouter);
apiRouter.use('/orders', orderRouter);
apiRouter.use('/payments', paymentRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/reviews', reviewRouter);
apiRouter.use('/delivery', deliveryRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/intelligence', intelligenceRouter);

