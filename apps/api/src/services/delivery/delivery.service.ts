import type { Prisma } from '@prisma/client';
import { AssignmentStatus, OrderStatus, Role } from '@grovia/shared';
import type { DeliveryAssignmentDTO } from '@grovia/shared';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../lib/AppError.js';
import { assertTransitionAllowed } from '../order/order-transition.service.js';
import { notify } from '../notification/notification.service.js';
import { recordDeliveredPurchase } from '../intelligence/intelligence.service.js';

const include = { order: { include: { user: true, items: true } }, partner: true } satisfies Prisma.DeliveryAssignmentInclude;
type Assignment = Prisma.DeliveryAssignmentGetPayload<{ include: typeof include }>;

function dto(a: Assignment): DeliveryAssignmentDTO {
  const snap = a.order.slotSnapshot as { date: string; startMinute: number; endMinute: number } | null;
  const address = a.order.addressSnapshot as { city?: string };
  return { id: a.id, orderId: a.orderId, orderNumber: a.order.orderNumber, status: a.status, customerName: a.order.user.name, city: address.city ?? null, slot: snap, offeredAt: a.offeredAt.toISOString(), acceptedAt: a.acceptedAt?.toISOString() ?? null, pickedUpAt: a.pickedUpAt?.toISOString() ?? null, completedAt: a.completedAt?.toISOString() ?? null };
}

async function partnerForUser(userId: string) {
  const partner = await prisma.deliveryPartner.findUnique({ where: { userId } });
  if (!partner) throw AppError.notFound('Delivery partner profile not found.');
  return partner;
}

export async function listAssignments(userId: string) {
  const partner = await partnerForUser(userId);
  const rows = await prisma.deliveryAssignment.findMany({ where: { partnerId: partner.id }, include, orderBy: { offeredAt: 'desc' } });
  return rows.map(dto);
}

export async function accept(userId: string, assignmentId: string) {
  const partner = await partnerForUser(userId);
  const assignment = await prisma.deliveryAssignment.findFirst({ where: { id: assignmentId, partnerId: partner.id }, include });
  if (!assignment) throw AppError.notFound('Delivery assignment not found.');
  if (assignment.status !== AssignmentStatus.OFFERED) throw AppError.conflict('CONFLICT', 'This assignment is no longer available.');
  const updated = await prisma.deliveryAssignment.update({ where: { id: assignmentId }, data: { status: AssignmentStatus.ACCEPTED, acceptedAt: new Date() }, include });
  return dto(updated);
}

export async function pickup(userId: string, assignmentId: string) {
  const partner = await partnerForUser(userId);
  return prisma.$transaction(async (tx) => {
    const a = await tx.deliveryAssignment.findFirst({ where: { id: assignmentId, partnerId: partner.id }, include });
    if (!a) throw AppError.notFound('Delivery assignment not found.');
    if (a.status !== AssignmentStatus.ACCEPTED) throw AppError.conflict('CONFLICT', 'Accept the assignment before pickup.');
    assertTransitionAllowed(a.order.status as OrderStatus, OrderStatus.OUT_FOR_DELIVERY, Role.DELIVERY_PARTNER);
    await tx.deliveryAssignment.update({ where: { id: a.id }, data: { status: AssignmentStatus.PICKED_UP, pickedUpAt: new Date() } });
    await tx.order.update({ where: { id: a.orderId }, data: { status: OrderStatus.OUT_FOR_DELIVERY } });
    await tx.orderStatusHistory.create({ data: { orderId: a.orderId, fromStatus: a.order.status, toStatus: OrderStatus.OUT_FOR_DELIVERY, actorId: partner.userId, actorRole: Role.DELIVERY_PARTNER } });
    await notify(tx, a.order.userId, 'ORDER_OUT_FOR_DELIVERY', a.orderId, { orderNumber: a.order.orderNumber });
    return dto(await tx.deliveryAssignment.findUniqueOrThrow({ where: { id: a.id }, include }));
  });
}

export async function complete(userId: string, assignmentId: string) {
  const partner = await partnerForUser(userId);
  return prisma.$transaction(async (tx) => {
    const a = await tx.deliveryAssignment.findFirst({ where: { id: assignmentId, partnerId: partner.id }, include });
    if (!a) throw AppError.notFound('Delivery assignment not found.');
    if (a.status !== AssignmentStatus.PICKED_UP) throw AppError.conflict('CONFLICT', 'Order must be picked up first.');
    assertTransitionAllowed(a.order.status as OrderStatus, OrderStatus.DELIVERED, Role.DELIVERY_PARTNER);
    await tx.deliveryAssignment.update({ where: { id: a.id }, data: { status: AssignmentStatus.COMPLETED, completedAt: new Date() } });
    await tx.order.update({ where: { id: a.orderId }, data: { status: OrderStatus.DELIVERED, deliveredAt: new Date() } });
    await tx.orderStatusHistory.create({ data: { orderId: a.orderId, fromStatus: a.order.status, toStatus: OrderStatus.DELIVERED, actorId: partner.userId, actorRole: Role.DELIVERY_PARTNER } });
    await recordDeliveredPurchase(tx, a.order.userId, a.order.items, new Date());
    await notify(tx, a.order.userId, 'ORDER_DELIVERED', a.orderId, { orderNumber: a.order.orderNumber });
    return dto(await tx.deliveryAssignment.findUniqueOrThrow({ where: { id: a.id }, include }));
  });
}

export async function fail(userId: string, assignmentId: string, note: string) {
  const partner = await partnerForUser(userId);
  return prisma.$transaction(async (tx) => {
    const a = await tx.deliveryAssignment.findFirst({ where: { id: assignmentId, partnerId: partner.id }, include });
    if (!a) throw AppError.notFound('Delivery assignment not found.');
    if (a.status !== AssignmentStatus.PICKED_UP) throw AppError.conflict('CONFLICT', 'Only picked-up orders can be marked as delivery failed.');
    assertTransitionAllowed(a.order.status as OrderStatus, OrderStatus.DELIVERY_FAILED, Role.DELIVERY_PARTNER);
    await tx.order.update({ where: { id: a.orderId }, data: { status: OrderStatus.DELIVERY_FAILED } });
    await tx.orderStatusHistory.create({ data: { orderId: a.orderId, fromStatus: a.order.status, toStatus: OrderStatus.DELIVERY_FAILED, actorId: partner.userId, actorRole: Role.DELIVERY_PARTNER, note } });
    return dto(a);
  });
}
