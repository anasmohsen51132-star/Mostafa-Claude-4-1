import { Router, Request, Response } from 'express';
import { accessCodesService } from './access-codes.service';
import { authenticate } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { z } from 'zod';

export const accessCodesRouter = Router();
accessCodesRouter.use(authenticate);

accessCodesRouter.post('/redeem', validate(z.object({
  body: z.object({
    code: z.string().min(1),
    courseId: z.string().cuid().optional(),
  }),
})), async (req: Request, res: Response) => {
  const result = await accessCodesService.redeem(req.body.code, req.user!.id, req.body.courseId);
  res.json({ success: true, data: result });
});
