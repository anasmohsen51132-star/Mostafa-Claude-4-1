import pino from 'pino';
import { config } from '@/config/env';

export const logger = pino({
  level: config.logLevel,
  ...(config.isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname',
            messageFormat: '[{req.id}] {msg}',
          },
        },
      }
    : {
        formatters: {
          level: (label) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        redact: {
          paths: [
            'password',
            'passwordHash',
            'req.headers.authorization',
            'req.headers.cookie',
            '*.secret',
            '*.token',
            '*.apiKey',
          ],
          censor: '[REDACTED]',
        },
      }),
});

export type Logger = typeof logger;
