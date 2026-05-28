import { Router, Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { authenticate, requireAdmin } from '@/middleware/auth';
import { cache } from '@/lib/redis';

export const analyticsRouter = Router();
analyticsRouter.use(authenticate, requireAdmin);

analyticsRouter.get('/overview', async (_req: Request, res: Response) => {
  const data = await cache.wrap('analytics:overview', async () => {
    const [byProvider, topCourses, userGrowth] = await prisma.$transaction([
      prisma.payment.groupBy({
        by: ['provider'],
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.course.findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, title: true, totalStudents: true, rating: true, price: true },
        orderBy: { totalStudents: 'desc' },
        take: 10,
      }),
      prisma.user.groupBy({
        by: ['createdAt'],
        _count: { id: true },
        orderBy: { createdAt: 'asc' },
        take: 30,
      }),
    ]);
    return { byProvider, topCourses, userGrowth };
  }, 300);

  res.json({ success: true, data });
});

analyticsRouter.get('/courses/:id', async (req: Request, res: Response) => {
  const analytics = await prisma.courseAnalytics.findMany({
    where: { courseId: req.params.id },
    orderBy: { date: 'desc' },
    take: 30,
  });
  res.json({ success: true, data: analytics });
});
