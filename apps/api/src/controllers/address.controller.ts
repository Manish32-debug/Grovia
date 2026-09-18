import type { RequestHandler } from 'express';
import type { AddressWriteInput } from '@grovia/shared';
import { AppError } from '../lib/AppError.js';
import * as addressService from '../services/address/address.service.js';

export const listAddresses: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();
    res.json({ data: await addressService.listAddresses(req.user.id) });
  } catch (err) {
    next(err);
  }
};

export const createAddress: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();
    res.status(201).json({
      data: await addressService.createAddress(
        req.user.id,
        req.body as AddressWriteInput,
      ),
    });
  } catch (err) {
    next(err);
  }
};

export const updateAddress: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();
    const { addressId } = req.params as { addressId: string };
    res.json({
      data: await addressService.updateAddress(
        req.user.id,
        addressId,
        req.body as AddressWriteInput,
      ),
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAddress: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();
    const { addressId } = req.params as { addressId: string };
    await addressService.deleteAddress(req.user.id, addressId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
