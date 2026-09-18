import { Router } from 'express';
import { slotListQuerySchema } from '@grovia/shared';
import * as controller from '../controllers/slot.controller.js';
import { validate } from '../middleware/validate.js';

export const slotRouter: Router = Router();

slotRouter.get('/', validate({ query: slotListQuerySchema }), controller.listSlots);
