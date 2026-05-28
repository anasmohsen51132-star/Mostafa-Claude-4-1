import { Queue, Worker, Job } from 'bullmq';
import { createBullRedis } from '@/lib/redis';
import { certificatesService } from '@/modules/certificates/certificates.service';
import { logger } from '@/lib/logger';
import { config } from '@/config/env';

const connection = createBullRedis();

export const certificateQueue = new Queue('certificates', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

export const certificateWorker = new Worker(
  'certificates',
  async (job: Job) => {
    const { enrollmentId, certificateId } = job.data;

    if (job.name === 'generate') {
      logger.info({ enrollmentId, jobId: job.id }, 'Processing certificate generation');
      await certificatesService.generate(enrollmentId);
    }

    if (job.name === 'generate-pdf') {
      // PDF generation would be implemented with puppeteer or similar
      // For now, mark as ready
      logger.info({ certificateId, jobId: job.id }, 'Certificate PDF generation queued');
    }
  },
  {
    connection,
    concurrency: config.bull.concurrency,
  },
);

certificateWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, name: job.name }, 'Certificate job completed');
});

certificateWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Certificate job failed');
});
