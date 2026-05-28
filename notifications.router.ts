import { Router, Request, Response } from 'express';
import { notificationService } from './notifications.service';
import { authenticate } from '@/middleware/auth';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get('/', async (req: Request, res: Response) => {
  const result = await notificationService.getForUser(
    req.user!.id, Number(req.query.page) || 1, Number(req.query.limit) || 20,
  );
  res.json({ success: true, data: result });
});

notificationsRouter.patch('/:id/read', async (req: Request, res: Response) => {
  await notificationService.markRead(req.params.id, req.user!.id);
  res.json({ success: true });
});

notificationsRouter.post('/mark-all-read', async (req: Request, res: Response) => {
  await notificationService.markAllRead(req.user!.id);
  res.json({ success: true });
});

notificationsRouter.delete('/:id', async (req: Request, res: Response) => {
  await notificationService.deleteNotification(req.params.id, req.user!.id);
  res.json({ success: true });
});
