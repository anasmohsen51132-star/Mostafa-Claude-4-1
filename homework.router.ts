import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/middleware/errorHandler';
import { authenticate, requireAdmin } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { mediaService } from '@/modules/media/media.router';
import { enrollmentService } from '@/modules/courses/enrollment.service';
import { auditService } from '@/modules/admin/audit.service';
import { logger } from '@/lib/logger';

// ── Multer for image uploads ──────────────────────────────────────
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per image
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new AppError('Only images are allowed', 400, 'INVALID_FILE_TYPE'));
  },
});

// ── Homework Service ──────────────────────────────────────────────
export const homeworkService = {
  async listForCourse(courseId: string, userId?: string, isAdmin = false) {
    const where: any = { courseId };
    if (!isAdmin) where.status = 'PUBLISHED';

    const homework = await prisma.homework.findMany({
      where,
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: { images: { orderBy: { sortOrder: 'asc' } } },
        },
        _count: { select: { submissions: true } },
        ...(userId && !isAdmin
          ? { submissions: { where: { userId }, select: { id: true, status: true, score: true, submittedAt: true } } }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return homework;
  },

  async getById(homeworkId: string, userId?: string, isAdmin = false) {
    const homework = await prisma.homework.findUnique({
      where: { id: homeworkId },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
          },
        },
        _count: { select: { submissions: true } },
      },
    });

    if (!homework) throw new AppError('Homework not found', 404, 'NOT_FOUND');
    if (!isAdmin && homework.status !== 'PUBLISHED') throw new AppError('Homework not available', 403, 'FORBIDDEN');

    // Check enrollment for students
    if (!isAdmin && userId) {
      const hasAccess = await enrollmentService.checkAccess(userId, homework.courseId);
      if (!hasAccess) throw new AppError('You must be enrolled in this course', 403, 'NO_ACCESS');
    }

    return homework;
  },

  async create(data: {
    courseId: string;
    lectureId?: string;
    title: string;
    description: string;
    instructions?: string;
    dueDate?: Date;
    maxScore?: number;
    allowLate?: boolean;
    questions?: Array<{
      text: string;
      type: string;
      options?: any;
      correctAnswer?: string;
      explanation?: string;
      points?: number;
      sortOrder?: number;
      imageUrl?: string;
      imageCaption?: string;
    }>;
  }, actorId: string) {
    const homework = await prisma.homework.create({
      data: {
        courseId: data.courseId,
        lectureId: data.lectureId,
        title: data.title,
        description: data.description,
        instructions: data.instructions,
        dueDate: data.dueDate,
        maxScore: data.maxScore ?? 100,
        status: 'DRAFT',
        allowLate: data.allowLate ?? false,
        createdBy: actorId,
        questions: data.questions?.length
          ? {
              create: data.questions.map((q, i) => ({
                text: q.text,
                type: q.type,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                points: q.points ?? 1,
                sortOrder: q.sortOrder ?? i,
                imageUrl: q.imageUrl,
                imageCaption: q.imageCaption,
              })),
            }
          : undefined,
      },
      include: { questions: { include: { images: true } } },
    });

    await auditService.log({
      actorId, action: 'CREATE', resource: 'Homework', resourceId: homework.id,
    });

    return homework;
  },

  async update(homeworkId: string, data: any, actorId: string) {
    const existing = await prisma.homework.findUnique({ where: { id: homeworkId } });
    if (!existing) throw new AppError('Homework not found', 404, 'NOT_FOUND');

    const { questions: _q, ...homeworkData } = data;
    const homework = await prisma.homework.update({
      where: { id: homeworkId },
      data: homeworkData,
      include: { questions: { include: { images: true } } },
    });

    await auditService.log({ actorId, action: 'UPDATE', resource: 'Homework', resourceId: homeworkId });
    return homework;
  },

  async addQuestion(homeworkId: string, questionData: any, actorId: string) {
    const question = await prisma.homeworkQuestion.create({
      data: {
        homeworkId,
        text: questionData.text,
        type: questionData.type ?? 'essay',
        options: questionData.options,
        correctAnswer: questionData.correctAnswer,
        explanation: questionData.explanation,
        points: questionData.points ?? 1,
        sortOrder: questionData.sortOrder ?? 0,
        imageUrl: questionData.imageUrl,
        imageCaption: questionData.imageCaption,
      },
      include: { images: true },
    });
    return question;
  },

  async addQuestionImage(questionId: string, file: Express.Multer.File, caption: string | undefined, sortOrder: number, actorId: string) {
    const uploaded = await mediaService.uploadToS3(file, 'homework-images', actorId);
    const image = await prisma.homeworkQuestionImage.create({
      data: {
        questionId,
        url: uploaded.cdnUrl || uploaded.url,
        key: uploaded.key,
        caption,
        sortOrder,
      },
    });
    return image;
  },

  async removeQuestionImage(imageId: string, actorId: string) {
    const image = await prisma.homeworkQuestionImage.findUnique({ where: { id: imageId } });
    if (!image) throw new AppError('Image not found', 404, 'NOT_FOUND');
    await mediaService.deleteFromS3(image.key);
    await prisma.homeworkQuestionImage.delete({ where: { id: imageId } });
  },

  async submit(homeworkId: string, userId: string, data: {
    answers: Array<{
      questionId: string;
      answer?: string;
      imageUrls?: string[];
    }>;
    attachments?: Array<{ url: string; key: string; filename: string; mimeType: string; size: number }>;
  }) {
    const homework = await prisma.homework.findUnique({ where: { id: homeworkId } });
    if (!homework) throw new AppError('Homework not found', 404, 'NOT_FOUND');
    if (homework.status !== 'PUBLISHED') throw new AppError('Homework not available', 403, 'FORBIDDEN');

    const hasAccess = await enrollmentService.checkAccess(userId, homework.courseId);
    if (!hasAccess) throw new AppError('Not enrolled in this course', 403, 'NO_ACCESS');

    const isLate = homework.dueDate ? new Date() > homework.dueDate : false;
    if (isLate && !homework.allowLate) throw new AppError('Submission deadline has passed', 400, 'DEADLINE_PASSED');

    // Check for existing submission
    const existing = await prisma.homeworkSubmission.findUnique({
      where: { homeworkId_userId: { homeworkId, userId } },
    });
    if (existing && existing.status !== 'RETURNED') {
      throw new AppError('You have already submitted this homework', 409, 'ALREADY_SUBMITTED');
    }

    const submission = await prisma.homeworkSubmission.upsert({
      where: { homeworkId_userId: { homeworkId, userId } },
      create: {
        homeworkId,
        userId,
        status: 'SUBMITTED',
        isLate,
        maxScore: homework.maxScore,
        answers: {
          create: data.answers.map((a) => ({
            questionId: a.questionId,
            answer: a.answer,
            imageUrls: a.imageUrls ?? [],
          })),
        },
        attachments: data.attachments?.length
          ? {
              create: data.attachments.map((att) => ({
                url: att.url,
                key: att.key,
                filename: att.filename,
                mimeType: att.mimeType,
                size: BigInt(att.size),
              })),
            }
          : undefined,
      },
      update: {
        status: 'SUBMITTED',
        isLate,
        submittedAt: new Date(),
        answers: {
          deleteMany: {},
          create: data.answers.map((a) => ({
            questionId: a.questionId,
            answer: a.answer,
            imageUrls: a.imageUrls ?? [],
          })),
        },
      },
      include: { answers: true, attachments: true },
    });

    logger.info({ submissionId: submission.id, homeworkId, userId }, 'Homework submitted');
    return submission;
  },

  async getMySubmission(homeworkId: string, userId: string) {
    return prisma.homeworkSubmission.findUnique({
      where: { homeworkId_userId: { homeworkId, userId } },
      include: { answers: true, attachments: true },
    });
  },

  async gradeSubmission(submissionId: string, data: {
    score: number;
    feedback?: string;
    answerFeedback?: Array<{ answerId: string; points: number; feedback?: string; isCorrect?: boolean }>;
  }, actorId: string) {
    const submission = await prisma.homeworkSubmission.findUnique({
      where: { id: submissionId },
      include: { homework: true },
    });
    if (!submission) throw new AppError('Submission not found', 404, 'NOT_FOUND');

    const result = await prisma.$transaction(async (tx) => {
      // Update individual answer grades if provided
      if (data.answerFeedback?.length) {
        await Promise.all(
          data.answerFeedback.map((af) =>
            tx.homeworkAnswer.update({
              where: { id: af.answerId },
              data: { points: af.points, feedback: af.feedback, isCorrect: af.isCorrect },
            }),
          ),
        );
      }

      return tx.homeworkSubmission.update({
        where: { id: submissionId },
        data: {
          score: data.score,
          feedback: data.feedback,
          status: 'GRADED',
          gradedAt: new Date(),
          gradedBy: actorId,
        },
        include: { answers: true },
      });
    });

    await auditService.log({ actorId, action: 'UPDATE', resource: 'HomeworkSubmission', resourceId: submissionId });
    return result;
  },

  async getSubmissionsForAdmin(homeworkId: string, params: { page?: number; limit?: number; status?: string }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const where: any = { homeworkId };
    if (params.status) where.status = params.status;

    const [submissions, total] = await prisma.$transaction([
      prisma.homeworkSubmission.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, phone: true, avatar: true } },
          answers: { include: { question: { select: { text: true, points: true } } } },
          attachments: true,
        },
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.homeworkSubmission.count({ where }),
    ]);

    return { submissions, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async delete(homeworkId: string, actorId: string) {
    const count = await prisma.homeworkSubmission.count({ where: { homeworkId } });
    if (count > 0) throw new AppError(`Cannot delete homework with ${count} submissions`, 400, 'HAS_SUBMISSIONS');
    await prisma.homework.delete({ where: { id: homeworkId } });
    await auditService.log({ actorId, action: 'DELETE', resource: 'Homework', resourceId: homeworkId });
  },
};

