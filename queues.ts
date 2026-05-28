import { Queue } from 'bullmq';
import { createBullRedis } from '@/lib/redis';
import { config } from '@/config/env';

const connection = createBullRedis();

const defaultJobOptions = {
  attempts: config.bull.retryAttempts,
  backoff: { type: 'exponential' as const, delay: config.bull.retryDelay },
  removeOnComplete: { count: 1000, age: 60 * 60 * 24 },
  removeOnFail: { count: 500, age: 60 * 60 * 24 * 7 },
};

export const emailQueue = new Queue('email', { connection, defaultJobOptions });
export const notificationQueue = new Queue('notifications', { connection, defaultJobOptions });
export const certificateQueue = new Queue('certificates', { connection, defaultJobOptions });
export const mediaQueue = new Queue('media', { connection, defaultJobOptions });
export const paymentRetryQueue = new Queue('payment-retry', { connection, defaultJobOptions });
export const analyticsQueue = new Queue('analytics', { connection, defaultJobOptions });
export const fawryPollQueue = new Queue('fawry-poll', { connection, defaultJobOptions });
