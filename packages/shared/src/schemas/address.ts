import { z } from 'zod';
import { AddressLabel } from '../enums.js';

/**
 * Validation schema for creating/updating a customer address.
 *
 * Notes:
 * - Indian mobile numbers are restricted to the standard 10-digit
 *   format beginning with 6, 7, 8, or 9.
 * - PIN codes are exactly 6 digits.
 * - Optional address fields are normalized to undefined when omitted.
 * - isDefault defaults to false.
 */
export const addressWriteSchema = z.object({
  label: z.nativeEnum(AddressLabel).default(AddressLabel.HOME),

  contactName: z
    .string()
    .trim()
    .min(2, 'Contact name must be at least 2 characters.')
    .max(80, 'Contact name must be at most 80 characters.'),

  contactPhone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.'),

  line1: z
    .string()
    .trim()
    .min(3, 'Address line 1 must be at least 3 characters.')
    .max(160, 'Address line 1 must be at most 160 characters.'),

  line2: z
    .string()
    .trim()
    .max(160, 'Address line 2 must be at most 160 characters.')
    .optional(),

  landmark: z
    .string()
    .trim()
    .max(120, 'Landmark must be at most 120 characters.')
    .optional(),

  city: z
    .string()
    .trim()
    .min(2, 'City must be at least 2 characters.')
    .max(80, 'City must be at most 80 characters.'),

  state: z
    .string()
    .trim()
    .min(2, 'State must be at least 2 characters.')
    .max(80, 'State must be at most 80 characters.'),

  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code.'),

  isDefault: z.boolean().default(false),
});

export type AddressWriteInput = z.infer<typeof addressWriteSchema>;

export const addressIdParamsSchema = z.object({
  addressId: z.string().uuid('Invalid address ID.'),
});

export interface AddressDTO {
  id: string;
  label: AddressLabel;
  contactName: string;
  contactPhone: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}
