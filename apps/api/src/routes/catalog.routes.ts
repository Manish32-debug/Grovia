import { Router } from 'express';
import {
  productListQuerySchema,
  productSlugParamsSchema,
  searchSuggestQuerySchema,
} from '@grovia/shared';
import * as controller from '../controllers/catalog.controller.js';
import { validate } from '../middleware/validate.js';

export const categoryRouter: Router = Router();
categoryRouter.get('/', controller.listCategories);

export const productRouter: Router = Router();
productRouter.get('/', validate({ query: productListQuerySchema }), controller.listProducts);
productRouter.get(
  '/suggest',
  validate({ query: searchSuggestQuerySchema }),
  controller.suggest,
);
productRouter.get(
  '/:slug',
  validate({ params: productSlugParamsSchema }),
  controller.getProduct,
);
