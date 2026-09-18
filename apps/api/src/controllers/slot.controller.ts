import type { RequestHandler } from 'express';
import * as slotService from '../services/slot/slot.service.js';

/** Public — browsing delivery slots for a date does not require auth. */
export const listSlots: RequestHandler = async (req, res, next) => {
  try {
    const { date } = req.query as { date?: string };
    res.json({ data: await slotService.listSlots(date) });
  } catch (err) {
    next(err);
  }
};
