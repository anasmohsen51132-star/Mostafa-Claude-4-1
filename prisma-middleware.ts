import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

const SLOW_QUERY_THRESHOLD_MS = 1000; // 1 second

// Models that support soft-delete
const SOFT_DELETE_MODELS = ['User'] as const;
type SoftDeleteModel = typeof SOFT_DELETE_MODELS[number];

function isSoftDeleteModel(model: string | undefined): model is SoftDeleteModel {
  return SOFT_DELETE_MODELS.includes(model as SoftDeleteModel);
}

/**
 * Apply all Prisma middleware to a client instance.
 * Call once during bootstrap, before any queries.
 */
export function applyPrismaMiddleware(client: PrismaClient): void {
  // ── 1. Query performance logging + slow query detection ─────
  client.$use(async (params: Prisma.MiddlewareParams, next) => {
    const start = Date.now();
    const result = await next(params);
    const duration = Date.now() - start;

    const logData = {
      model: params.model,
      action: params.action,
      durationMs: duration,
    };

    if (duration >= SLOW_QUERY_THRESHOLD_MS) {
      logger.warn({ ...logData, threshold: SLOW_QUERY_THRESHOLD_MS }, '🐌 Slow Prisma query detected');
    } else if (process.env.NODE_ENV === 'development') {
      logger.debug(logData, 'Prisma query');
    }

    return result;
  });

  // ── 2. Automatic soft-delete filter ──────────────────────────
  // Intercepts findMany/findFirst/findUnique on soft-deletable models
  // and injects `deletedAt: null` unless caller explicitly sets it.
  client.$use(async (params: Prisma.MiddlewareParams, next) => {
    if (!isSoftDeleteModel(params.model)) return next(params);

    const readActions = ['findFirst', 'findFirstOrThrow', 'findMany', 'count', 'findUnique', 'findUniqueOrThrow'];
    const updateActions = ['update', 'updateMany'];

    if (readActions.includes(params.action)) {
      if (!params.args) params.args = {};
      if (!params.args.where) params.args.where = {};

      // Only inject if caller hasn't explicitly queried deletedAt
      if (params.args.where.deletedAt === undefined) {
        params.args.where.deletedAt = null;
      }
    }

    // Prevent hard-delete — redirect to soft delete
    if (params.action === 'delete') {
      params.action = 'update';
      params.args.data = { deletedAt: new Date() };
    }

    if (params.action === 'deleteMany') {
      params.action = 'updateMany';
      if (!params.args) params.args = {};
      params.args.data = { deletedAt: new Date() };
    }

    return next(params);
  });

  // ── 3. Prisma error normalizer ────────────────────────────────
  client.$use(async (params: Prisma.MiddlewareParams, next) => {
    try {
      return await next(params);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        logger.error(
          { code: err.code, model: params.model, action: params.action, meta: err.meta },
          'Prisma known error',
        );
      } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
        logger.error({ model: params.model, action: params.action }, 'Prisma unknown error');
      }
      throw err;
    }
  });
}

// ── Transaction helper ────────────────────────────────────────────

export async function withTransaction<T>(
  client: PrismaClient,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { maxWait?: number; timeout?: number; isolationLevel?: Prisma.TransactionIsolationLevel },
): Promise<T> {
  return client.$transaction(fn, {
    maxWait: options?.maxWait ?? 5000,
    timeout: options?.timeout ?? 30000,
    isolationLevel: options?.isolationLevel ?? Prisma.TransactionIsolationLevel.ReadCommitted,
  });
}

// ── Cursor pagination helper ──────────────────────────────────────

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  count?: number;
}

export interface CursorPaginationArgs {
  cursor?: string;
  take?: number;
  field?: string;
}

export function buildCursorPagination(args: CursorPaginationArgs) {
  const take = Math.min(args.take || 20, 100);
  return {
    take: take + 1, // fetch one extra to determine hasMore
    ...(args.cursor
      ? { cursor: { id: args.cursor }, skip: 1 }
      : {}),
    orderBy: [{ [args.field || 'createdAt']: 'desc' as const }, { id: 'desc' as const }],
  };
}

export function formatCursorPage<T extends { id: string }>(
  items: T[],
  take: number,
): CursorPage<T> {
  const hasMore = items.length > take;
  const data = hasMore ? items.slice(0, take) : items;
  const nextCursor = hasMore ? data[data.length - 1].id : null;
  return { items: data, nextCursor, hasMore };
}

// ── Offset pagination helper ──────────────────────────────────────

export interface OffsetPage<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function buildOffsetPagination(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 200);
  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

export function formatOffsetPage<T>(items: T[], total: number, page: number, limit: number): OffsetPage<T> {
  const pages = Math.ceil(total / limit);
  return {
    items,
    total,
    page,
    limit,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
  };
}

// ── Repository base ───────────────────────────────────────────────

export abstract class BaseRepository<TModel, TCreateInput, TUpdateInput> {
  constructor(protected readonly client: PrismaClient) {}

  abstract findById(id: string): Promise<TModel | null>;
  abstract create(data: TCreateInput): Promise<TModel>;
  abstract update(id: string, data: TUpdateInput): Promise<TModel>;
  abstract delete(id: string): Promise<void>;

  protected async findOrThrow(id: string, modelName: string): Promise<TModel> {
    const item = await this.findById(id);
    if (!item) {
      const { AppError } = await import('@/middleware/errorHandler');
      throw new AppError(`${modelName} not found`, 404, 'NOT_FOUND');
    }
    return item;
  }
}
