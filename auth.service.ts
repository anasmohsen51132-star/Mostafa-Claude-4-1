import bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { tokenService } from '@/lib/tokens';
import { cache } from '@/lib/redis';
import { AppError } from '@/middleware/errorHandler';
import { config } from '@/config/env';
import { auditService } from '@/modules/admin/audit.service';
import { authFailuresTotal } from '@/lib/metrics';
import type { RegisterInput, LoginInput } from './auth.validators';

export const authService = {
  async register(data: RegisterInput, meta: { ip?: string; ua?: string } = {}) {
    // Check phone uniqueness
    const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
    if (existing) {
      authFailuresTotal.inc({ reason: 'phone_taken' });
      throw new AppError('هذا الرقم مسجل بالفعل', 409, 'PHONE_TAKEN');
    }

    const passwordHash = await bcrypt.hash(data.password, config.hashRounds);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        passwordHash,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
      select: { id: true, name: true, phone: true, role: true, status: true, createdAt: true },
    });

    const tokens = await tokenService.issueTokenPair(user.id, user.role, user.phone, {
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });

    await auditService.log({
      actorId: user.id,
      action: 'CREATE',
      resource: 'User',
      resourceId: user.id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });

    return { user, tokens };
  },

  async login(data: LoginInput, meta: { ip?: string; ua?: string } = {}) {
    const user = await prisma.user.findUnique({
      where: { phone: data.phone },
      select: {
        id: true,
        name: true,
        phone: true,
        passwordHash: true,
        role: true,
        status: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      authFailuresTotal.inc({ reason: 'user_not_found' });
      throw new AppError('رقم الهاتف أو كلمة المرور غير صحيحة', 401, 'INVALID_CREDENTIALS');
    }

    if (user.status === UserStatus.SUSPENDED) {
      authFailuresTotal.inc({ reason: 'suspended' });
      throw new AppError('الحساب موقوف، تواصل مع الدعم الفني', 403, 'ACCOUNT_SUSPENDED');
    }

    const passwordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordValid) {
      authFailuresTotal.inc({ reason: 'wrong_password' });
      throw new AppError('رقم الهاتف أو كلمة المرور غير صحيحة', 401, 'INVALID_CREDENTIALS');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: meta.ip },
    });

    // Invalidate cached user
    await cache.del(`user:${user.id}`);

    const tokens = await tokenService.issueTokenPair(user.id, user.role, user.phone, {
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });

    await auditService.log({
      actorId: user.id,
      action: 'LOGIN',
      resource: 'User',
      resourceId: user.id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, tokens };
  },

  async logout(refreshToken: string, userId: string) {
    await tokenService.revokeToken(refreshToken);
    await cache.del(`user:${userId}`);

    await auditService.log({
      actorId: userId,
      action: 'LOGOUT',
      resource: 'User',
      resourceId: userId,
    });
  },

  async refresh(refreshToken: string, meta: { ip?: string; ua?: string } = {}) {
    const newPair = await tokenService.rotateRefreshToken(refreshToken, {
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });

    if (!newPair) {
      throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    return newPair;
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    meta: { ip?: string; ua?: string } = {},
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new AppError('كلمة المرور الحالية غير صحيحة', 400, 'WRONG_PASSWORD');

    const newHash = await bcrypt.hash(newPassword, config.hashRounds);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

    // Revoke all existing sessions
    await tokenService.revokeAllUserTokens(userId);

    await auditService.log({
      actorId: userId,
      action: 'UPDATE',
      resource: 'User',
      resourceId: userId,
      after: { action: 'password_changed' },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        bio: true,
        emailVerified: true,
        phoneVerified: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            enrollments: { where: { status: 'ACTIVE' } },
            certificates: { where: { status: 'ISSUED' } },
          },
        },
      },
    });

    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    return user;
  },
};
