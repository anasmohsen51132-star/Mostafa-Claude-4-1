import { Router, Request, Response } from 'express';
import { couponService } from './coupons.service';
import { authenticate } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { z } from 'zod';

export const couponsRouter = Router();
couponsRouter.use(authenticate);

// Validate coupon (student)
couponsRouter.post('/validate', validate(z.object({
  body: z.object({
    code: z.string().min(1),
    courseId: z.string().cuid(),
    amount: z.number().positive(),
  }),
})), async (req: Request, res: Response) => {
  const result = await couponService.validate({ ...req.body, userId: req.user!.id });
  res.json({ success: true, data: result });
});
