import { Worker, Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { createBullRedis } from '@/lib/redis';
import { config } from '@/config/env';
import { logger } from '@/lib/logger';

let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!transporter && config.mail.host) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
    });
  }
  return transporter;
};

export interface EmailJob {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

const connection = createBullRedis();

export const emailWorker = new Worker(
  'email',
  async (job: Job<EmailJob>) => {
    const t = getTransporter();
    if (!t) {
      logger.warn({ jobId: job.id }, 'Email transport not configured, skipping');
      return;
    }

    logger.info({ to: job.data.to, subject: job.data.subject, jobId: job.id }, 'Sending email');

    await t.sendMail({
      from: job.data.from || config.mail.from,
      to: job.data.to,
      subject: job.data.subject,
      html: job.data.html,
      text: job.data.text,
    });

    logger.info({ to: job.data.to, jobId: job.id }, 'Email sent successfully');
  },
  {
    connection,
    concurrency: 3,
  },
);

emailWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, to: job?.data.to, err }, 'Email job failed');
});
