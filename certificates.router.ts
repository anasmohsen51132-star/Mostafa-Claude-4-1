import { Router, Request, Response } from 'express';
import { certificatesService } from './certificates.service';
import { authenticate, requireAdmin } from '@/middleware/auth';

export const certificatesRouter = Router();

// Public: verify certificate
certificatesRouter.get('/verify/:number', async (req: Request, res: Response) => {
  const result = await certificatesService.verify(req.params.number);
  res.json({ success: true, data: result });
});

// Authenticated
certificatesRouter.use(authenticate);
certificatesRouter.get('/my', async (req: Request, res: Response) => {
  const certs = await certificatesService.getUserCertificates(req.user!.id);
  res.json({ success: true, data: certs });
});

// Admin
certificatesRouter.post('/:id/revoke', requireAdmin, async (req: Request, res: Response) => {
  const cert = await certificatesService.revoke(req.params.id, req.body.reason, req.user!.id);
  res.json({ success: true, data: cert });
});
