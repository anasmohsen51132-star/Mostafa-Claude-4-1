import crypto from 'crypto';
import { CouponStatus, CouponType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/lib/logger';

export const couponService = {
  async validate(data: {
    code: string;
    userId: string;
    courseId: string;
    amount: number;
  }): Promise<{ couponId: string; discountAmount: number; finalAmount: number }> {
    const coupon = await prisma.coupon.findUnique({
      where: { code: data.code.toUpperCase() },
      include: {
        courses: { where: { courseId: data.courseId } },
        usages: { where: { userId: data.userId } },
      },
    });

    if (!coupon) {
      throw new AppError('كود الخصم غير صحيح', 400, 'INVALID_COUPON');
    }

    if (coupon.status !== CouponStatus.ACTIVE) {
      throw new AppError('كود الخصم غير نشط', 400, 'COUPON_INACTIVE');
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new AppError('كود الخصم منتهي الصلاحية', 400, 'COUPON_EXPIRED');
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      throw new AppError('تم استنفاد كود الخصم', 400, 'COUPON_DEPLETED');
    }

    // Check course applicability
    if (!coupon.isGlobal && coupon.courses.length === 0) {
      throw new AppError('كود الخصم لا ينطبق على هذا الكورس', 400, 'COUPON_NOT_APPLICABLE');
    }

    // Check per-user limit
    if (coupon.usages.length >= coupon.perUserLimit) {
      throw new AppError('لقد استخدمت هذا الكود من قبل', 400, 'COUPON_ALREADY_USED');
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && data.amount < Number(coupon.minOrderAmount)) {
      throw new AppError(
        `الحد الأدنى للطلب ${coupon.minOrderAmount} جنيه`,
        400,
        'COUPON_MIN_AMOUNT',
      );
    }

    // Calculate discount
    let discountAmount = 0;

    if (coupon.type === CouponType.PERCENTAGE) {
      discountAmount = (data.amount * Number(coupon.value)) / 100;
      if (coupon.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
      }
    } else if (coupon.type === CouponType.FIXED_AMOUNT) {
      discountAmount = Math.min(Number(coupon.value), data.amount);
    } else if (coupon.type === CouponType.FREE_ACCESS) {
      discountAmount = data.amount;
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    const finalAmount = Math.max(0, data.amount - discountAmount);

    return { couponId: coupon.id, discountAmount, finalAmount };
  },

  async recordUsage(data: {
    couponId: string;
    userId: string;
    paymentId: string;
    courseId: string;
    discount: number;
  }) {
    await prisma.$transaction([
      prisma.couponUsage.create({
        data: {
          couponId: data.couponId,
          userId: data.userId,
          paymentId: data.paymentId,
          courseId: data.courseId,
          discount: data.discount,
        },
      }),
      prisma.coupon.update({
        where: { id: data.couponId },
        data: { usageCount: { increment: 1 } },
      }),
    ]);
  },

  async createCoupon(data: {
    code?: string;
    type: CouponType;
    value: number;
    usageLimit?: number;
    perUserLimit?: number;
    startsAt?: Date;
    expiresAt?: Date;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    isGlobal?: boolean;
    courseIds?: string[];
    description?: string;
    createdBy: string;
  }) {
    const code = (data.code || couponService.generateCode()).toUpperCase();

    // Check uniqueness
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) throw new AppError('كود الخصم موجود بالفعل', 409, 'COUPON_EXISTS');

    const coupon = await prisma.coupon.create({
      data: {
        code,
        type: data.type,
        value: data.value,
        usageLimit: data.usageLimit,
        perUserLimit: data.perUserLimit ?? 1,
        startsAt: data.startsAt ?? new Date(),
        expiresAt: data.expiresAt,
        minOrderAmount: data.minOrderAmount,
        maxDiscountAmount: data.maxDiscountAmount,
        isGlobal: data.isGlobal ?? true,
        description: data.description,
        createdBy: data.createdBy,
        courses: data.courseIds?.length
          ? { create: data.courseIds.map((courseId) => ({ courseId })) }
          : undefined,
      },
      include: { courses: true },
    });

    return coupon;
  },

  async bulkCreate(data: {
    count: number;
    type: CouponType;
    value: number;
    prefix?: string;
    usageLimit?: number;
    expiresAt?: Date;
    courseIds?: string[];
    createdBy: string;
  }): Promise<string[]> {
    const codes: string[] = [];

    for (let i = 0; i < Math.min(data.count, 1000); i++) {
      const code = `${data.prefix || 'MA'}-${couponService.generateCode()}`;
      codes.push(code.toUpperCase());
    }

    // Batch insert
    await prisma.coupon.createMany({
      data: codes.map((code) => ({
        code,
        type: data.type,
        value: data.value,
        usageLimit: data.usageLimit ?? 1,
        perUserLimit: 1,
        expiresAt: data.expiresAt,
        isGlobal: !data.courseIds?.length,
        createdBy: data.createdBy,
      })),
      skipDuplicates: true,
    });

    // Link to courses if specified
    if (data.courseIds?.length) {
      const created = await prisma.coupon.findMany({
        where: { code: { in: codes } },
        select: { id: true },
      });
      await prisma.courseOnCoupon.createMany({
        data: created.flatMap((c) =>
          (data.courseIds || []).map((courseId) => ({ couponId: c.id, courseId })),
        ),
        skipDuplicates: true,
      });
    }

    return codes;
  },

  generateCode(length = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Remove ambiguous chars
    let result = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
  },

  async listCoupons(params: {
    page?: number;
    limit?: number;
    status?: CouponStatus;
    search?: string;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { code: { contains: params.search.toUpperCase() } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [coupons, total] = await prisma.$transaction([
      prisma.coupon.findMany({
        where,
        include: { _count: { select: { usages: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.coupon.count({ where }),
    ]);

    return { coupons, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async deactivateCoupon(couponId: string) {
    return prisma.coupon.update({
      where: { id: couponId },
      data: { status: CouponStatus.DISABLED },
    });
  },
};
