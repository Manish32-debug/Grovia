import type { RequestHandler } from 'express';
import { AppError } from '../lib/AppError.js';
import * as service from '../services/intelligence/intelligence.service.js';
export const smartBasket:RequestHandler=async(req,res,next)=>{try{if(!req.user)throw AppError.unauthenticated();res.json({data:await service.smartBasket(req.user.id)});}catch(e){next(e);}};
export const recommendations:RequestHandler=async(req,res,next)=>{try{if(!req.user)throw AppError.unauthenticated();res.json({data:await service.recommendations(req.user.id,(req.query as {productId?:string}).productId)});}catch(e){next(e);}};
export const demand:RequestHandler=async(_req,res,next)=>{try{res.json({data:await service.demandDashboard()});}catch(e){next(e);}};
export const associations:RequestHandler=async(_req,res,next)=>{try{res.json({data:{updated:await service.rebuildAssociations()}});}catch(e){next(e);}};
export const rebuild:RequestHandler=async(_req,res,next)=>{try{res.json({data:{updated:await service.rebuildDemandStats()}});}catch(e){next(e);}};
