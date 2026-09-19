import type { AddressDTO, AddressWriteInput } from '@grovia/shared';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../lib/AppError.js';

type AddressRecord = {
  id: string;
  label: string;
  contactName: string;
  contactPhone: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

function toDTO(a: AddressRecord): AddressDTO {
  return {
    id: a.id,
    label: a.label as AddressDTO['label'],
    contactName: a.contactName,
    contactPhone: a.contactPhone,
    line1: a.line1,
    line2: a.line2,
    landmark: a.landmark,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    isDefault: a.isDefault,
  };
}

export async function listAddresses(userId: string): Promise<AddressDTO[]> {
  const rows = await prisma.address.findMany({
    where: { userId, deletedAt: null },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  return rows.map(toDTO);
}

/**
 * Used by the order service to freeze an address snapshot at checkout time.
 *
 * Deliberately returns NOT_FOUND for another user's address as well, avoiding
 * an existence oracle for address IDs.
 */
export async function getAddressOrThrow(
  userId: string,
  addressId: string,
) {
  const address = await prisma.address.findFirst({
    where: {
      id: addressId,
      userId,
      deletedAt: null,
    },
  });

  if (!address) {
    throw AppError.notFound('Address not found.');
  }

  return address;
}

export async function createAddress(
  userId: string,
  input: AddressWriteInput,
): Promise<AddressDTO> {
  const address = await prisma.$transaction(async (tx) => {
    /*
     * If this is explicitly the default address, clear the existing default
     * first. The first active address is also promoted to default.
     */
    if (input.isDefault) {
      await tx.address.updateMany({
        where: {
          userId,
          isDefault: true,
          deletedAt: null,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const existingCount = await tx.address.count({
      where: {
        userId,
        deletedAt: null,
      },
    });

    const { isDefault, ...addressFields } = input;

    return tx.address.create({
      data: {
        ...addressFields,
        isDefault: isDefault || existingCount === 0,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  });

  return toDTO(address);
}

export async function updateAddress(
  userId: string,
  addressId: string,
  input: AddressWriteInput,
): Promise<AddressDTO> {
  const existing = await getAddressOrThrow(userId, addressId);

  const address = await prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      // There must be at most one active default for this user.
      await tx.address.updateMany({
        where: {
          userId,
          isDefault: true,
          deletedAt: null,
          NOT: {
            id: addressId,
          },
        },
        data: {
          isDefault: false,
        },
      });
    } else if (existing.isDefault) {
      /*
       * Never allow an update to leave the user with zero default addresses.
       * To change the default, the caller should mark another address as
       * default; that transaction clears this one atomically.
       */
      input = {
        ...input,
        isDefault: true,
      };
    }

    return tx.address.update({
      where: {
        id: addressId,
      },
      data: input,
    });
  });

  return toDTO(address);
}

export async function deleteAddress(
  userId: string,
  addressId: string,
): Promise<void> {
  const address = await getAddressOrThrow(userId, addressId);

  await prisma.$transaction(async (tx) => {
    await tx.address.update({
      where: {
        id: addressId,
      },
      data: {
        deletedAt: new Date(),
        isDefault: false,
      },
    });

    /*
     * If the deleted address was the default, promote the most recently
     * created remaining active address.
     */
    if (address.isDefault) {
      const next = await tx.address.findFirst({
        where: {
          userId,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (next) {
        await tx.address.update({
          where: {
            id: next.id,
          },
          data: {
            isDefault: true,
          },
        });
      }
    }
  });
}