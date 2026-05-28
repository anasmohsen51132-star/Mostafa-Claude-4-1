import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticate, requireAdmin } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { z } from 'zod';

export const usersRouter = Router();

usersRouter.use(authenticate);

// Self routes
usersRouter.get('/me', usersController.getMe);
usersRouter.get('/me/stats', usersController.getStats);
usersRouter.patch('/me', validate(z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    bio: z.string().max(500).optional(),
    avatar: z.string().url().optional(),
  }),
})), usersController.updateMe);

// Admin routes
usersRouter.get('/', requireAdmin, usersController.list);
usersRouter.get('/:id', requireAdmin, usersController.getById);
usersRouter.patch('/:id', requireAdmin, validate(z.object({
  body: z.object({
    role: z.enum(['STUDENT','INSTRUCTOR','ADMIN','OWNER']).optional(),
    status: z.enum(['ACTIVE','SUSPENDED','PENDING_VERIFICATION']).optional(),
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
  }),
})), usersController.adminUpdate);
usersRouter.delete('/:id', requireAdmin, usersController.delete);
