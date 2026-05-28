import { Prisma, PrismaClient, PaymentStatus, EnrollmentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { withLock } from '@/lib/db/cache';
import { logger } from '@/lib/logger';
import { AppError } from '@/middleware/errorHandler';
import { Decimal } from '@prisma/client/runtime/library';

// ── Enrollment Atomic Transaction ─────────────────────────────────
// Prevents double-enrollment race conditions using distributed lock
export async function atomicEnroll(params: {
  userId: string;
  courseId: string;
  paymentId?: string;
  source: string;
}): Promise<{ enrollmentId: string; created: boolean }> {
  const lockKey = `enroll:${params.userId}:${params.courseId}`;

  return withLock(lockKey, async () => {
    return prisma.$transaction(async (tx) => {
      // Re-check inside transaction (double-check locking pattern)
      const existing = await tx.enrollment.findUnique({
        where: { userId_courseId: { userId: params.userId, courseId: params.courseId } },
        select: { id: true, status: true },
      });

      if (existing?.status === EnrollmentStatus.ACTIVE) {
        return { enrollmentId: existing.id, created: false };
      }

      const enrollment = await tx.enrollment.upsert({
        where: { userId_courseId: { userId: params.userId, courseId: params.courseId } },
        create: {
          userId: params.userId,
          courseId: params.courseId,
          paymentId: params.paymentId,
          status: EnrollmentStatus.ACTIVE,
          source: params.source,
        },
        update: {
          status: EnrollmentStatus.ACTIVE,
          paymentId: params.paymentId ?? undefined,
        },
        select: { id: true },
      });

      // Update course student count atomically
      await tx.course.update({
        where: { id: params.courseId },
        data: { totalStudents: { increment: 1 } },
      });

      logger.info({ userId: params.userId, courseId: params.courseId, enrollmentId: enrollment.id }, 'Enrollment created atomically');

      return { enrollmentId: enrollment.id, created: true };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 10_000,
    });
  }, 15);
}

// ── Coupon Atomic Redemption ──────────────────────────────────────
// Uses optimistic locking + distributed lock to prevent over-redemption
export async function atomicRedeemCoupon(params: {
  couponId: string;
  userId: string;
  paymentId: string;
  courseId: string;
  discountAmount: number;
}): Promise<void> {
  const lockKey = `coupon:${params.couponId}:${params.userId}`;

  await withLock(lockKey, async () => {
    await prisma.$transaction(async (tx) => {
      // Lock the coupon row for update
      const coupon = await tx.$queryRaw<Array<{
        id: string; usage_count: number; usage_limit: number | null;
        per_user_limit: number; status: string;
      }>>`
        SELECT id, usage_count, usage_limit, per_user_limit, status
        FROM coupons
        WHERE id = ${params.couponId}
        FOR UPDATE NOWAIT
      `;

      if (!coupon.length) throw new AppError('Coupon not found', 404, 'NOT_FOUND');
      const c = coupon[0];

      if (c.status !== 'ACTIVE') throw new AppError('Coupon no longer active', 400, 'COUPON_INACTIVE');
      if (c.usage_limit !== null && c.usage_count >= c.usage_limit) {
        throw new AppError('Coupon fully redeemed', 400, 'COUPON_DEPLETED');
      }

      // Check user's usage count
      const userUsageCount = await tx.couponUsage.count({
        where: { couponId: params.couponId, userId: params.userId },
      });
      if (userUsageCount >= c.per_user_limit) {
        throw new AppError('Coupon already used', 400, 'COUPON_ALREADY_USED');
      }

      // Atomic increment + usage record
      await tx.coupon.update({
        where: { id: params.couponId },
        data: { usageCount: { increment: 1 } },
      });

      await tx.couponUsage.create({
        data: {
          couponId: params.couponId,
          userId: params.userId,
          paymentId: params.paymentId,
          courseId: params.courseId,
          discount: new Decimal(params.discountAmount),
        },
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 8_000,
    });
  }, 10);
}

// ── Access Code Atomic Redemption ─────────────────────────────────
export async function atomicRedeemAccessCode(params: {
  codeHash: string;
  userId: string;
  courseId: string;
  ipAddress?: string;
}): Promise<{ accessCodeId: string; courseId: string }> {
  const lockKey = `access-code:${params.codeHash}`;

  return withLock(lockKey, async () => {
    return prisma.$transaction(async (tx) => {
      const code = await tx.$queryRaw<Array<{
        id: string; course_id: string | null; usage_count: number;
        usage_limit: number; is_active: boolean; expires_at: Date | null;
      }>>`
        SELECT id, course_id, usage_count, usage_limit, is_active, expires_at
        FROM access_codes
        WHERE code_hash = ${params.codeHash}
        FOR UPDATE NOWAIT
      `;

      if (!code.length) throw new AppError('Invalid access code', 400, 'INVALID_CODE');
      const c = code[0];

      if (!c.is_active) throw new AppError('Access code is inactive', 400, 'CODE_INACTIVE');
      if (c.expires_at && c.expires_at < new Date()) throw new AppError('Access code expired', 400, 'CODE_EXPIRED');
      if (c.usage_count >= c.usage_limit) throw new AppError('Access code depleted', 400, 'CODE_DEPLETED');

      // Check if user already redeemed
      const alreadyRedeemed = await tx.accessCodeRedemption.findUnique({
        where: { accessCodeId_userId: { accessCodeId: c.id, userId: params.userId } },
      });
      if (alreadyRedeemed) throw new AppError('Code already redeemed by this account', 400, 'ALREADY_REDEEMED');

      const targetCourseId = c.course_id || params.courseId;
      if (!targetCourseId) throw new AppError('Course required', 400, 'COURSE_REQUIRED');

      await tx.accessCode.update({
        where: { id: c.id },
        data: { usageCount: { increment: 1 } },
      });

      await tx.accessCodeRedemption.create({
        data: {
          accessCodeId: c.id,
          userId: params.userId,
          courseId: targetCourseId,
          ipAddress: params.ipAddress,
        },
      });

      return { accessCodeId: c.id, courseId: targetCourseId };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 8_000,
    });
  }, 10);
}

// ── Payment Idempotency Guard ─────────────────────────────────────
// Ensures no double-payment for same user+course combination
export async function guardPaymentIdempotency(params: {
  userId: string;
  courseId: string;
  provider: string;
  idempotencyKey?: string;
}): Promise<{ blocked: boolean; existingPaymentId?: string }> {
  const lockKey = `payment-init:${params.userId}:${params.courseId}`;

  return withLock(lockKey, async () => {
    // Check for active enrollment
    const enrolled = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: params.userId, courseId: params.courseId } },
      select: { id: true, status: true },
    });
    if (enrolled?.status === 'ACTIVE') {
      throw new AppError('Already enrolled in this course', 409, 'ALREADY_ENROLLED');
    }

    // Check for non-expired pending payment
    const pendingPayment = await prisma.payment.findFirst({
      where: {
        userId: params.userId,
        courseId: params.courseId,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (pendingPayment) {
      return { blocked: true, existingPaymentId: pendingPayment.id };
    }

    return { blocked: false };
  }, 10);
}

// ── Payment Complete Atomic ────────────────────────────────────────
// Atomically marks payment complete + triggers enrollment
export async function atomicCompletePayment(params: {
  paymentId: string;
  providerRawData?: any;
  paidAt?: Date;
}): Promise<{ alreadyProcessed: boolean; enrollmentId?: string }> {
  const lockKey = `payment-complete:${params.paymentId}`;

  return withLock(lockKey, async () => {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.$queryRaw<Array<{
        id: string; user_id: string; course_id: string | null;
        status: string; amount: number; coupon_id: string | null;
        coupon_code: string | null; discount_amount: number | null;
      }>>`
        SELECT id, user_id, course_id, status, amount, coupon_id, coupon_code, discount_amount
        FROM payments
        WHERE id = ${params.paymentId}
        FOR UPDATE NOWAIT
      `;

      if (!payment.length) throw new AppError('Payment not found', 404, 'NOT_FOUND');
      const p = payment[0];

      if (p.status === 'COMPLETED') {
        return { alreadyProcessed: true };
      }

      if (!['PENDING', 'PROCESSING'].includes(p.status)) {
        throw new AppError(`Cannot complete payment in status: ${p.status}`, 400, 'INVALID_STATUS');
      }

      // Mark payment complete
      await tx.payment.update({
        where: { id: params.paymentId },
        data: {
          status: PaymentStatus.COMPLETED,
          paidAt: params.paidAt ?? new Date(),
          providerRawData: params.providerRawData,
        },
      });

      // Enroll student if courseId present
      let enrollmentId: string | undefined;
      if (p.course_id) {
        const existing = await tx.enrollment.findUnique({
          where: { userId_courseId: { userId: p.user_id, courseId: p.course_id } },
          select: { id: true, status: true },
        });

        if (existing?.status !== 'ACTIVE') {
          const enrollment = await tx.enrollment.upsert({
            where: { userId_courseId: { userId: p.user_id, courseId: p.course_id } },
            create: {
              userId: p.user_id,
              courseId: p.course_id,
              paymentId: params.paymentId,
              status: EnrollmentStatus.ACTIVE,
              source: 'payment',
            },
            update: { status: EnrollmentStatus.ACTIVE },
            select: { id: true },
          });

          await tx.course.update({
            where: { id: p.course_id },
            data: { totalStudents: { increment: 1 } },
          });

          enrollmentId = enrollment.id;
        } else {
          enrollmentId = existing.id;
        }
      }

      logger.info({ paymentId: params.paymentId, enrollmentId }, 'Payment completed atomically');
      return { alreadyProcessed: false, enrollmentId };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 15_000,
    });
  }, 20);
}

