import { PrismaClient } from '@prisma/client';
import { config } from '@/config/env';
import { logger } from '@/lib/logger';

const createPrismaClient = () => {
  const client = new PrismaClient({
    log: config.isDev
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ]
      : [
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ],
    datasources: {
      db: {
        url: config.database.url,
      },
    },
  });

  if (config.isDev) {
    (client as any).$on('query', (e: any) => {
      logger.debug({ query: e.query, params: e.params, duration: e.duration }, 'Prisma query');
    });
  }

  (client as any).$on('error', (e: any) => {
    logger.error({ error: e }, 'Prisma error');
  });

  (client as any).$on('warn', (e: any) => {
    logger.warn({ warning: e }, 'Prisma warning');
  });

  return client;
};

// Global singleton (prevents hot-reload issues in dev)
declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient = global.__prisma ?? createPrismaClient();

if (!config.isProd) {
  global.__prisma = prisma;
}

export default prisma;
