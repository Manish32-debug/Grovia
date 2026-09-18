import type { SlotDTO } from '@grovia/shared';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../lib/AppError.js';

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseDateOnly(dateStr: string): Date {
  // The schema guarantees YYYY-MM-DD; strict calendar validation here prevents
  // JavaScript from silently normalizing invalid dates such as 2026-02-31.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);

  if (!match) {
    throw AppError.badRequest('Invalid date.');
  }

  const [, year, month, day] = match;

  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );

  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    throw AppError.badRequest('Invalid calendar date.');
  }

  return date;
}

function minutesNow(now: Date): number {
  return now.getUTCHours() * 60 + now.getUTCMinutes();
}

function isBookable(
  slotDate: Date,
  startMinute: number,
  cutoffMinutes: number,
  now: Date,
): boolean {
  const today = dateOnly(now);
  const day = dateOnly(slotDate);

  if (day < today) return false;
  if (day > today) return true;

  return minutesNow(now) < startMinute - cutoffMinutes;
}

/**
 * Lists slot instances for a requested date.
 *
 * Active slot instances are generated lazily from active templates so the
 * storefront never depends on a separate cron job to create the day's slots.
 */
export async function listSlots(dateStr?: string): Promise<SlotDTO[]> {
  const now = new Date();

  const date = dateStr
    ? parseDateOnly(dateStr)
    : parseDateOnly(dateOnly(now));

  const templates = await prisma.slotTemplate.findMany({
    where: { isActive: true },
  });

  /*
   * upsert makes lazy generation safe when multiple storefront requests arrive
   * for the same date at the same time.
   */
  await Promise.all(
    templates.map((template) =>
      prisma.slotInstance.upsert({
        where: {
          templateId_date: {
            templateId: template.id,
            date,
          },
        },
        create: {
          templateId: template.id,
          date,
          capacity: template.capacity,
        },
        update: {},
      }),
    ),
  );

  const instances = await prisma.slotInstance.findMany({
    where: {
      date,
      isActive: true,
      template: { isActive: true },
    },
    include: { template: true },
    orderBy: { template: { startMinute: 'asc' } },
  });

  return instances.map((instance) => {
    const available = Math.max(
      instance.capacity - instance.booked,
      0,
    );

    const bookable =
      available > 0 &&
      isBookable(
        instance.date,
        instance.template.startMinute,
        instance.template.cutoffMinutes,
        now,
      );

    return {
      id: instance.id,
      date: dateOnly(instance.date),
      startMinute: instance.template.startMinute,
      endMinute: instance.template.endMinute,
      capacity: instance.capacity,
      booked: instance.booked,
      available,
      bookable,
    };
  });
}

/**
 * Used by the order service to freeze the slot snapshot and re-check cutoff.
 *
 * The order transaction must still atomically reserve capacity because a slot
 * can fill between this read and checkout.
 */
export async function getSlotOrThrow(slotInstanceId: string) {
  const slot = await prisma.slotInstance.findUnique({
    where: { id: slotInstanceId },
    include: { template: true },
  });

  if (!slot || !slot.isActive || !slot.template.isActive) {
    throw AppError.notFound('Delivery slot not found.');
  }

  return slot;
}