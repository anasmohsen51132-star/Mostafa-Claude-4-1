import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/redis';
import { PaymentStatus, UserRole } from '@prisma/client';

export const adminService = {
  async getDashboardStats() {
    return cache.wrap('admin:dashboard:stats', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

      const [
        totalUsers, newUsersToday, newUsersMonth,
        totalCourses, publishedCourses,
        totalEnrollments, enrollmentsToday,
        totalRevenue, revenueToday, revenueMonth,
        pendingPayments, failedPayments,
        totalCertificates,
      ] = await prisma.$transaction([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.user.count({ where: { createdAt: { gte: today }, deletedAt: null } }),
        prisma.user.count({ where: { createdAt: { gte: thisMonth }, deletedAt: null } }),
        prisma.course.count(),
        prisma.course.count({ where: { status: 'PUBLISHED' } }),
        prisma.enrollment.count(),
        prisma.enrollment.count({ where: { createdAt: { gte: today } } }),
        prisma.payment.aggregate({
          where: { status: PaymentStatus.COMPLETED },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: { status: PaymentStatus.COMPLETED, paidAt: { gte: today } },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: { status: PaymentStatus.COMPLETED, paidAt: { gte: thisMonth } },
          _sum: { amount: true },
        }),
        prisma.payment.count({ where: { status: 'PENDING' } }),
        prisma.payment.count({ where: { status: 'FAILED' } }),
        prisma.certificate.count({ where: { status: 'ISSUED' } }),
      ]);

      return {
        users: { total: totalUsers, today: newUsersToday, month: newUsersMonth },
        courses: { total: totalCourses, published: publishedCourses },
        enrollments: { total: totalEnrollments, today: enrollmentsToday },
        revenue: {
          total: Number(totalRevenue._sum.amount || 0),
          today: Number(revenueToday._sum.amount || 0),
          month: Number(revenueMonth._sum.amount || 0),
        },
        payments: { pending: pendingPayments, failed: failedPayments },
        certificates: totalCertificates,
      };
    }, 60);
  },

  async getRecentActivity() {
    const [recentUsers, recentPayments, recentEnrollments] = await prisma.$transaction([
      prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, phone: true, role: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.payment.findMany({
        include: {
          user: { select: { id: true, name: true, phone: true } },
          invoice: { select: { invoiceNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.enrollment.findMany({
        include: {
          user: { select: { name: true } },
          course: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return { recentUsers, recentPayments, recentEnrollments };
  },

  async getRevenueChart(days = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);

    const payments = await prisma.payment.findMany({
      where: { status: PaymentStatus.COMPLETED, paidAt: { gte: from } },
      select: { amount: true, paidAt: true, provider: true },
      orderBy: { paidAt: 'asc' },
    });

    // Group by day
    const byDay: Record<string, { date: string; revenue: number; count: number }> = {};
    for (const p of payments) {
      if (!p.paidAt) continue;
      const day = p.paidAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { date: day, revenue: 0, count: 0 };
      byDay[day].revenue += Number(p.amount);
      byDay[day].count++;
    }

    return Object.values(byDay);
  },

  async getPayments(params: {
    page?: number;
    limit?: number;
    status?: string;
    provider?: string;
    search?: string;
    from?: Date;
    to?: Date;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.provider) where.provider = params.provider;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = params.from;
      if (params.to) where.createdAt.lte = params.to;
    }
    if (params.search) {
      where.OR = [
        { fawryReferenceNumber: { contains: params.search } },
        { providerRef: { contains: params.search } },
        { user: { OR: [{ name: { contains: params.search, mode: 'insensitive' } }, { phone: { contains: params.search } }] } },
      ];
    }

    const [payments, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, phone: true } },
          invoice: { select: { invoiceNumber: true } },
          refunds: { select: { id: true, amount: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return { payments, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async processRefund(paymentId: string, amount: number, reason: string, actorId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { stripePaymentIntentId: false } as any,
    });
    if (!payment) throw new Error('Payment not found');
    if (payment.status !== PaymentStatus.COMPLETED) throw new Error('Payment not completed');

    const refund = await prisma.refund.create({
      data: {
        paymentId,
        amount,
        reason,
        status: 'PENDING',
        requestedBy: actorId,
      },
    });

    return refund;
  },

  async getWebhookEvents(params: { page?: number; limit?: number; provider?: string; status?: string }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const where: any = {};
    if (params.provider) where.provider = params.provider;
    if (params.status) where.status = params.status;

    const [events, total] = await prisma.$transaction([
      prisma.paymentWebhookEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.paymentWebhookEvent.count({ where }),
    ]);

    return { events, total, page, limit };
  },
};
