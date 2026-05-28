import { logger } from '@/lib/logger';
import { certificateWorker } from '@/queues/processors/certificate.processor';
import { emailWorker } from '@/queues/processors/email.processor';
import { fawryPollWorker } from '@/queues/processors/fawry-poll.processor';

export async function startWorkers() {
  const workers = [certificateWorker, emailWorker, fawryPollWorker];

  for (const worker of workers) {
    await worker.waitUntilReady();
  }

  logger.info({ count: workers.length }, 'Queue workers ready');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await Promise.all(workers.map((w) => w.close()));
    logger.info('Queue workers stopped');
  });
}
