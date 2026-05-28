import { describe, it, expect, beforeEach } from 'vitest';
import { couponService } from '@/modules/coupons/coupons.service';
import { prisma, createUser, createCourse } from '../../factories';
import { CouponType } from '@prisma/client';

async function createTestCoupon(overrides: {
  code?: string;
  type?: CouponType;
  value?: number;
  usageLimit?: number;
  perUserLimit?: number;
  isGlobal?: boolean;
  expiresAt?: Date;
  courseIds?: string[];
} = {}) {
  return prisma.coupon.create({
    data: {
      code: overrides.code ?? `TEST-${Date.now()}`,
      type: overrides.type ?? CouponType.PERCENTAGE,
      value: overrides.value ?? 25,
      usageLimit: overrides.usageLimit ?? null,
      perUserLimit: overrides.perUserLimit ?? 1,
      isGlobal: overrides.isGlobal ?? true,
      status: 'ACTIVE',
      expiresAt: overrides.expiresAt,
    },
  });
}

describe('couponService', () => {
  describe('validate', () => {
    it('returns correct discount for percentage coupon', async () => {
      const user = await createUser({ phone: '01011111110' });
      const course = await createCourse({ price: 400 });
      await createTestCoupon({ code: 'SAVE25', type: CouponType.PERCENTAGE, value: 25 });

      const result = await couponService.validate({
        code: 'SAVE25',
        userId: user.id,
        courseId: course.id,
        amount: 400,
      });

      expect(result.discountAmount).toBe(100);   // 25% of 400
      expect(result.finalAmount).toBe(300);
    });

    it('returns correct discount for fixed coupon', async () => {
      const user = await createUser({ phone: '01011111111' });
      const course = await createCourse({ price: 500 });
      await createTestCoupon({ code: 'SAVE50', type: CouponType.FIXED_AMOUNT, value: 50 });

      const result = await couponService.validate({
        code: 'SAVE50',
        userId: user.id,
        courseId: course.id,
        amount: 500,
      });

      expect(result.discountAmount).toBe(50);
      expect(result.finalAmount).toBe(450);
    });

    it('caps fixed discount at order amount (never negative)', async () => {
      const user = await createUser({ phone: '01011111112' });
      const course = await createCourse({ price: 30 });
      await createTestCoupon({ code: 'BIG50', type: CouponType.FIXED_AMOUNT, value: 50 });

      const result = await couponService.validate({
        code: 'BIG50', userId: user.id, courseId: course.id, amount: 30,
      });

      expect(result.discountAmount).toBe(30);
      expect(result.finalAmount).toBe(0);
    });

    it('gives 100% discount for FREE_ACCESS coupon', async () => {
      const user = await createUser({ phone: '01011111113' });
      const course = await createCourse({ price: 299 });
      await createTestCoupon({ code: 'FREE100', type: CouponType.FREE_ACCESS, value: 100 });

      const result = await couponService.validate({
        code: 'FREE100', userId: user.id, courseId: course.id, amount: 299,
      });

      expect(result.discountAmount).toBe(299);
      expect(result.finalAmount).toBe(0);
    });

    it('rejects expired coupon', async () => {
      const user = await createUser({ phone: '01011111114' });
      const course = await createCourse({ price: 100 });
      const yesterday = new Date(Date.now() - 86400000);
      await createTestCoupon({ code: 'EXPIRED', expiresAt: yesterday });

      await expect(
        couponService.validate({ code: 'EXPIRED', userId: user.id, courseId: course.id, amount: 100 }),
      ).rejects.toMatchObject({ code: 'COUPON_EXPIRED' });
    });

    it('rejects depleted coupon', async () => {
      const user = await createUser({ phone: '01011111115' });
      const course = await createCourse({ price: 100 });
      const coupon = await createTestCoupon({ code: 'FULL', usageLimit: 1 });

      // Exhaust it
      await prisma.coupon.update({ where: { id: coupon.id }, data: { usageCount: 1 } });

      await expect(
        couponService.validate({ code: 'FULL', userId: user.id, courseId: course.id, amount: 100 }),
      ).rejects.toMatchObject({ code: 'COUPON_DEPLETED' });
    });

    it('rejects unknown coupon code', async () => {
      const user = await createUser({ phone: '01011111116' });
      const course = await createCourse({ price: 100 });

      await expect(
        couponService.validate({ code: 'DOESNOTEXIST', userId: user.id, courseId: course.id, amount: 100 }),
      ).rejects.toMatchObject({ code: 'INVALID_COUPON' });
    });

    it('respects per-user limit', async () => {
      const user = await createUser({ phone: '01011111117' });
      const course = await createCourse({ price: 200 });
      const coupon = await createTestCoupon({ code: 'ONCE', perUserLimit: 1 });

      // Record one usage
      await prisma.couponUsage.create({
        data: { couponId: coupon.id, userId: user.id, discount: 50 },
      });

      await expect(
        couponService.validate({ code: 'ONCE', userId: user.id, courseId: course.id, amount: 200 }),
      ).rejects.toMatchObject({ code: 'COUPON_ALREADY_USED' });
    });

    it('validates course-specific coupon correctly', async () => {
      const user = await createUser({ phone: '01011111118' });
      const targetCourse = await createCourse({ price: 300 });
      const otherCourse = await createCourse({ price: 300 });

      const coupon = await prisma.coupon.create({
        data: {
          code: 'SPECIFIC',
          type: CouponType.PERCENTAGE,
          value: 20,
          isGlobal: false,
          status: 'ACTIVE',
          courses: { create: { courseId: targetCourse.id } },
        },
      });

      // Valid for target course
      const valid = await couponService.validate({
        code: 'SPECIFIC', userId: user.id, courseId: targetCourse.id, amount: 300,
      });
      expect(valid.discountAmount).toBe(60);

      // Invalid for other course
      await expect(
        couponService.validate({ code: 'SPECIFIC', userId: user.id, courseId: otherCourse.id, amount: 300 }),
      ).rejects.toMatchObject({ code: 'COUPON_NOT_APPLICABLE' });
    });
  });

  describe('createCoupon', () => {
    it('creates a coupon with auto-generated code when none provided', async () => {
      const coupon = await couponService.createCoupon({
        type: CouponType.PERCENTAGE, value: 15,
        createdBy: 'admin-id',
      });

      expect(coupon.code).toBeTruthy();
      expect(coupon.code.length).toBeGreaterThan(4);
      expect(coupon.type).toBe('PERCENTAGE');
      expect(Number(coupon.value)).toBe(15);
    });

    it('rejects duplicate coupon code', async () => {
      await createTestCoupon({ code: 'DUPLICATE' });
      await expect(
        couponService.createCoupon({ code: 'DUPLICATE', type: CouponType.FIXED_AMOUNT, value: 50, createdBy: 'admin' }),
      ).rejects.toMatchObject({ code: 'COUPON_EXISTS' });
    });
  });

  describe('bulkCreate', () => {
    it('generates requested number of unique codes', async () => {
      const codes = await couponService.bulkCreate({
        count: 10,
        type: CouponType.FIXED_AMOUNT,
        value: 100,
        createdBy: 'admin-id',
      });

      expect(codes.length).toBe(10);
      // All codes are unique
      expect(new Set(codes).size).toBe(10);
    });

    it('caps bulk generation at 1000', async () => {
      const codes = await couponService.bulkCreate({
        count: 1500,
        type: CouponType.PERCENTAGE,
        value: 10,
        createdBy: 'admin-id',
      });
      expect(codes.length).toBe(1000);
    });
  });

  describe('generateCode', () => {
    it('generates 8-char alphanumeric codes without ambiguous chars', () => {
      const codes = Array.from({ length: 100 }, () => couponService.generateCode());
      for (const code of codes) {
        expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
        expect(code.length).toBe(8);
        // No ambiguous chars
        expect(code).not.toMatch(/[0OI1L]/);
      }
    });
  });
});
