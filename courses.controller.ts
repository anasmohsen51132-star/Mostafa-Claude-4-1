import { Request, Response } from 'express';
import { coursesService } from './courses.service';
import { enrollmentService } from './enrollment.service';

export const coursesController = {
  async list(req: Request, res: Response) {
    const result = await coursesService.list({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 12,
      categoryId: req.query.categoryId as string,
      level: req.query.level as any,
      search: req.query.search as string,
      isFeatured: req.query.featured === 'true' ? true : undefined,
      userId: req.user?.id,
    });
    res.json({ success: true, data: result });
  },

  async getBySlug(req: Request, res: Response) {
    const course = await coursesService.findBySlug(req.params.slug, req.user?.id);
    res.json({ success: true, data: course });
  },

  async getById(req: Request, res: Response) {
    const course = await coursesService.findById(req.params.id);
    res.json({ success: true, data: course });
  },

  async create(req: Request, res: Response) {
    const course = await coursesService.create(req.body, req.user!.id);
    res.status(201).json({ success: true, data: course });
  },

  async update(req: Request, res: Response) {
    const course = await coursesService.update(req.params.id, req.body, req.user!.id);
    res.json({ success: true, data: course });
  },

  async delete(req: Request, res: Response) {
    await coursesService.delete(req.params.id, req.user!.id);
    res.json({ success: true, message: 'تم أرشفة الكورس' });
  },

  async getCategories(_req: Request, res: Response) {
    const categories = await coursesService.getCategories();
    res.json({ success: true, data: categories });
  },

  async myEnrollments(req: Request, res: Response) {
    const enrollments = await enrollmentService.getMyEnrollments(req.user!.id);
    res.json({ success: true, data: enrollments });
  },

  async checkAccess(req: Request, res: Response) {
    const hasAccess = await enrollmentService.checkAccess(req.user!.id, req.params.id);
    res.json({ success: true, data: { hasAccess } });
  },

  async updateProgress(req: Request, res: Response) {
    const enrollment = await enrollmentService.getEnrollment(req.user!.id, req.params.id);
    if (!enrollment || enrollment.status === 'REFUNDED') {
      return res.status(403).json({ success: false, error: { code: 'NO_ACCESS', message: 'غير مسجل في هذا الكورس' } });
    }
    const result = await enrollmentService.updateProgress(enrollment.id, req.body.lectureId, req.body.watchedSeconds);
    res.json({ success: true, data: result });
  },
};
