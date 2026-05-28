import { Router, Request, Response } from 'express';
import { quizzesService } from './quizzes.service';
import { authenticate, requireAdmin } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { z } from 'zod';

const quizzesController = {
  async getQuiz(req: Request, res: Response) {
    const quiz = await quizzesService.getQuiz(req.params.id, req.user!.id);
    res.json({ success: true, data: quiz });
  },
  async startAttempt(req: Request, res: Response) {
    const attempt = await quizzesService.startAttempt(req.params.id, req.user!.id, req.body.enrollmentId);
    res.status(201).json({ success: true, data: attempt });
  },
  async submitAttempt(req: Request, res: Response) {
    const result = await quizzesService.submitAttempt(req.params.attemptId, req.user!.id, req.body.answers);
    res.json({ success: true, data: result });
  },
  async getHistory(req: Request, res: Response) {
    const history = await quizzesService.getAttemptHistory(req.params.id, req.user!.id);
    res.json({ success: true, data: history });
  },
  async createQuiz(req: Request, res: Response) {
    const quiz = await quizzesService.createQuiz(req.body, req.user!.id);
    res.status(201).json({ success: true, data: quiz });
  },
  async updateQuiz(req: Request, res: Response) {
    const quiz = await quizzesService.updateQuiz(req.params.id, req.body, req.user!.id);
    res.json({ success: true, data: quiz });
  },
};

export const quizzesRouter = Router();
quizzesRouter.use(authenticate);

quizzesRouter.get('/:id', quizzesController.getQuiz);
quizzesRouter.post('/:id/start', quizzesController.startAttempt);
quizzesRouter.post('/attempts/:attemptId/submit', validate(z.object({
  body: z.object({ answers: z.array(z.object({ questionId: z.string(), answer: z.string() })) }),
})), quizzesController.submitAttempt);
quizzesRouter.get('/:id/history', quizzesController.getHistory);
quizzesRouter.post('/', requireAdmin, quizzesController.createQuiz);
quizzesRouter.patch('/:id', requireAdmin, quizzesController.updateQuiz);
