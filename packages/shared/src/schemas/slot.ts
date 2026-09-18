import { z } from 'zod';

/**
 * Query parameters for listing delivery slots.
 *
 * date uses the ISO calendar format YYYY-MM-DD.
 * If omitted, the service resolves today's date server-side.
 */
export const slotListQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.')
    .optional(),
});

/**
 * Route parameter validation for a specific slot instance.
 */
export const slotIdParamsSchema = z.object({
  slotInstanceId: z.string().uuid('Invalid slot instance ID.'),
});

export interface SlotDTO {
  id: string;
  date: string;
  startMinute: number;
  endMinute: number;
  capacity: number;
  booked: number;
  available: number;

  /** False once the cutoff for this slot has passed for the given date. */
  bookable: boolean;
}
