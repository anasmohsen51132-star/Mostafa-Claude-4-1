import { Request, Response } from 'express';
import { paymentsService } from './payments.service';

export const paymentsController = {
  async initiatePayment(req: Request, res: Response) {
    const result = await paymentsService.initiatePayment(
      { ...req.body, userId: req.user!.id },
      { ip: req.ip, ua: req.headers['user-agent'] },
    );
    res.status(201).json({ success: true, data: result });
  },

  async getPayment(req: Request, res: Response) {
    const payment = await paymentsService.getPayment(req.params.id, req.user!.id);
    res.json({ success: true, data: payment });
  },

  async myPayments(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const result = await paymentsService.getUserPayments(req.user!.id, page, limit);
    res.json({ success: true, data: result });
  },

  async pollFawryStatus(req: Request, res: Response) {
    const result = await paymentsService.pollFawryStatus(req.params.id, req.user!.id);
    res.json({ success: true, data: result });
  },
};
