import type { Request, RequestHandler, Response } from 'express';
import type { AuthSession } from '@grovia/shared';
import { env } from '../config/env.js';
import { AppError } from '../lib/AppError.js';
import { REFRESH_COOKIE, clearRefreshCookie, setRefreshCookie } from '../lib/cookies.js';
import * as authService from '../services/auth/auth.service.js';

const sessionContext = (req: Request) => ({ userAgent: req.header('user-agent'), ip: req.ip });

function sendSession(
  res: Response,
  result: { session: AuthSession; refreshToken: string },
  status = 200,
): void {
  setRefreshCookie(res, result.refreshToken, env.REFRESH_TOKEN_TTL_DAYS);
  res.status(status).json({ data: result.session });
}

export const register: RequestHandler = async (req, res, next) => {
  try {
    sendSession(res, await authService.register(req.body, sessionContext(req)), 201);
  } catch (err) {
    next(err);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    sendSession(res, await authService.login(req.body, sessionContext(req)));
  } catch (err) {
    next(err);
  }
};

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    const presented: unknown = req.cookies?.[REFRESH_COOKIE];
    sendSession(
      res,
      await authService.refresh(
        typeof presented === 'string' ? presented : undefined,
        sessionContext(req),
      ),
    );
  } catch (err) {
    // The cookie is useless now; clearing it stops the client retrying forever.
    clearRefreshCookie(res);
    next(err);
  }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    const presented: unknown = req.cookies?.[REFRESH_COOKIE];
    await authService.logout(typeof presented === 'string' ? presented : undefined);
    clearRefreshCookie(res);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const me: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();
    res.json({ data: await authService.currentUser(req.user.id) });
  } catch (err) {
    next(err);
  }
};

export const verifyEmail: RequestHandler = async (req, res, next) => {
  try {
    res.json({ data: await authService.verifyEmail(req.body.token) });
  } catch (err) {
    next(err);
  }
};

export const resendVerification: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();
    await authService.resendVerification(req.user.id);
    res.status(202).json({ data: { sent: true } });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword: RequestHandler = async (req, res, next) => {
  try {
    await authService.forgotPassword(req.body.email);
    // Always the same response: existence of an account is not disclosed here.
    res.status(202).json({
      data: { message: 'If that email has a Grovia account, a reset link is on its way.' },
    });
  } catch (err) {
    next(err);
  }
};

export const resetPassword: RequestHandler = async (req, res, next) => {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    clearRefreshCookie(res);
    res.json({ data: { message: 'Password updated. Sign in with your new password.' } });
  } catch (err) {
    next(err);
  }
};

export const changePassword: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();
    await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    clearRefreshCookie(res);
    res.json({ data: { message: 'Password changed. Sign in again on your other devices.' } });
  } catch (err) {
    next(err);
  }
};
