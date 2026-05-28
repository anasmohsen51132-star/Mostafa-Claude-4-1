import bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/redis';
import { AppError } from '@/middleware/errorHandler';
import { config } from '@/config/env';
import { auditService } from '@/modules/admin/audit.service';

export const usersService = {
  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true, name: true, phone: true, email: true,
        role: true, status: true, avatar: true, bio: true,
        emailVerified: true, phoneVerified: true,
        lastLoginAt: true, createdAt: true, updatedAt: true,
        _count: {
          select: {
            enrollments: { where: { status: 'ACTIVE' } },
            certificates: { where: { status: 'ISSUED' } },
            payments: { where: { status: 'COMPLETED' } },
          },
        },
      },
    });
    if (!user) throw new AppError('المستخدم غير موجود', 404, 'NOT_FOUND');
    return user;
  },

  async list(params: {
    page?: number;
    limit?: number;
    role?: UserRole;
    status?: UserStatus;
    search?: string;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);

    const where: any = { deletedAt: null };
    if (params.role) where.role = params.role;
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, phone: true, email: true,
          role: true, status: true, avatar: true,
          lastLoginAt: true, createdAt: true,
          _count: { select: { enrollments: true, payments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async updateProfile(userId: string, data: {
    name?: string;
    email?: string;
    bio?: string;
    avatar?: string;
  }, actorId: string) {
    if (data.email) {
      const existing = await prisma.user.findFirst({
        where: { email: data.email, id: { not: userId } },
      });
      if (existing) throw new AppError('البريد الإلكتروني مستخدم', 409, 'EMAIL_TAKEN');
    }

    const before = await prisma.user.findUnique({ where: { id: userId } });
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name: data.name, email: data.email, bio: data.bio, avatar: data.avatar },
      select: { id: true, name: true, phone: true, email: true, role: true, avatar: true, bio: true },
    });

    await cache.del(`user:${userId}`);
    await auditService.log({ actorId, action: 'UPDATE', resource: 'User', resourceId: userId, before, after: data });
    return user;
  },

  async adminUpdate(userId: string, data: {
    role?: UserRole;
    status?: UserStatus;
    name?: string;
    email?: string;
  }, actorId: string) {
    const before = await prisma.user.findUnique({ where: { id: userId } });
    if (!before) throw new AppError('المستخدم غير موجود', 404, 'NOT_FOUND');

    // Prevent demoting the last owner
    if (data.role && before.role === UserRole.OWNER && data.role !== UserRole.OWNER) {
      const ownerCount = await prisma.user.count({ where: { role: UserRole.OWNER, deletedAt: null } });
      if (ownerCount <= 1) throw new AppError('لا يمكن تغيير دور المالك الوحيد', 400, 'LAST_OWNER');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });

    await cache.del(`user:${userId}`);
    await auditService.log({ actorId, action: 'UPDATE', resource: 'User', resourceId: userId, before, after: data });
    return user;
  },

  async softDelete(userId: string, actorId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('المستخدم غير موجود', 404, 'NOT_FOUND');
    if (user.role === UserRole.OWNER) throw new AppError('لا يمكن حذف المالك', 400, 'CANNOT_DELETE_OWNER');

    await prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date(), status: UserStatus.DELETED } });
    await cache.del(`user:${userId}`);
    await auditService.log({ actorId, action: 'DELETE', resource: 'User', resourceId: userId });
  },

  async getStats(userId: string) {
    const [enrollments, payments, certificates, quizAttempts] = await prisma.$transaction([
      prisma.enrollment.findMany({
        where: { userId },
        include: { course: { select: { id: true, title: true, thumbnail: true } } },
      }),
      prisma.payment.findMany({
        where: { userId, status: 'COMPLETED' },
        select: { id: true, amount: true, currency: true, createdAt: true },
      }),
      prisma.certificate.findMany({
        where: { userId, status: 'ISSUED' },
        include: { course: { select: { title: true } } },
      }),
      prisma.quizAttempt.findMany({
        where: { userId, status: 'COMPLETED' },
        select: { score: true, maxScore: true, passed: true },
      }),
    ]);

    const totalSpent = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const avgQuizScore = quizAttempts.length
      ? quizAttempts.reduce((sum, a) => sum + (a.maxScore ? (a.score / a.maxScore) * 100 : 0), 0) / quizAttempts.length
      : 0;

    return { enrollments, payments, certificates, totalSpent, avgQuizScore: Math.round(avgQuizScore) };
  },
};
