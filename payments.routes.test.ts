import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '@/index';
import { prisma, createUser, createCourse, createPayment, getAuthToken } from '../../factories';
import { config } from '@/config/env';

describe('Payments Routes — /api/v1/payments', () => {
  describe('POST / — initiate payment', () => {
    it('201 — creates Fawry pending payment', async () => {
      // Mock Fawry API call so tests don't hit real API
      vi.stubGlobal('fetch', async (url: string) => {
        if (String(url).includes('fawry')) {
          return {
            ok: true,
            json: async () => ({ statusCode: 200, referenceNumber: 'FW999888777', type: 'ChargeResponse' }),
          };
        }
        throw new Error('Unexpected fetch');
      });

      const user = await createUser({ phone: '01081111111' });
      const course = await createCourse({ price: 299, status: 'PUBLISHED' });
      const token = await getAuthToken(user);

      // Temporarily configure Fawry for test
      (config.fawry as Record<string, unknown>).merchantCode = 'TEST_MC';
      (config.fawry as Record<string, unknown>).securityKey = 'TEST_SK';

      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: course.id, provider: 'FAWRY' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('fawry');
      expect(res.body.data.paymentId).toBeTruthy();
      expect(res.body.data.referenceNumber).toBeTruthy();

      vi.unstubAllGlobals();
    });

    it('409 — rejects payment when already enrolled', async () => {
      const user = await createUser({ phone: '01081111112' });
      const course = await createCourse({ price: 299, status: 'PUBLISHED' });
      const token = await getAuthToken(user);

      // Create existing enrollment
      await prisma.enrollment.create({
        data: { userId: user.id, courseId: course.id, status: 'ACTIVE', source: 'test' },
      });

      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: course.id, provider: 'FAWRY' })
        .expect(409);

      expect(res.body.error.code).toBe('ALREADY_ENROLLED');
    });

    it('404 — rejects payment for unpublished course', async () => {
      const user = await createUser({ phone: '01081111113' });
      const course = await createCourse({ price: 299, status: 'DRAFT' });
      const token = await getAuthToken(user);

      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: course.id, provider: 'FAWRY' })
        .expect(404);

      expect(res.body.error.code).toBe('COURSE_NOT_FOUND');
    });

    it('400 — rejects unsupported payment provider', async () => {
      const user = await createUser({ phone: '01081111114' });
      const course = await createCourse({ price: 299, status: 'PUBLISHED' });
      const token = await getAuthToken(user);

      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: course.id, provider: 'PAYPAL' })
        .expect(422);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('401 — rejects unauthenticated payment request', async () => {
      const course = await createCourse({ price: 299, status: 'PUBLISHED' });

      await request(app)
        .post('/api/v1/payments')
        .send({ courseId: course.id, provider: 'FAWRY' })
        .expect(401);
    });

    it('free course creates enrollment without payment', async () => {
      const user = await createUser({ phone: '01081111115' });
      const course = await createCourse({ price: 0, isFree: true, status: 'PUBLISHED' });
      const token = await getAuthToken(user);

      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: course.id, provider: 'FAWRY' })
        .expect(201);

      expect(res.body.data.type).toBe('free');

      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
      });
      expect(enrollment!.status).toBe('ACTIVE');
    });

    it('applies valid coupon and reduces amount', async () => {
      const user = await createUser({ phone: '01081111116' });
      const course = await createCourse({ price: 400, status: 'PUBLISHED' });
      const token = await getAuthToken(user);

      await prisma.coupon.create({
        data: { code: 'TESTCOUPON25', type: 'PERCENTAGE', value: 25, isGlobal: true, status: 'ACTIVE' },
      });

      vi.stubGlobal('fetch', async () => ({
        ok: true,
        json: async () => ({ statusCode: 200, referenceNumber: 'FW_COUPON_001', type: 'ChargeResponse' }),
      }));
      (config.fawry as Record<string, unknown>).merchantCode = 'TEST_MC';
      (config.fawry as Record<string, unknown>).securityKey = 'TEST_SK';

      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: course.id, provider: 'FAWRY', couponCode: 'TESTCOUPON25' })
        .expect(201);

      // Payment should be created with discounted amount
      const payment = await prisma.payment.findUnique({ where: { id: res.body.data.paymentId } });
      expect(Number(payment!.amount)).toBe(300); // 400 - 25%
      expect(Number(payment!.discountAmount)).toBe(100);

      vi.unstubAllGlobals();
    });
  });

  describe('GET /my — user payment history', () => {
    it('200 — returns paginated payment list', async () => {
      const user = await createUser({ phone: '01081222221' });
      const course = await createCourse({ price: 299, status: 'PUBLISHED' });
      const token = await getAuthToken(user);

      await createPayment(user.id, course.id, { status: 'COMPLETED' });
      await createPayment(user.id, course.id, { status: 'PENDING' });

      const res = await request(app)
        .get('/api/v1/payments/my')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.total).toBeGreaterThanOrEqual(2);
      expect(res.body.data.payments).toBeDefined();
    });

    it('401 — rejects unauthenticated request', async () => {
      await request(app).get('/api/v1/payments/my').expect(401);
    });
  });

  describe('GET /:id/fawry-status — poll Fawry status', () => {
    it('200 — returns current Fawry payment status', async () => {
      vi.stubGlobal('fetch', async () => ({
        ok: true,
        json: async () => ({ paymentStatus: 'UNPAID', orderAmount: 299 }),
      }));
      (config.fawry as Record<string, unknown>).merchantCode = 'TEST_MC';
      (config.fawry as Record<string, unknown>).securityKey = 'TEST_SK';

      const user = await createUser({ phone: '01081333331' });
      const course = await createCourse({ price: 299, status: 'PUBLISHED' });
      const payment = await createPayment(user.id, course.id, { provider: 'FAWRY', status: 'PENDING' });
      const token = await getAuthToken(user);

      await prisma.payment.update({
        where: { id: payment.id },
        data: { fawryReferenceNumber: 'FW_POLL_001', expiresAt: new Date(Date.now() + 86400000) },
      });

      const res = await request(app)
        .get(`/api/v1/payments/${payment.id}/fawry-status`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.status).toBe('UNPAID');
      vi.unstubAllGlobals();
    });

    it('403 — cannot poll another user payment', async () => {
      const user1 = await createUser({ phone: '01081333332' });
      const user2 = await createUser({ phone: '01081333333' });
      const course = await createCourse({ price: 299, status: 'PUBLISHED' });
      const payment = await createPayment(user1.id, course.id, { provider: 'FAWRY' });
      const token2 = await getAuthToken(user2);

      const res = await request(app)
        .get(`/api/v1/payments/${payment.id}/fawry-status`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404);

      // Should not reveal the payment exists
      expect(res.body.success).toBe(false);
    });
  });
});

