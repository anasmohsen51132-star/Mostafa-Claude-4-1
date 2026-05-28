import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// ── Types ─────────────────────────────────────────────────────────

export interface PageParams {
  page?: number;
  limit?: number;
}

export interface CursorParams {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export interface SortParams {
  field?: string;
  direction?: 'asc' | 'desc';
}

export interface OffsetResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CursorResult<T> {
  items: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  total?: number;
}

// ── Offset Pagination ─────────────────────────────────────────────

export function resolveOffsetParams(params: PageParams & { maxLimit?: number }) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(Math.max(1, params.limit ?? 20), params.maxLimit ?? 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

export function buildOffsetResult<T extends object>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): OffsetResult<T> {
  const pages = Math.ceil(total / limit) || 1;
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

// Helper: run count + findMany in parallel
export async function paginateOffset<T>(
  model: any,
  options: {
    where?: any;
    select?: any;
    include?: any;
    orderBy?: any;
    page?: number;
    limit?: number;
    maxLimit?: number;
  },
): Promise<OffsetResult<T>> {
  const { page, limit, skip, take } = resolveOffsetParams(options);

  const [items, total] = await prisma.$transaction([
    model.findMany({
      where: options.where,
      select: options.select,
      include: options.include,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      skip,
      take,
    }),
    model.count({ where: options.where }),
  ]);

  return buildOffsetResult<T>(items, total, page, limit);
}

// ── Cursor Pagination ─────────────────────────────────────────────

export function resolveCursorParams(params: CursorParams & { maxLimit?: number }) {
  const limit = Math.min(Math.max(1, params.limit ?? 20), params.maxLimit ?? 100);
  return {
    limit,
    take: limit + 1, // fetch one extra to determine hasMore
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : undefined,
  };
}

export function buildCursorResult<T extends { id: string }>(
  rawItems: T[],
  limit: number,
): CursorResult<T> {
  const hasMore = rawItems.length > limit;
  const items = hasMore ? rawItems.slice(0, limit) : rawItems;
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  const prevCursor = items.length > 0 ? items[0].id : null;

  return { items, nextCursor, prevCursor, hasMore };
}

export async function paginateCursor<T extends { id: string }>(
  model: any,
  options: {
    where?: any;
    select?: any;
    include?: any;
    orderBy?: any;
    cursor?: string;
    limit?: number;
    maxLimit?: number;
    countWhere?: any;
  },
): Promise<CursorResult<T>> {
  const { limit, take, cursor, skip } = resolveCursorParams(options);

  const items = await model.findMany({
    where: options.where,
    select: options.select,
    include: options.include,
    orderBy: options.orderBy ?? [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
    cursor,
    skip,
  });

  return buildCursorResult<T>(items, limit);
}

// ── Base Repository ───────────────────────────────────────────────

export abstract class Repository<TModel extends { id: string }, TCreate, TUpdate> {
  constructor(protected readonly db: PrismaClient = prisma as any) {}

  abstract get model(): any;
  abstract get modelName(): string;

  async findById(id: string, include?: any): Promise<TModel | null> {
    return this.model.findUnique({ where: { id }, include });
  }

  async findByIdOrThrow(id: string, include?: any): Promise<TModel> {
    const item = await this.findById(id, include);
    if (!item) {
      const { AppError } = await import('@/middleware/errorHandler');
      throw new AppError(`${this.modelName} not found`, 404, 'NOT_FOUND');
    }
    return item;
  }

  async create(data: TCreate): Promise<TModel> {
    return this.model.create({ data });
  }

  async update(id: string, data: TUpdate): Promise<TModel> {
    return this.model.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.model.delete({ where: { id } });
  }

  async exists(where: any): Promise<boolean> {
    const count = await this.model.count({ where });
    return count > 0;
  }

  async paginate(options: {
    where?: any;
    include?: any;
    orderBy?: any;
    page?: number;
    limit?: number;
  }): Promise<OffsetResult<TModel>> {
    return paginateOffset<TModel>(this.model, options);
  }
}

// ── Concrete Repositories ─────────────────────────────────────────

export class PaymentRepository extends Repository<any, any, any> {
  get model() { return prisma.payment; }
  get modelName() { return 'Payment'; }

  async findByIdAndUser(id: string, userId: string) {
    return this.model.findFirst({
      where: { id, userId },
      include: { invoice: true, refunds: true },
    });
  }

  async findByProviderRef(ref: string) {
    return this.model.findFirst({ where: { providerRef: ref } });
  }

  async findByFawryRef(fawryRef: string) {
    return this.model.findFirst({
      where: { fawryReferenceNumber: fawryRef },
      include: { user: { select: { id: true, name: true, phone: true, email: true } } },
    });
  }

  async getPendingExpiredFawry() {
    return this.model.findMany({
      where: {
        provider: 'FAWRY',
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      select: { id: true, fawryReferenceNumber: true },
    });
  }

  async aggregateRevenue(from: Date, to?: Date) {
    return this.model.aggregate({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: from, ...(to ? { lte: to } : {}) },
      },
      _sum: { amount: true },
      _count: { id: true },
    });
  }
}

export class EnrollmentRepository extends Repository<any, any, any> {
  get model() { return prisma.enrollment; }
  get modelName() { return 'Enrollment'; }

  async findByUserAndCourse(userId: string, courseId: string) {
    return this.model.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
  }

  async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    const e = await this.findByUserAndCourse(userId, courseId);
    return e?.status === 'ACTIVE' || e?.status === 'COMPLETED';
  }

  async getWithProgress(userId: string) {
    return this.model.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        course: {
          select: {
            id: true, title: true, slug: true, thumbnail: true,
            icon: true, color: true, totalLectures: true,
          },
        },
        _count: { select: { lectureProgress: { where: { isCompleted: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export class CourseRepository extends Repository<any, any, any> {
  get model() { return prisma.course; }
  get modelName() { return 'Course'; }

  async findBySlug(slug: string) {
    return this.model.findUnique({
      where: { slug },
      include: {
        category: true,
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: { lectures: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
  }

  async search(query: string, params: { page?: number; limit?: number }) {
    const { skip, take, page, limit } = resolveOffsetParams(params);
    const where = {
      status: 'PUBLISHED' as const,
      OR: [
        { title: { contains: query, mode: 'insensitive' as const } },
        { description: { contains: query, mode: 'insensitive' as const } },
      ],
    };
    const [items, total] = await prisma.$transaction([
      this.model.findMany({ where, skip, take, orderBy: { isFeatured: 'desc' } }),
      this.model.count({ where }),
    ]);
    return buildOffsetResult(items, total, page, limit);
  }
}

export class UserRepository extends Repository<any, any, any> {
  get model() { return prisma.user; }
  get modelName() { return 'User'; }

  async findByPhone(phone: string) {
    return this.model.findUnique({ where: { phone } });
  }

  async findActiveById(id: string) {
    return this.model.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true, name: true, phone: true, email: true,
        role: true, status: true, avatar: true, passwordHash: true,
      },
    });
  }
}

// Singleton instances
export const paymentRepo = new PaymentRepository();
export const enrollmentRepo = new EnrollmentRepository();
export const courseRepo = new CourseRepository();
export const userRepo = new UserRepository();
