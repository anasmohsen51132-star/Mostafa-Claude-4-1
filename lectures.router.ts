import { Router } from 'express';
import { Request, Response } from 'express';
import { lecturesService } from './lectures.service';
import { authenticate, optionalAuth, requireAdmin } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { z } from 'zod';

// Controller
export const lecturesController = {
  async getLecture(req: Request, res: Response) {
    const lecture = await lecturesService.getLecture(req.params.id, req.user?.id);
    res.json({ success: true, data: lecture });
  },

  async getCourseLectures(req: Request, res: Response) {
    const sections = await lecturesService.getCourseLectures(req.params.courseId, req.user?.id);
    res.json({ success: true, data: sections });
  },

  async create(req: Request, res: Response) {
    const lecture = await lecturesService.create(req.body, req.user!.id);
    res.status(201).json({ success: true, data: lecture });
  },

  async update(req: Request, res: Response) {
    const lecture = await lecturesService.update(req.params.id, req.body, req.user!.id);
    res.json({ success: true, data: lecture });
  },

  async delete(req: Request, res: Response) {
    await lecturesService.delete(req.params.id, req.user!.id);
    res.json({ success: true, message: 'تم حذف المحاضرة' });
  },

  async createSection(req: Request, res: Response) {
    const section = await lecturesService.createSection(req.body.courseId, req.body.title, req.body.sortOrder, req.user!.id);
    res.status(201).json({ success: true, data: section });
  },

  async updateSection(req: Request, res: Response) {
    const section = await lecturesService.updateSection(req.params.id, req.body, req.user!.id);
    res.json({ success: true, data: section });
  },

  async deleteSection(req: Request, res: Response) {
    await lecturesService.deleteSection(req.params.id, req.user!.id);
    res.json({ success: true, message: 'تم حذف القسم' });
  },

  async reorder(req: Request, res: Response) {
    await lecturesService.reorderLectures(req.body.lectures);
    res.json({ success: true, message: 'تم إعادة الترتيب' });
  },
};

// Router
export const lecturesRouter = Router();

lecturesRouter.get('/course/:courseId', optionalAuth, lecturesController.getCourseLectures);
lecturesRouter.get('/:id', authenticate, lecturesController.getLecture);

// Admin
lecturesRouter.use(authenticate);
lecturesRouter.post('/', requireAdmin, validate(z.object({
  body: z.object({
    courseId: z.string().cuid(),
    sectionId: z.string().cuid().optional(),
    title: z.string().min(2).max(200),
    description: z.string().optional(),
    sortOrder: z.number().optional(),
    isFree: z.boolean().optional(),
    videoDuration: z.number().optional(),
  }),
})), lecturesController.create);
lecturesRouter.patch('/:id', requireAdmin, lecturesController.update);
lecturesRouter.delete('/:id', requireAdmin, lecturesController.delete);

// Sections
lecturesRouter.post('/sections', requireAdmin, lecturesController.createSection);
lecturesRouter.patch('/sections/:id', requireAdmin, lecturesController.updateSection);
lecturesRouter.delete('/sections/:id', requireAdmin, lecturesController.deleteSection);
lecturesRouter.post('/reorder', requireAdmin, lecturesController.reorder);
