import type { RequestHandler } from 'express';
import { AppError } from '../lib/AppError.js';
import * as notificationService from '../services/notification/notification.service.js';

export const listNotifications: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();
    const { page, limit } = req.query as unknown as {
      page: number;
      limit: number;
    };
    res.json({
      data: await notificationService.listNotifications(
        req.user.id,
        page,
        limit,
      ),
    });
  } catch (err) {
    next(err);
  }
};

export const markRead: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();
    const { notificationId } = req.params as { notificationId: string };
    await notificationService.markRead(req.user.id, notificationId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const markAllRead: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();
    await notificationService.markAllRead(req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