// ── Router ────────────────────────────────────────────────────────
export const homeworkRouter = Router();
homeworkRouter.use(authenticate);

const createSchema = z.object({
  body: z.object({
    courseId: z.string().cuid(),
    lectureId: z.string().cuid().optional(),
    title: z.string().min(3).max(200),
    description: z.string().min(5),
    instructions: z.string().optional(),
    dueDate: z.string().datetime().optional(),
    maxScore: z.number().int().positive().optional(),
    allowLate: z.boolean().optional(),
    questions: z.array(z.object({
      text: z.string().min(3),
      type: z.enum(['essay', 'multiple_choice', 'true_false', 'short_answer']),
      options: z.any().optional(),
      correctAnswer: z.string().optional(),
      explanation: z.string().optional(),
      points: z.number().int().positive().optional(),
      sortOrder: z.number().int().optional(),
      imageUrl: z.string().url().optional(),
      imageCaption: z.string().max(300).optional(),
    })).optional(),
  }),
});

// Student routes
homeworkRouter.get('/course/:courseId', async (req: Request, res: Response) => {
  const list = await homeworkService.listForCourse(req.params.courseId, req.user!.id, false);
  res.json({ success: true, data: list });
});

homeworkRouter.get('/:id', async (req: Request, res: Response) => {
  const hw = await homeworkService.getById(req.params.id, req.user!.id, false);
  res.json({ success: true, data: hw });
});

