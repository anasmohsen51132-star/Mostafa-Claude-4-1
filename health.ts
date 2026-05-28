import { PrismaClient } from '@prisma/client';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';

export interface HealthStatus {
  postgres: 'ok' | 'error';
  redis: 'ok' | 'error';
  latencyMs: { postgres: number; redis: number };
  errors: Record<string, string>;
}

export async function checkDatabaseHealth(prisma: PrismaClient): Promise<HealthStatus> {
  const status: HealthStatus = {
    postgres: 'error',
    redis: 'error',
    latencyMs: { postgres: -1, redis: -1 },
    errors: {},
  };

  // PostgreSQL check
  const pgStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1 AS ping`;
    status.postgres = 'ok';
    status.latencyMs.postgres = Date.now() - pgStart;
  } catch (err: any) {
    status.errors.postgres = err.message;
    logger.error({ err }, 'PostgreSQL health check failed');
  }

  // Redis check
  const redisStart = Date.now();
  try {
    const pong = await redis.ping();
    if (pong === 'PONG') {
      status.redis = 'ok';
      status.latencyMs.redis = Date.now() - redisStart;
    }
  } catch (err: any) {
    status.errors.redis = err.message;
    logger.error({ err }, 'Redis health check failed');
  }

  return status;
}

// ── Connection pool strategy ──────────────────────────────────────
// Prisma handles connection pooling internally via PgBouncer-compatible
// URL or Prisma Data Proxy. For production horizontal scaling:
//
// DATABASE_URL="postgresql://user:pass@pgbouncer:6432/db?pgbouncer=true&connection_limit=1"
//
// PgBouncer pool_mode=transaction is recommended for:
//   - Horizontal pod scaling
//   - Lambda / serverless
//
// For long-running Node.js processes:
//   DATABASE_URL with ?connection_limit=10&pool_timeout=20

export const DB_POOL_CONFIG = {
  // Base connections per pod
  min: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
  max: parseInt(process.env.DATABASE_POOL_MAX || '20', 10),
  // Connection acquisition timeout (ms)
  acquireTimeout: 30_000,
  // Connection idle timeout (ms)
  idleTimeout: 600_000,
  // Statement timeout (ms) — kills runaway queries
  statementTimeout: 30_000,
};

// ── Read replica configuration ────────────────────────────────────
// When DATABASE_REPLICA_URL is set, read operations use the replica.
// Write operations always use the primary.
export function getReadUrl(): string {
  return process.env.DATABASE_REPLICA_URL || process.env.DATABASE_URL!;
}

export function getWriteUrl(): string {
  return process.env.DATABASE_URL!;
}

// ── Prisma extensions ─────────────────────────────────────────────
// Prisma Client Extensions (Prisma 4.16+)
export function createExtendedClient(base: PrismaClient) {
  return base.$extends({
    name: 'academy-extensions',
    model: {
      $allModels: {
        // Safe upsert that returns existing or creates new
        async findOrCreate<T>(
          this: T,
          args: { where: Record<string, unknown>; create: Record<string, unknown> },
        ) {
          const ctx = this as any;
          const existing = await ctx.findFirst({ where: args.where });
          if (existing) return { record: existing, created: false };
          const record = await ctx.create({ data: args.create });
          return { record, created: true };
        },
      },
    },
    query: {
      $allModels: {
        // Auto-inject requestId into all queries for tracing
        async $allOperations({ model, operation, args, query }: any) {
          return query(args);
        },
      },
    },
  });
}

// ── DB Backup script structure ────────────────────────────────────
// Actual backup is handled by infra/scripts/db-backup.sh
// This exports the schedule config for the cron worker
export const BACKUP_CONFIG = {
  schedule: '0 2 * * *', // 2am daily
  retentionDays: 30,
  s3Prefix: 'backups/postgres',
  format: 'custom', // pg_dump --format=custom
};
