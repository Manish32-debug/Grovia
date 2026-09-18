import { z } from 'zod';

export const assignmentIdParamsSchema = z.object({
  assignmentId: z.string().uuid('Invalid assignment ID.'),
});

export const deliveryOrderIdParamsSchema = z.object({
  orderId: z.string().uuid('Invalid order ID.'),
});

export const deliveryFailureSchema = z.object({
  note: z.string().trim().min(3).max(300),
});

export interface DeliveryAssignmentDTO {
  id: string;
  orderId: string;
  orderNumber: string;
  status: string;
  customerName: string;
  city: string | null;
  slot: { date: string; startMinute: number; endMinute: number } | null;
  offeredAt: string;
  acceptedAt: string | null;
  pickedUpAt: string | null;
  completedAt: string | null;
}
