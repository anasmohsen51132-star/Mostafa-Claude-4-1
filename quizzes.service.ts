import { QuizAttemptStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/middleware/errorHandler';
import { enrollmentService } from '@/modules/courses/enrollment.service';
import { auditService } from '@/modules/admin/audit.service';

export const quizzesService = {
  async getQuiz(quizId: string, userId: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: [{ sortOrder: 'asc' }],
          select: {
            id: true, text: true, type: true, points: true, sortOrder: true,
            options: true, // includes isCorrect, stripped when serving
          },
        },
      },
    });
    if (!quiz) throw new AppError('الاختبار غير موجود', 404, 'NOT_FOUND');
    if (!quiz.isPublished) throw new AppError('الاختبار غير متاح', 403, 'FORBIDDEN');

    const hasAccess = await enrollmentService.checkAccess(userId, quiz.courseId);
    if (!hasAccess) throw new AppError('يجب التسجيل في الكورس أولاً', 403, 'NO_ACCESS');

    // Check attempt limits
    if (quiz.maxAttempts !== null) {
      const attemptCount = await prisma.quizAttempt.count({
        where: { quizId, userId, status: QuizAttemptStatus.COMPLETED },
      });
      if (attemptCount >= quiz.maxAttempts) {
        throw new AppError(`لقد وصلت للحد الأقصى من المحاولات (${quiz.maxAttempts})`, 400, 'MAX_ATTEMPTS_REACHED');
      }
    }

    // Strip correct answers from questions before serving
    const sanitizedQuestions = quiz.questions.map((q) => {
      const { options, ...rest } = q;
      const sanitizedOptions = Array.isArray(options)
        ? (options as any[]).map(({ isCorrect: _ic, ...opt }) => opt)
        : options;
      return { ...rest, options: sanitizedOptions };
    });

    // Randomize if enabled
    if (quiz.randomizeQuestions) {
      sanitizedQuestions.sort(() => Math.random() - 0.5);
    }

    return { ...quiz, questions: sanitizedQuestions };
  },

  async startAttempt(quizId: string, userId: string, enrollmentId?: string) {
    // Check for in-progress attempt
    const existing = await prisma.quizAttempt.findFirst({
      where: { quizId, userId, status: QuizAttemptStatus.IN_PROGRESS },
    });
    if (existing) return existing;

    return prisma.quizAttempt.create({
      data: { quizId, userId, enrollmentId, status: QuizAttemptStatus.IN_PROGRESS },
    });
  },

  async submitAttempt(attemptId: string, userId: string, answers: Array<{ questionId: string; answer: string }>) {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { quiz: { include: { questions: true } } },
    });

    if (!attempt || attempt.userId !== userId) throw new AppError('المحاولة غير موجودة', 404, 'NOT_FOUND');
    if (attempt.status === QuizAttemptStatus.COMPLETED) throw new AppError('تم تقديم هذه المحاولة بالفعل', 400, 'ALREADY_SUBMITTED');

    // Check time limit
    if (attempt.quiz.timeLimit) {
      const elapsed = (Date.now() - attempt.startedAt.getTime()) / 1000 / 60;
      if (elapsed > attempt.quiz.timeLimit + 1) { // 1 min grace
        throw new AppError('انتهى وقت الاختبار', 400, 'TIME_EXPIRED');
      }
    }

    let totalScore = 0;
    let maxScore = 0;
    const answerRecords: any[] = [];

    for (const question of attempt.quiz.questions) {
      maxScore += question.points;
      const userAnswer = answers.find((a) => a.questionId === question.id);
      let isCorrect = false;
      let points = 0;

      if (userAnswer) {
        if (question.type === 'multiple_choice') {
          const options = question.options as any[];
          const correctOption = options.find((o) => o.isCorrect);
          isCorrect = correctOption?.id === userAnswer.answer;
        } else if (question.type === 'true_false') {
          isCorrect = question.correctAnswer === userAnswer.answer;
        } else if (question.type === 'short_answer') {
          isCorrect = question.correctAnswer?.toLowerCase().trim() === userAnswer.answer.toLowerCase().trim();
        }

        if (isCorrect) points = question.points;
        totalScore += points;
      }

      answerRecords.push({
        attemptId,
        questionId: question.id,
        answer: userAnswer?.answer || null,
        isCorrect,
        points,
      });
    }

    const passed = maxScore > 0 ? (totalScore / maxScore) * 100 >= attempt.quiz.passingScore : false;
    const timeTaken = Math.round((Date.now() - attempt.startedAt.getTime()) / 1000);

    await prisma.$transaction([
      prisma.quizAnswer.createMany({ data: answerRecords }),
      prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
          score: totalScore, maxScore,
          passed, status: QuizAttemptStatus.COMPLETED,
          completedAt: new Date(), timeTaken,
        },
      }),
    ]);

    // Return with correct answers if showAnswers enabled
    const result = { score: totalScore, maxScore, passed, timeTaken, percentage: maxScore ? Math.round((totalScore / maxScore) * 100) : 0 };

    if (attempt.quiz.showAnswers) {
      const questionMap = new Map(attempt.quiz.questions.map((q) => [q.id, q]));
      return {
        ...result,
        answers: answerRecords.map((a) => ({
          ...a,
          explanation: (questionMap.get(a.questionId) as any)?.explanation,
          correctAnswer: (questionMap.get(a.questionId) as any)?.correctAnswer,
        })),
      };
    }

    return result;
  },

  async getAttemptHistory(quizId: string, userId: string) {
    return prisma.quizAttempt.findMany({
      where: { quizId, userId, status: QuizAttemptStatus.COMPLETED },
      orderBy: { completedAt: 'desc' },
      select: { id: true, score: true, maxScore: true, passed: true, completedAt: true, timeTaken: true },
    });
  },

  // Admin: Create quiz with questions
  async createQuiz(data: {
    courseId: string;
    lectureId?: string;
    title: string;
    description?: string;
    passingScore?: number;
    timeLimit?: number;
    maxAttempts?: number;
    randomizeQuestions?: boolean;
    showAnswers?: boolean;
    questions?: Array<{
      text: string;
      type: string;
      options?: any[];
      correctAnswer?: string;
      explanation?: string;
      points?: number;
      sortOrder?: number;
    }>;
  }, actorId: string) {
    const quiz = await prisma.quiz.create({
      data: {
        courseId: data.courseId,
        lectureId: data.lectureId,
        title: data.title,
        description: data.description,
        passingScore: data.passingScore ?? 70,
        timeLimit: data.timeLimit,
        maxAttempts: data.maxAttempts,
        randomizeQuestions: data.randomizeQuestions ?? false,
        showAnswers: data.showAnswers ?? true,
        questions: data.questions?.length ? {
          create: data.questions.map((q, i) => ({
            text: q.text, type: q.type, options: q.options || [],
            correctAnswer: q.correctAnswer, explanation: q.explanation,
            points: q.points ?? 1, sortOrder: q.sortOrder ?? i,
          })),
        } : undefined,
      },
      include: { questions: true },
    });

    await auditService.log({ actorId, action: 'CREATE', resource: 'Quiz', resourceId: quiz.id });
    return quiz;
  },

  async updateQuiz(quizId: string, data: any, actorId: string) {
    const { questions: _q, ...quizData } = data;
    const quiz = await prisma.quiz.update({ where: { id: quizId }, data: quizData });
    await auditService.log({ actorId, action: 'UPDATE', resource: 'Quiz', resourceId: quizId });
    return quiz;
  },
};