describe('Webhooks — /webhooks', () => {
  describe('POST /fawry', () => {
    it('200 — processes valid Fawry PAID webhook', async () => {
      const user = await createUser({ phone: '01085555551' });
      const course = await createCourse({ price: 299, status: 'PUBLISHED' });
      const payment = await createPayment(user.id, course.id, { provider: 'FAWRY', status: 'PENDING' });

      await prisma.payment.update({
        where: { id: payment.id },
        data: { fawryReferenceNumber: 'FW_WEBHOOK_001' },
      });

      (config.fawry as Record<string, unknown>).securityKey = 'WEBHOOK_TEST_KEY';

      const paymentAmount = 299.00;
      const orderAmount = 299.00;
      const paymentStatus = 'PAID';
      const paymentMethod = 'CASH';
      const fawryRefNum = 'FW_WEBHOOK_001';
      const merchantRefNum = 'MA_TEST_001';

      const sigString = [fawryRefNum, merchantRefNum, paymentAmount.toFixed(2), orderAmount.toFixed(2),
        paymentStatus, paymentMethod, paymentStatus, 'WEBHOOK_TEST_KEY'].join('');
      const signature = crypto.createHash('sha256').update(sigString).digest('hex');

      const res = await request(app)
        .post('/webhooks/fawry')
        .send({ fawryRefNum, merchantRefNum, paymentAmount, orderAmount, paymentStatus, paymentMethod, signature })
        .expect(200);

      expect(res.body.status).toBe('ok');

      // Payment should be completed
      const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
      expect(updatedPayment!.status).toBe('COMPLETED');

      // Enrollment should exist
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
      });
      expect(enrollment!.status).toBe('ACTIVE');
    });

    it('401 — rejects invalid Fawry signature', async () => {
      (config.fawry as Record<string, unknown>).securityKey = 'REAL_KEY';

      const res = await request(app)
        .post('/webhooks/fawry')
        .send({
          fawryRefNum: 'FW_FAKE', merchantRefNum: 'MA_FAKE',
          paymentAmount: 299, orderAmount: 299,
          paymentStatus: 'PAID', paymentMethod: 'CASH',
          signature: 'fakesignaturethatiswrong'.padEnd(64, '0'),
        })
        .expect(401);

      expect(res.body.error).toBe('Invalid signature');
    });

    it('200 — ignores duplicate webhook (idempotency)', async () => {
      const user = await createUser({ phone: '01085555552' });
      const course = await createCourse({ price: 299, status: 'PUBLISHED' });
      const payment = await createPayment(user.id, course.id, { provider: 'FAWRY', status: 'COMPLETED' });

      await prisma.payment.update({
        where: { id: payment.id },
        data: { fawryReferenceNumber: 'FW_WEBHOOK_DUP', status: 'COMPLETED' },
      });

      (config.fawry as Record<string, unknown>).securityKey = 'DUP_KEY';
      const fawryRefNum = 'FW_WEBHOOK_DUP';
      const merchantRefNum = 'MA_DUP';
      const paymentAmount = 299.0;
      const orderAmount = 299.0;
      const paymentStatus = 'PAID';
      const paymentMethod = 'CASH';

      const sigStr = [fawryRefNum, merchantRefNum, paymentAmount.toFixed(2), orderAmount.toFixed(2),
        paymentStatus, paymentMethod, paymentStatus, 'DUP_KEY'].join('');
      const signature = crypto.createHash('sha256').update(sigStr).digest('hex');

      // First call
      await request(app).post('/webhooks/fawry')
        .send({ fawryRefNum, merchantRefNum, paymentAmount, orderAmount, paymentStatus, paymentMethod, signature })
        .expect(200);

      // Second call (duplicate)
      const res = await request(app).post('/webhooks/fawry')
        .send({ fawryRefNum, merchantRefNum, paymentAmount, orderAmount, paymentStatus, paymentMethod, signature })
        .expect(200);

      expect(res.body.status).toBe('ok');

      // No duplicate webhook event records
      const events = await prisma.paymentWebhookEvent.findMany({
        where: { eventId: { contains: 'FW_WEBHOOK_DUP' } },
      });
      expect(events.length).toBe(1);
    });
  });
});
