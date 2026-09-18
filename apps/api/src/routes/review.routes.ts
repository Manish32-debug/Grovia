import { Router } from 'express';
import { Role, reviewIdParamsSchema, reviewListQuerySchema, reviewModerationSchema, reviewWriteSchema } from '@grovia/shared';
import * as controller from '../controllers/review.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';

export const reviewRouter: Router = Router();
reviewRouter.get('/', validate({ query: reviewListQuerySchema }), controller.list);
reviewRouter.use(authenticate);
reviewRouter.post('/', validate({ body: reviewWriteSchema }), controller.create);
reviewRouter.get('/admin', authorize(Role.ADMIN), validate({ query: reviewListQuerySchema }), controller.adminList);
reviewRouter.patch('/:reviewId', authorize(Role.ADMIN), validate({ params: reviewIdParamsSchema, body: reviewModerationSchema }), controller.moderate);
