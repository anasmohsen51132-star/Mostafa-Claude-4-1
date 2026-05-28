import { beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Use a separate test database
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://academy_user:testpassword@localhost:5432/academy_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-minimum-32-chars-ok';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32chars!';
process.env.COOKIE_SECRET = 'test-cookie-secret-16c';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-here';
process.env.LOG_LEVEL = 'error';

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Clean up test data between tests (order matters due to FK constraints)
beforeEach(async () => {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.lectureProgress.deleteMany(),
    prisma.quizAnswer.deleteMany(),
    prisma.quizAttempt.deleteMany(),
    prisma.homeworkAnswer.deleteMany(),
    prisma.homeworkSubmission.deleteMany(),
    prisma.accessCodeRedemption.deleteMany(),
    prisma.couponUsage.deleteMany(),
    prisma.paymentWebhookEvent.deleteMany(),
    prisma.refund.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.certificate.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.accessCode.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.homework.deleteMany(),
    prisma.quiz.deleteMany(),
    prisma.lecture.deleteMany(),
    prisma.section.deleteMany(),
    prisma.course.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

export { prisma };
