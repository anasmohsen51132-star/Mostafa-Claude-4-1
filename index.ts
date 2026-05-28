import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { pinoHttp } from 'pino-http';

import { config } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { metricsMiddleware, metricsHandler } from '@/lib/metrics';
import { rateLimiter } from '@/middleware/rateLimiter';
import { errorHandler } from '@/middleware/errorHandler';
import { notFoundHandler } from '@/middleware/notFoundHandler';
import { requestId } from '@/middleware/requestId';
import { securityHeaders } from '@/middleware/security';

// Routes
import { authRouter } from '@/modules/auth/auth.router';
import { usersRouter } from '@/modules/users/users.router';
import { coursesRouter } from '@/modules/courses/courses.router';
import { lecturesRouter } from '@/modules/lectures/lectures.router';
import { quizzesRouter } from '@/modules/quizzes/quizzes.router';
import { paymentsRouter } from '@/modules/payments/payments.router';
import { couponsRouter } from '@/modules/coupons/coupons.router';
import { accessCodesRouter } from '@/modules/access-codes/access-codes.router';
import { notificationsRouter } from '@/modules/notifications/notifications.router';
import { certificatesRouter } from '@/modules/certificates/certificates.router';
import { analyticsRouter } from '@/modules/analytics/analytics.router';
import { mediaRouter } from '@/modules/media/media.router';
import { adminRouter } from '@/modules/admin/admin.router';
import { webhooksRouter } from '@/modules/webhooks/webhooks.router';

// Queues
import { startWorkers } from '@/queues/workers';

const app = express();

// ── Trust Proxy (Nginx) ──────────────────────────────────────────
app.set('trust proxy', 1);

// ── Core Security Middleware ──────────────────────────────────────
app.use(requestId);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(securityHeaders);

// ── CORS ─────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    const allowed = config.corsOrigins;
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-CSRF-Token'],
  maxAge: 86400,
}));

// ── Parsers ──────────────────────────────────────────────────────
// Raw body for webhook signature validation (MUST be before json)
app.use('/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(config.cookieSecret));

// ── Compression ──────────────────────────────────────────────────
app.use(compression());

// ── Logging ──────────────────────────────────────────────────────
if (config.nodeEnv !== 'test') {
  app.use(pinoHttp({ logger }));
}

// ── Metrics ──────────────────────────────────────────────────────
app.use(metricsMiddleware);
app.get('/metrics', metricsHandler);

// ── Rate Limiting ────────────────────────────────────────────────
app.use('/api/', rateLimiter.global);

// ── Health Check ─────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

app.get('/health/ready', async (_req, res) => {
  res.json({ status: 'ready' });
});

// ── API Routes ───────────────────────────────────────────────────
const apiRouter = express.Router();

apiRouter.use('/auth', rateLimiter.auth, authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/courses', coursesRouter);
apiRouter.use('/lectures', lecturesRouter);
apiRouter.use('/quizzes', quizzesRouter);
apiRouter.use('/payments', paymentsRouter);
apiRouter.use('/coupons', couponsRouter);
apiRouter.use('/access-codes', accessCodesRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/certificates', certificatesRouter);
apiRouter.use('/analytics', analyticsRouter);
apiRouter.use('/media', mediaRouter);
apiRouter.use('/admin', adminRouter);

app.use('/api/v1', apiRouter);

// Webhooks (raw body, no API prefix)
app.use('/webhooks', webhooksRouter);

// ── Error Handling ───────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Server Bootstrap ─────────────────────────────────────────────
async function bootstrap() {
  try {
    // Test DB connection
    await prisma.$connect();
    logger.info('✅ Database connected');

    // Test Redis connection
    await redis.ping();
    logger.info('✅ Redis connected');

    // Start queue workers
    if (config.nodeEnv !== 'test') {
      await startWorkers();
      logger.info('✅ Queue workers started');
    }

    const server = app.listen(config.port, () => {
      logger.info(`🚀 API server running on port ${config.port} (${config.nodeEnv})`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(async () => {
        await prisma.$disconnect();
        redis.disconnect();
        logger.info('💤 Server shut down cleanly');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Unhandled errors
    process.on('unhandledRejection', (reason) => {
      logger.error({ reason }, 'Unhandled promise rejection');
    });

    process.on('uncaughtException', (err) => {
      logger.error({ err }, 'Uncaught exception');
      process.exit(1);
    });

  } catch (err) {
    logger.error({ err }, 'Fatal error during bootstrap');
    process.exit(1);
  }
}

bootstrap();

export { app };
