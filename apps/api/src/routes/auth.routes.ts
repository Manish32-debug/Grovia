import { Router } from 'express';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@grovia/shared';
import * as controller from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireSameSiteRequest } from '../middleware/requireSameSiteRequest.js';
import { emailActionLimiter, loginLimiter, registerLimiter } from '../middleware/rateLimit.js';

export const authRouter: Router = Router();

// Every route here either sets or consumes the refresh cookie, so all of them
// require the same-site header.
authRouter.use(requireSameSiteRequest);

authRouter.post('/register', registerLimiter, validate({ body: registerSchema }), controller.register);
authRouter.post('/login', loginLimiter, validate({ body: loginSchema }), controller.login);
authRouter.post('/refresh', controller.refresh);
authRouter.post('/logout', controller.logout);

authRouter.post('/verify-email', validate({ body: verifyEmailSchema }), controller.verifyEmail);
authRouter.post('/resend-verification', authenticate, emailActionLimiter, controller.resendVerification);

authRouter.post(
  '/forgot-password',
  emailActionLimiter,
  validate({ body: forgotPasswordSchema }),
  controller.forgotPassword,
);
authRouter.post(
  '/reset-password',
  emailActionLimiter,
  validate({ body: resetPasswordSchema }),
  controller.resetPassword,
);
authRouter.patch(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  controller.changePassword,
);

authRouter.get('/me', authenticate, controller.me);