homeworkRouter.post('/:id/submit', async (req: Request, res: Response) => {
  const submission = await homeworkService.submit(req.params.id, req.user!.id, req.body);
  res.status(201).json({ success: true, data: submission });
});

homeworkRouter.get('/:id/my-submission', async (req: Request, res: Response) => {
  const sub = await homeworkService.getMySubmission(req.params.id, req.user!.id);
  res.json({ success: true, data: sub });
});

// Admin routes
homeworkRouter.post('/', requireAdmin, validate(createSchema), async (req: Request, res: Response) => {
  const hw = await homeworkService.create(req.body, req.user!.id);
  res.status(201).json({ success: true, data: hw });
});

homeworkRouter.patch('/:id', requireAdmin, async (req: Request, res: Response) => {
  const hw = await homeworkService.update(req.params.id, req.body, req.user!.id);
  res.json({ success: true, data: hw });
});

homeworkRouter.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  await homeworkService.delete(req.params.id, req.user!.id);
  res.json({ success: true, message: 'Homework deleted' });
});

homeworkRouter.post('/:id/questions', requireAdmin, async (req: Request, res: Response) => {
  const q = await homeworkService.addQuestion(req.params.id, req.body, req.user!.id);
  res.status(201).json({ success: true, data: q });
});

homeworkRouter.post('/questions/:questionId/images',
  requireAdmin,
  imageUpload.single('image'),
  async (req: Request, res: Response) => {
    if (!req.file) throw new AppError('No image provided', 400, 'NO_FILE');
    const image = await homeworkService.addQuestionImage(
      req.params.questionId, req.file,
      req.body.caption, Number(req.body.sortOrder) || 0, req.user!.id,
    );
    res.status(201).json({ success: true, data: image });
  },
);

homeworkRouter.delete('/question-images/:imageId', requireAdmin, async (req: Request, res: Response) => {
  await homeworkService.removeQuestionImage(req.params.imageId, req.user!.id);
  res.json({ success: true });
});

homeworkRouter.get('/:id/submissions', requireAdmin, async (req: Request, res: Response) => {
  const result = await homeworkService.getSubmissionsForAdmin(req.params.id, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    status: req.query.status as string,
  });
  res.json({ success: true, data: result });
});

homeworkRouter.post('/submissions/:submissionId/grade', requireAdmin, async (req: Request, res: Response) => {
  const result = await homeworkService.gradeSubmission(req.params.submissionId, req.body, req.user!.id);
  res.json({ success: true, data: result });
});
