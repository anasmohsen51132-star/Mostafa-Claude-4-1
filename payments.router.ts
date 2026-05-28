import { Router } from 'express';
import { paymentsController } from './payments.controller';
import { authenticate } from '@/middleware/auth';
import { rateLimiter } from '@/middleware/rateLimiter';
import { validate } from '@/middleware/validate';
import { z } from 'zod';

export const paymentsRouter = Router();

const initiateSchema = z.object({
  body: z.object({
    courseId: z.string().cuid(),
    provider: z.enum(['STRIPE', 'FAWRY', 'VODAFONE_CASH', 'INSTAPAY']),
    couponCode: z.string().optional(),
    accessCode: z.string().optional(),
  }),
});

paymentsRouter.use(authenticate);

paymentsRouter.post(
  '/',
  rateLimiter.payment,
  validate(initiateSchema),
  paymentsController.initiatePayment,
);
paymentsRouter.get('/my', paymentsController.myPayments);
paymentsRouter.get('/:id', paymentsController.getPayment);
paymentsRouter.get('/:id/fawry-status', paymentsController.pollFawryStatus);
