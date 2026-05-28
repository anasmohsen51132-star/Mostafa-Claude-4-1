import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '@/middleware/auth';
import { adminService } from './admin.service';
import { auditService } from './audit.service';
import { couponService } from '@/modules/coupons/coupons.service';
import { accessCodesService } from '@/modules/access-codes/access-codes.service';
import { usersService } from '@/modules/users/users.service';
import { validate } from '@/middleware/validate';
import { z } from 'zod';

export const adminRouter = Router();
adminRouter.use(authenticate, requireAdmin);

// Dashboard
adminRouter.get('/stats', async (_req: Request, res: Response) => {
  const stats = await adminService.getDashboardStats();
  res.json({ success: true, data: stats });
});

adminRouter.get('/activity', async (_req: Request, res: Response) => {
  const activity = await adminService.getRecentActivity();
  res.json({ success: true, data: activity });
});

adminRouter.get('/revenue-chart', async (req: Request, res: Response) => {
  const data = await adminService.getRevenueChart(Number(req.query.days) || 30);
  res.json({ success: true, data });
});

// Payments management
adminRouter.get('/payments', async (req: Request, res: Response) => {
  const result = await adminService.getPayments({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    status: req.query.status as string,
    provider: req.query.provider as string,
    search: req.query.search as string,
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
  });
  res.json({ success: true, data: result });
});

adminRouter.post('/payments/:id/refund', validate(z.object({
  body: z.object({ amount: z.number().positive(), reason: z.string().min(5) }),
})), async (req: Request, res: Response) => {
  const refund = await adminService.processRefund(req.params.id, req.body.amount, req.body.reason, req.user!.id);
  res.json({ success: true, data: refund });
});

// Webhook events
adminRouter.get('/webhook-events', async (req: Request, res: Response) => {
  const result = await adminService.getWebhookEvents({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    provider: req.query.provider as string,
    status: req.query.status as string,
  });
  res.json({ success: true, data: result });
});

// Coupons management
adminRouter.get('/coupons', async (req: Request, res: Response) => {
  const result = await couponService.listCoupons({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    status: req.query.status as any,
    search: req.query.search as string,
  });
  res.json({ success: true, data: result });
});

adminRouter.post('/coupons', validate(z.object({
  body: z.object({
    code: z.string().min(3).max(20).optional(),
    type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_ACCESS']),
    value: z.number().positive(),
    usageLimit: z.number().int().positive().optional(),
    perUserLimit: z.number().int().positive().optional(),
    expiresAt: z.string().datetime().optional(),
    minOrderAmount: z.number().positive().optional(),
    maxDiscountAmount: z.number().positive().optional(),
    isGlobal: z.boolean().optional(),
    courseIds: z.array(z.string().cuid()).optional(),
    description: z.string().optional(),
  }),
})), async (req: Request, res: Response) => {
  const coupon = await couponService.createCoupon({ ...req.body, createdBy: req.user!.id });
  res.status(201).json({ success: true, data: coupon });
});

adminRouter.post('/coupons/bulk', validate(z.object({
  body: z.object({
    count: z.number().int().min(1).max(1000),
    type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_ACCESS']),
    value: z.number().positive(),
    prefix: z.string().max(6).optional(),
    usageLimit: z.number().int().positive().optional(),
    expiresAt: z.string().datetime().optional(),
    courseIds: z.array(z.string().cuid()).optional(),
  }),
})), async (req: Request, res: Response) => {
  const codes = await couponService.bulkCreate({ ...req.body, createdBy: req.user!.id });
  res.json({ success: true, data: { count: codes.length, codes } });
});

adminRouter.delete('/coupons/:id', async (req: Request, res: Response) => {
  await couponService.deactivateCoupon(req.params.id);
  res.json({ success: true, message: 'تم تعطيل الكوبون' });
});

// Access codes management
adminRouter.get('/access-codes', async (req: Request, res: Response) => {
  const result = await accessCodesService.list({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    batchId: req.query.batchId as string,
    courseId: req.query.courseId as string,
  });
  res.json({ success: true, data: result });
});

adminRouter.post('/access-codes/generate', validate(z.object({
  body: z.object({
    count: z.number().int().min(1).max(500),
    courseId: z.string().cuid().optional(),
    usageLimit: z.number().int().positive().optional(),
    expiresAt: z.string().datetime().optional(),
    description: z.string().optional(),
  }),
})), async (req: Request, res: Response) => {
  const result = await accessCodesService.generateBatch({ ...req.body, createdBy: req.user!.id });
  res.json({ success: true, data: result });
});

// Audit logs
adminRouter.get('/audit-logs', async (req: Request, res: Response) => {
  const result = await auditService.list({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    resource: req.query.resource as string,
    actorId: req.query.actorId as string,
    action: req.query.action as any,
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
  });
  res.json({ success: true, data: result });
});

// User management shortcut
adminRouter.get('/users/stats', async (_req: Request, res: Response) => {
  const stats = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT', deletedAt: null } }),
    prisma.user.count({ where: { role: 'ADMIN', deletedAt: null } }),
    prisma.user.count({ where: { status: 'SUSPENDED', deletedAt: null } }),
  ]);
  res.json({ success: true, data: { students: stats[0], admins: stats[1], suspended: stats[2] } });
});

import { prisma } from '@/lib/prisma';
