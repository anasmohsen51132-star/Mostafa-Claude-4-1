import { CourseStatus, CourseLevel } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/redis';
import { AppError } from '@/middleware/errorHandler';
import { auditService } from '@/modules/admin/audit.service';
import slugify from './slugify';

const COURSES_CACHE_TTL = 300; // 5 min

export const coursesService = {
  async list(params: {
    page?: number;
    limit?: number;
    status?: CourseStatus;
    categoryId?: string;
    level?: CourseLevel;
    search?: string;
    isFeatured?: boolean;
    userId?: string; // to include enrollment status
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 12, 50);

    const where: any = {};
    if (params.status) where.status = params.status;
    else where.status = CourseStatus.PUBLISHED;
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.level) where.level = params.level;
    if (params.isFeatured !== undefined) where.isFeatured = params.isFeatured;
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [courses, total] = await prisma.$transaction([
      prisma.course.findMany({
        where,
        select: {
          id: true, title: true, slug: true, shortDesc: true,
          thumbnail: true, price: true, originalPrice: true, currency: true,
          level: true, language: true, duration: true, totalLectures: true,
          totalStudents: true, rating: true, ratingCount: true,
          icon: true, color: true, isFeatured: true, isFree: true,
          status: true, publishedAt: true,
          category: { select: { id: true, name: true, nameAr: true } },
          _count: { select: { sections: true, lectures: true, enrollments: true } },
          ...(params.userId ? {
            enrollments: {
              where: { userId: params.userId },
              select: { id: true, status: true, progress: true },
            },
          } : {}),
        },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.course.count({ where }),
    ]);

    return { courses, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async findBySlug(slug: string, userId?: string) {
    const cacheKey = `course:slug:${slug}`;
    if (!userId) {
      const cached = await cache.get(cacheKey);
      if (cached) return cached;
    }

    const course = await prisma.course.findUnique({
      where: { slug },
      include: {
        category: true,
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lectures: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true, title: true, duration: true, sortOrder: true,
                isFree: true, isPublished: true, videoStatus: true,
              },
            },
          },
        },
        quizzes: {
          where: { isPublished: true },
          select: { id: true, title: true, timeLimit: true, passingScore: true },
        },
        _count: { select: { enrollments: true, reviews: true } },
        reviews: {
          where: { isVisible: true },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { course: false },
        },
        ...(userId ? {
          enrollments: {
            where: { userId },
            select: { id: true, status: true, progress: true, completedAt: true },
          },
        } : {}),
      },
    });

    if (!course) throw new AppError('الكورس غير موجود', 404, 'NOT_FOUND');
    if (course.status !== CourseStatus.PUBLISHED && !userId) {
      throw new AppError('الكورس غير متاح', 403, 'FORBIDDEN');
    }

    if (!userId) {
      await cache.set(cacheKey, course, COURSES_CACHE_TTL);
    }

    return course;
  },

  async findById(id: string) {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        category: true,
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: { lectures: { orderBy: { sortOrder: 'asc' } } },
        },
        quizzes: true,
        _count: { select: { enrollments: true } },
      },
    });
    if (!course) throw new AppError('الكورس غير موجود', 404, 'NOT_FOUND');
    return course;
  },

  async create(data: {
    title: string;
    description: string;
    shortDesc?: string;
    price: number;
    originalPrice?: number;
    currency?: string;
    categoryId?: string;
    level?: CourseLevel;
    icon?: string;
    color?: string;
    isFree?: boolean;
    certificateEnabled?: boolean;
    passingScore?: number;
  }, actorId: string) {
    const slug = await coursesService.generateUniqueSlug(data.title);

    const course = await prisma.course.create({
      data: {
        ...data,
        slug,
        status: CourseStatus.DRAFT,
        price: data.price,
        originalPrice: data.originalPrice,
        currency: data.currency || 'EGP',
      },
    });

    await auditService.log({ actorId, action: 'CREATE', resource: 'Course', resourceId: course.id });
    return course;
  },

  async update(id: string, data: Partial<{
    title: string;
    description: string;
    shortDesc: string;
    price: number;
    originalPrice: number;
    level: CourseLevel;
    status: CourseStatus;
    categoryId: string;
    icon: string;
    color: string;
    thumbnail: string;
    previewVideo: string;
    isFeatured: boolean;
    isFree: boolean;
    certificateEnabled: boolean;
    passingScore: number;
  }>, actorId: string) {
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing) throw new AppError('الكورس غير موجود', 404, 'NOT_FOUND');

    const updateData: any = { ...data };
    if (data.status === CourseStatus.PUBLISHED && existing.status !== CourseStatus.PUBLISHED) {
      updateData.publishedAt = new Date();
    }

    const course = await prisma.course.update({ where: { id }, data: updateData });
    await cache.invalidatePattern(`course:*`);
    await auditService.log({ actorId, action: 'UPDATE', resource: 'Course', resourceId: id, before: existing, after: data });
    return course;
  },

  async delete(id: string, actorId: string) {
    const enrollmentCount = await prisma.enrollment.count({ where: { courseId: id } });
    if (enrollmentCount > 0) {
      throw new AppError(`لا يمكن حذف كورس به ${enrollmentCount} طالب مسجل`, 400, 'HAS_ENROLLMENTS');
    }

    await prisma.course.update({ where: { id }, data: { status: CourseStatus.ARCHIVED } });
    await cache.invalidatePattern(`course:*`);
    await auditService.log({ actorId, action: 'DELETE', resource: 'Course', resourceId: id });
  },

  async generateUniqueSlug(title: string): Promise<string> {
    let slug = slugify(title);
    let counter = 0;
    while (true) {
      const candidate = counter === 0 ? slug : `${slug}-${counter}`;
      const existing = await prisma.course.findUnique({ where: { slug: candidate } });
      if (!existing) return candidate;
      counter++;
    }
  },

  async updateStats(courseId: string) {
    const [lectureCount, studentCount] = await prisma.$transaction([
      prisma.lecture.count({ where: { courseId } }),
      prisma.enrollment.count({ where: { courseId, status: 'ACTIVE' } }),
    ]);

    await prisma.course.update({
      where: { id: courseId },
      data: { totalLectures: lectureCount, totalStudents: studentCount },
    });
  },

  async getCategories() {
    return cache.wrap('categories:all', () =>
      prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
      3600,
    );
  },
};
