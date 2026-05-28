import { Request, Response } from 'express';
import { usersService } from './users.service';
import { UserRole, UserStatus } from '@prisma/client';

export const usersController = {
  async getMe(req: Request, res: Response) {
    const user = await usersService.findById(req.user!.id);
    res.json({ success: true, data: user });
  },

  async getStats(req: Request, res: Response) {
    const stats = await usersService.getStats(req.user!.id);
    res.json({ success: true, data: stats });
  },

  async updateMe(req: Request, res: Response) {
    const user = await usersService.updateProfile(req.user!.id, req.body, req.user!.id);
    res.json({ success: true, data: user });
  },

  // Admin routes
  async list(req: Request, res: Response) {
    const result = await usersService.list({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      role: req.query.role as UserRole,
      status: req.query.status as UserStatus,
      search: req.query.search as string,
    });
    res.json({ success: true, data: result });
  },

  async getById(req: Request, res: Response) {
    const user = await usersService.findById(req.params.id);
    res.json({ success: true, data: user });
  },

  async adminUpdate(req: Request, res: Response) {
    const user = await usersService.adminUpdate(req.params.id, req.body, req.user!.id);
    res.json({ success: true, data: user });
  },

  async delete(req: Request, res: Response) {
    await usersService.softDelete(req.params.id, req.user!.id);
    res.json({ success: true, message: 'تم حذف المستخدم' });
  },
};
