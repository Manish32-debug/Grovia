import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

export const notificationRouter: Router = Router();
notificationRouter.use(authenticate);

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(1000).optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
});

const notificationIdParamsSchema = z.object({
  notificationId: z.string().uuid('Invalid notification ID.'),
});

notificationRouter.get(
  '/',
  validate({ query: listQuerySchema }),
  controller.listNotifications,
);
notificationRouter.post(
  '/:notificationId/read',
  validate({ params: notificationIdParamsSchema }),
  controller.markRead,
);
notificationRouter.post('/read-all', controller.markAllRead);
