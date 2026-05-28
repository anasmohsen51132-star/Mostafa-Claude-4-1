import { Worker, Job, Queue } from 'bullmq';
import { createBullRedis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { fawryService } from '@/modules/payments/fawry/fawry.service';
import { atomicCompletePayment } from '@/lib/db/transactions';
import { notificationService } from '@/modules/notifications/notifications.service';
import { invoiceService } from '@/modules/payments/invoice.service';
import { logger } from '@/lib/logger';
import { config } from '@/config/env';

const connection = createBullRedis();

export const paymentRetryQueue = new Queue('payment-retry', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 60_000 }, // start at 1 min
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  },
});

export const paymentRetryWorker = new Worker(
  'payment-retry',
  async (job: Job) => {
    const { paymentId, type } = job.data;

    logger.info({ paymentId, type, jobId: job.id, attempt: job.attemptsMade }, 'Payment retry job started');

    switch (type) {
      case 'fawry-poll': {
        const payment = await prisma.payment.findUnique({
          where: { id: paymentId },
          select: { id: true, status: true, fawryReferenceNumber: true, expiresAt: true },
        });

        if (!payment) { logger.warn({ paymentId }, 'Payment not found in retry'); return; }
        if (payment.status !== 'PENDING') { logger.info({ paymentId, status: payment.status }, 'Payment no longer pending, skipping'); return; }
        if (payment.expiresAt && payment.expiresAt < new Date()) {
          await prisma.payment.update({ where: { id: paymentId }, data: { status: 'EXPIRED' } });
          return;
        }

        if (!payment.fawryReferenceNumber) return;

        const status = await fawryService.getPaymentStatus(payment.fawryReferenceNumber);
        if (status.status === 'PAID') {
          const result = await atomicCompletePayment({ paymentId, providerRawData: status });
          if (!result.alreadyProcessed && result.enrollmentId) {
            await invoiceService.generate(paymentId);
            const p = await prisma.payment.findUnique({ where: { id: paymentId }, select: { userId: true, courseId: true, amount: true } });
            if (p?.courseId) {
              await notificationService.sendPaymentSuccess({
                userId: p.userId,
                paymentId,
                amount: Number(p.amount),
                courseId: p.courseId,
              });
            }
          }
        } else if (status.status === 'CANCELED' || status.status === 'EXPIRED') {
          await prisma.payment.update({ where: { id: paymentId }, data: { status: 'EXPIRED' } });
        }
        break;
      }

      case 'stripe-retry': {
        // Stripe retries are handled by Stripe's own retry logic
        // This handles our internal state sync
        const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
        if (!payment || payment.status !== 'FAILED') return;

        await prisma.payment.update({
          where: { id: paymentId },
          data: { retryCount: { increment: 1 }, nextRetryAt: new Date(Date.now() + 60_000 * Math.pow(2, job.attemptsMade)) },
        });
        break;
      }

      case 'expire-stale': {
        // Batch expire old PENDING payments
        const expiredCount = await prisma.payment.updateMany({
          where: {
            status: 'PENDING',
            expiresAt: { lt: new Date() },
          },
          data: { status: 'EXPIRED' },
        });
        logger.info({ count: expiredCount.count }, 'Expired stale payments');
        break;
      }

      default:
        logger.warn({ type }, 'Unknown payment retry job type');
    }
  },
  { connection, concurrency: config.bull.concurrency },
);

paymentRetryWorker.on('completed', (job) => {
  logger.debug({ jobId: job.id, type: job.data.type }, 'Payment retry job completed');
});

paymentRetryWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, paymentId: job?.data.paymentId, err: err.message }, 'Payment retry job failed');
});

// Schedule stale payment cleanup every hour
export async function schedulePaymentMaintenance() {
  await paymentRetryQueue.add('expire-stale', { type: 'expire-stale' }, {
    repeat: { pattern: '0 * * * *' }, // hourly
    jobId: 'expire-stale-recurring',
  });
  logger.info('Payment maintenance scheduled');
}