// ── Transaction Retry Helper ──────────────────────────────────────
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; delayMs?: number; backoff?: boolean } = {},
): Promise<T> {
  const { maxAttempts = 3, delayMs = 100, backoff = true } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isDeadlock = err?.code === 'P2034' || err?.message?.includes('deadlock') || err?.message?.includes('could not serialize');
      const isLockTimeout = err?.message?.includes('NOWAIT') || err?.message?.includes('lock timeout');

      if ((isDeadlock || isLockTimeout) && attempt < maxAttempts) {
        const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
        const jitter = Math.random() * 50;
        logger.warn({ attempt, maxAttempts, delay, err: err.message }, 'Transaction conflict, retrying');
        await new Promise((r) => setTimeout(r, delay + jitter));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retry attempts reached');
}

// ── DB-Level Fraud Protection ─────────────────────────────────────
export async function checkPaymentFraudSignals(params: {
  userId: string;
  ipAddress?: string;
  amount: number;
}): Promise<{ suspicious: boolean; reason?: string }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Check: too many payments in last hour
  const recentPayments = await prisma.payment.count({
    where: {
      userId: params.userId,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentPayments >= 10) {
    return { suspicious: true, reason: 'too_many_payments_per_hour' };
  }

  // Check: large amount combined
  const recentTotal = await prisma.payment.aggregate({
    where: {
      userId: params.userId,
      status: { in: ['PENDING', 'COMPLETED'] },
      createdAt: { gte: oneHourAgo },
    },
    _sum: { amount: true },
  });

  const totalAmount = Number(recentTotal._sum.amount || 0) + params.amount;
  if (totalAmount > 10_000) {
    return { suspicious: true, reason: 'high_value_velocity' };
  }

  return { suspicious: false };
}
