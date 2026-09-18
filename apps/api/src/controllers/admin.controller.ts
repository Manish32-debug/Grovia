import type { RequestHandler } from 'express';
import { AppError } from '../lib/AppError.js';
import * as service from '../services/admin/admin.service.js';
export const dashboard:RequestHandler=async(_req,res,next)=>{try{res.json({data:await service.dashboard()});}catch(e){next(e);}};
export const products:RequestHandler=async(req,res,next)=>{try{const q=req.query as unknown as {page?:number;limit?:number};res.json({data:await service.listProducts(q.page,q.limit)});}catch(e){next(e);}};
export const createProduct:RequestHandler=async(req,res,next)=>{try{res.status(201).json({data:await service.createProduct(req.body)});}catch(e){next(e);}};
export const updateProduct:RequestHandler=async(req,res,next)=>{try{res.json({data:await service.updateProduct((req.params as {productId:string}).productId,req.body)});}catch(e){next(e);}};
export const deleteProduct:RequestHandler=async(req,res,next)=>{try{await service.deleteProduct((req.params as {productId:string}).productId);res.status(204).send();}catch(e){next(e);}};
export const inventory:RequestHandler=async(req,res,next)=>{try{if(!req.user)throw AppError.unauthenticated();const p=(req.params as {productId:string}).productId;const b=req.body as {delta:number;note?:string};res.json({data:await service.adjustInventory(p,b.delta,req.user.id,b.note)});}catch(e){next(e);}};
export const orders:RequestHandler=async(req,res,next)=>{try{const q=req.query as unknown as {page?:number;limit?:number;status?:string};res.json({data:await service.listOrders(q.page,q.limit,q.status)});}catch(e){next(e);}};
export const categories:RequestHandler=async(_req,res,next)=>{try{res.json({data:await service.listCategories()});}catch(e){next(e);}};
export const createCategory:RequestHandler=async(req,res,next)=>{try{res.status(201).json({data:await service.createCategory(req.body)});}catch(e){next(e);}};
export const updateCategory:RequestHandler=async(req,res,next)=>{try{res.json({data:await service.updateCategory((req.params as {categoryId:string}).categoryId,req.body)});}catch(e){next(e);}};

export const partners:RequestHandler=async(_req,res,next)=>{try{res.json({data:await service.listDeliveryPartners()});}catch(e){next(e);}};
export const assignDelivery:RequestHandler=async(req,res,next)=>{try{const b=req.body as {orderId:string;partnerId:string};res.status(201).json({data:await service.assignDelivery(b.orderId,b.partnerId)});}catch(e){next(e);}};
