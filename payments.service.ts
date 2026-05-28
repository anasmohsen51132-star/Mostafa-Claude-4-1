import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/lib/logger';
import { fawryService } from './fawry/fawry.service';
import { vodafoneService } from './vodafone/vodafone.service';
import { stripeService } from './stripe/stripe.service';
import { couponService } from '@/modules/coupons/coupons.service';
import { enrollmentService } from '@/modules/courses/enrollment.service';
import { invoiceService } from './invoice.service';
import { auditService } from '@/modules/admin/audit.service';
import { paymentsTotal } from '@/lib/metrics';
import { Decimal } from '@prisma/client/runtime/library';

export interface InitiatePaymentData {
  userId: string;
  courseId: string;
  provider: PaymentProvider;
  couponCode?: string;
  accessCode?: string;
}

export const paymentsService = {
  async initiatePayment(data: InitiatePaymentData, meta: { ip?: string; ua?: string } = {}) {
    // Verify course exists and is published
    const course = await prisma.course.findUnique({
      where: { id: data.courseId, status: 'PUBLISHED' },
    });
    if (!course) throw new AppError('الكورس غير متاح', 404, 'COURSE_NOT_FOUND');

    // Check not already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: data.userId, courseId: data.courseId } },
    });
    if (existing && existing.status === 'ACTIVE') {
      throw new AppError('أنت مسجل بالفعل في هذا الكورس', 409, 'ALREADY_ENROLLED');
    }

    // Check idempotency: pending payment for same user+course
    const pendingPayment = await prisma.payment.findFirst({
      where: {
        userId: data.userId,
        courseId: data.courseId,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        expiresAt: { gt: new Date() },
      },
    });
    if (pendingPayment) {
      throw new AppError(
        'يوجد طلب دفع معلق لهذا الكورس',
        409,
        'PENDING_PAYMENT_EXISTS',
        { paymentId: pendingPayment.id },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, name: true, phone: true, email: true },
    });
    if (!user) throw new AppError('المستخدم غير موجود', 404, 'USER_NOT_FOUND');

    let amount = Number(course.price);
    let discountAmount = 0;
    let couponId: string | undefined;
    let couponCode: string | undefined;

    // Apply coupon if provided
    if (data.couponCode) {
      const coupon = await couponService.validate({
        code: data.couponCode,
        userId: data.userId,
        courseId: data.courseId,
        amount,
      });
      discountAmount = coupon.discountAmount;
      amount = coupon.finalAmount;
      couponId = coupon.couponId;
      couponCode = data.couponCode;
    }

    // Handle access code (free after code validation)
    if (data.accessCode) {
      const codeResult = await paymentsService.validateAndRedeemAccessCode({
        code: data.accessCode,
        userId: data.userId,
        courseId: data.courseId,
      });

      if (codeResult.valid) {
        // Enroll for free via access code
        const enrollment = await enrollmentService.enroll({
          userId: data.userId,
          courseId: data.courseId,
          source: 'ACCESS_CODE',
        });

        await auditService.log({
          actorId: data.userId,
          action: 'ENROLL',
          resource: 'Enrollment',
          resourceId: enrollment.id,
          after: { source: 'access_code', code: data.accessCode },
          ipAddress: meta.ip,
        });

        return { type: 'access_code', enrollment };
      }
      throw new AppError('كود الوصول غير صحيح أو منتهي', 400, 'INVALID_ACCESS_CODE');
    }

    // Free course
    if (amount <= 0 || course.isFree) {
      const enrollment = await enrollmentService.enroll({
        userId: data.userId,
        courseId: data.courseId,
        source: 'FREE',
      });
      return { type: 'free', enrollment };
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: data.userId,
        courseId: data.courseId,
        amount: new Decimal(amount),
        currency: course.currency,
        provider: data.provider,
        status: PaymentStatus.PENDING,
        discountAmount: discountAmount > 0 ? new Decimal(discountAmount) : undefined,
        couponId,
        couponCode,
        description: course.title,
      },
    });

    paymentsTotal.inc({ provider: data.provider, status: 'initiated', currency: course.currency });

    // Route to provider
    switch (data.provider) {
      case PaymentProvider.FAWRY:
        return {
          type: 'fawry',
          paymentId: payment.id,
          ...(await fawryService.createPayment({
            paymentId: payment.id,
            userId: data.userId,
            courseId: data.courseId,
            amount,
            customerName: user.name,
            customerMobile: user.phone,
            customerEmail: user.email || undefined,
            courseTitle: course.title,
          })),
        };

      case PaymentProvider.VODAFONE_CASH:
        return {
          type: 'vodafone',
          paymentId: payment.id,
          ...(await vodafoneService.createPayment({
            paymentId: payment.id,
            userId: data.userId,
            courseId: data.courseId,
            amount,
            customerPhone: user.phone,
            customerName: user.name,
            courseTitle: course.title,
          })),
        };

      case PaymentProvider.STRIPE:
        return {
          type: 'stripe',
          paymentId: payment.id,
          ...(await stripeService.createPaymentIntent({
            paymentId: payment.id,
            amount,
            userId: data.userId,
            courseId: data.courseId,
            customerEmail: user.email || undefined,
            courseTitle: course.title,
            idempotencyKey: payment.idempotencyKey,
          })),
        };

      default:
        throw new AppError('طريقة الدفع غير مدعومة', 400, 'UNSUPPORTED_PROVIDER');
    }
  },

  async getPayment(paymentId: string, userId?: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: true,
        refunds: true,
      },
    });

    if (!payment) throw new AppError('Payment not found', 404, 'NOT_FOUND');
    if (userId && payment.userId !== userId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    return payment;
  },

  async getUserPayments(userId: string, page = 1, limit = 20) {
    const [payments, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where: { userId },
        include: { invoice: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where: { userId } }),
    ]);

    return { payments, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async validateAndRedeemAccessCode(data: {
    code: string;
    userId: string;
    courseId: string;
  }): Promise<{ valid: boolean; accessCodeId?: string }> {
    const codeHash = require('crypto')
      .createHash('sha256')
      .update(data.code.toUpperCase())
      .digest('hex');

    const accessCode = await prisma.accessCode.findFirst({
      where: {
        codeHash,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        AND: [
          { OR: [{ courseId: null }, { courseId: data.courseId }] },
        ],
      },
    });

    if (!accessCode) return { valid: false };
    if (accessCode.usageCount >= accessCode.usageLimit) return { valid: false };

    // Check user hasn't used it
    const alreadyRedeemed = await prisma.accessCodeRedemption.findUnique({
      where: { accessCodeId_userId: { accessCodeId: accessCode.id, userId: data.userId } },
    });
    if (alreadyRedeemed) return { valid: false };

    // Redeem
    await prisma.$transaction([
      prisma.accessCode.update({
        where: { id: accessCode.id },
        data: { usageCount: { increment: 1 } },
      }),
      prisma.accessCodeRedemption.create({
        data: {
          accessCodeId: accessCode.id,
          userId: data.userId,
          courseId: data.courseId,
        },
      }),
    ]);

    return { valid: true, accessCodeId: accessCode.id };
  },

  async pollFawryStatus(paymentId: string, userId: string) {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, userId, provider: PaymentProvider.FAWRY },
    });

    if (!payment || !payment.fawryReferenceNumber) {
      throw new AppError('Payment not found', 404, 'NOT_FOUND');
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return { status: 'COMPLETED', enrolled: true };
    }

    const fawryStatus = await fawryService.getPaymentStatus(payment.fawryReferenceNumber);

    if (fawryStatus.status === 'PAID') {
      await fawryService.processConfirmedPayment(payment.fawryReferenceNumber, fawryStatus);
      return { status: 'COMPLETED', enrolled: true };
    }

    if (fawryStatus.status === 'CANCELED' || fawryStatus.status === 'EXPIRED') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.EXPIRED },
      });
      return { status: fawryStatus.status, enrolled: false };
    }

    return { status: fawryStatus.status, enrolled: false };
  },
};
