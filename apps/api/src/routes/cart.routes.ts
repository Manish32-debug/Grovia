import { Router } from 'express';
import {
  cartAddItemSchema,
  cartUpdateItemSchema,
  productIdParamsSchema,
} from '@grovia/shared';
import * as controller from '../controllers/cart.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

export const cartRouter: Router = Router();
cartRouter.use(authenticate);

cartRouter.get('/', controller.getCart);
cartRouter.post('/items', validate({ body: cartAddItemSchema }), controller.addItem);
cartRouter.patch(
  '/items/:productId',
  validate({ params: productIdParamsSchema, body: cartUpdateItemSchema }),
  controller.updateItem,
);
cartRouter.delete(
  '/items/:productId',
  validate({ params: productIdParamsSchema }),
  controller.removeItem,
);
cartRouter.delete('/', controller.clearCart);

export const wishlistRouter: Router = Router();
wishlistRouter.use(authenticate);

wishlistRouter.get('/', controller.listWishlist);
wishlistRouter.post(
  '/:productId',
  validate({ params: productIdParamsSchema }),
  controller.addToWishlist,
);
wishlistRouter.delete(
  '/:productId',
  validate({ params: productIdParamsSchema }),
  controller.removeFromWishlist,
);
