import type { RequestHandler } from 'express';
import { AppError } from '../lib/AppError.js';
import * as service from '../services/delivery/delivery.service.js';
export const list: RequestHandler = async (req,res,next)=>{try{if(!req.user)throw AppError.unauthenticated();res.json({data:await service.listAssignments(req.user.id)});}catch(e){next(e);}};
export const accept: RequestHandler = async (req,res,next)=>{try{if(!req.user)throw AppError.unauthenticated();res.json({data:await service.accept(req.user.id,(req.params as {assignmentId:string}).assignmentId)});}catch(e){next(e);}};
export const pickup: RequestHandler = async (req,res,next)=>{try{if(!req.user)throw AppError.unauthenticated();res.json({data:await service.pickup(req.user.id,(req.params as {assignmentId:string}).assignmentId)});}catch(e){next(e);}};
export const complete: RequestHandler = async (req,res,next)=>{try{if(!req.user)throw AppError.unauthenticated();res.json({data:await service.complete(req.user.id,(req.params as {assignmentId:string}).assignmentId)});}catch(e){next(e);}};
export const fail: RequestHandler = async (req,res,next)=>{try{if(!req.user)throw AppError.unauthenticated();res.json({data:await service.fail(req.user.id,(req.params as {assignmentId:string}).assignmentId,(req.body as {note:string}).note)});}catch(e){next(e);}};
