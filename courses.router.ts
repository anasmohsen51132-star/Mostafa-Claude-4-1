import { Router } from 'express';
import { coursesController } from './courses.controller';
import { authenticate, optionalAuth, requireAdmin } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { z } from 'zod';

export const coursesRouter = Router();

const createCourseSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200),
    description: z.string().min(10),
    shortDesc: z.string().max(300).optional(),
    price: z.number().min(0),
    originalPrice: z.number().min(0).optional(),
    currency: z.string().default('EGP'),
    categoryId: z.string().cuid().optional(),
    level: z.enum(['BEGINNER','INTERMEDIATE','ADVANCED','ALL_LEVELS']).optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    isFree: z.boolean().optional(),
    certificateEnabled: z.boolean().optional(),
    passingScore: z.number().min(0).max(100).optional(),
  }),
});

// Public routes
coursesRouter.get('/categories', coursesController.getCategories);
coursesRouter.get('/', optionalAuth, coursesController.list);
coursesRouter.get('/slug/:slug', optionalAuth, coursesController.getBySlug);

// Authenticated routes
coursesRouter.use(authenticate);
coursesRouter.get('/my-enrollments', coursesController.myEnrollments);
coursesRouter.get('/:id/access', coursesController.checkAccess);
coursesRouter.post('/:id/progress', validate(z.object({
  body: z.object({
    lectureId: z.string().cuid(),
    watchedSeconds: z.number().min(0),
  }),
})), coursesController.updateProgress);

// Admin routes
coursesRouter.get('/:id', requireAdmin, coursesController.getById);
coursesRouter.post('/', requireAdmin, validate(createCourseSchema), coursesController.create);
coursesRouter.patch('/:id', requireAdmin, coursesController.update);
coursesRouter.delete('/:id', requireAdmin, coursesController.delete);
