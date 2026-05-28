import { Worker, Job } from 'bullmq';
import { createBullRedis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { fawryService } from '@/modules/payments/fawry/fawry.service';
import { logger } from '@/lib/logger';
import { PaymentStatus } from '@prisma/client';

const connection = createBullRedis();

export const fawryPollWorker = new Worker(
  'fawry-poll',
  async (job: Job) => {
    const { fawryRefNum, paymentId } = job.data;
    logger.info({ fawryRefNum, jobId: job.id }, 'Polling Fawry payment status');

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.status !== PaymentStatus.PENDING) {
      logger.info({ paymentId }, 'Fawry payment no longer pending, stopping poll');
      return;
    }

    // Check expiry
    if (payment.expiresAt && payment.expiresAt < new Date()) {
      await prisma.payment.update({ where: { id: paymentId }, data: { status: PaymentStatus.EXPIRED } });
      logger.info({ paymentId }, 'Fawry payment expired');
      return;
    }

    const status = await fawryService.getPaymentStatus(fawryRefNum);
    logger.info({ fawryRefNum, status: status.status }, 'Fawry poll result');

    if (status.status === 'PAID') {
      await fawryService.processConfirmedPayment(fawryRefNum, status);
    } else if (status.status === 'CANCELED' || status.status === 'EXPIRED') {
      await prisma.payment.update({ where: { id: paymentId }, data: { status: PaymentStatus.EXPIRED } });
    }
    // UNPAID = keep polling (job will be retried)
  },
  { connection, concurrency: 5 },
);

fawryPollWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Fawry poll job failed');
});
