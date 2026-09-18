import { Router } from 'express';
import { addressWriteSchema, addressIdParamsSchema } from '@grovia/shared';
import * as controller from '../controllers/address.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

export const addressRouter: Router = Router();
addressRouter.use(authenticate);

addressRouter.get('/', controller.listAddresses);
addressRouter.post('/', validate({ body: addressWriteSchema }), controller.createAddress);
addressRouter.put(
  '/:addressId',
  validate({ params: addressIdParamsSchema, body: addressWriteSchema }),
  controller.updateAddress,
);
addressRouter.delete(
  '/:addressId',
  validate({ params: addressIdParamsSchema }),
  controller.deleteAddress,
);
