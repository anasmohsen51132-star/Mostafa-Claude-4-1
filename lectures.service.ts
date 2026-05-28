import { prisma } from '@/lib/prisma';
import { AppError } from '@/middleware/errorHandler';
import { enrollmentService } from '@/modules/courses/enrollment.service';
import { auditService } from '@/modules/admin/audit.service';

export const lecturesService = {
  async getLecture(lectureId: string, userId?: string) {
    const lecture = await prisma.lecture.findUnique({
      where: { id: lectureId },
      include: {
        course: { select: { id: true, title: true, slug: true } },
        section: { select: { id: true, title: true } },
      },
    });
    if (!lecture) throw new AppError('المحاضرة غير موجودة', 404, 'NOT_FOUND');

    // Check access for non-free lectures
    if (!lecture.isFree && userId) {
      const hasAccess = await enrollmentService.checkAccess(userId, lecture.courseId);
      if (!hasAccess) throw new AppError('يجب التسجيل في الكورس أولاً', 403, 'NO_ACCESS');
    }

    // Track view
    if (userId) {
      await prisma.lecture.update({ where: { id: lectureId }, data: { viewCount: { increment: 1 } } });
    }

    return lecture;
  },

  async getCourseLectures(courseId: string, userId?: string) {
    const hasAccess = userId ? await enrollmentService.checkAccess(userId, courseId) : false;

    const sections = await prisma.section.findMany({
      where: { courseId },
      orderBy: { sortOrder: 'asc' },
      include: {
        lectures: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true, title: true, description: true, sortOrder: true,
            videoDuration: true, isFree: true, isPublished: true, viewCount: true,
            videoStatus: true,
            // Only show videoUrl if user has access or lecture is free
            ...(hasAccess ? { videoUrl: true } : {}),
            progress: userId ? {
              where: {
                enrollment: { userId },
              },
              select: { watchedSeconds: true, isCompleted: true },
            } : false,
          },
        },
      },
    });

    return sections;
  },

  async create(data: {
    courseId: string;
    sectionId?: string;
    title: string;
    description?: string;
    sortOrder?: number;
    isFree?: boolean;
    videoDuration?: number;
  }, actorId: string) {
    const lecture = await prisma.lecture.create({
      data: {
        ...data,
        isPublished: false,
        videoStatus: 'pending',
      },
    });

    // Update course total
    await prisma.course.update({
      where: { id: data.courseId },
      data: { totalLectures: { increment: 1 } },
    });

    await auditService.log({ actorId, action: 'CREATE', resource: 'Lecture', resourceId: lecture.id });
    return lecture;
  },

  async update(lectureId: string, data: {
    title?: string;
    description?: string;
    sortOrder?: number;
    isFree?: boolean;
    isPublished?: boolean;
    videoUrl?: string;
    videoKey?: string;
    videoDuration?: number;
    videoSize?: bigint;
    videoStatus?: string;
    thumbnailUrl?: string;
    attachments?: any;
  }, actorId: string) {
    const lecture = await prisma.lecture.update({
      where: { id: lectureId },
      data,
    });
    await auditService.log({ actorId, action: 'UPDATE', resource: 'Lecture', resourceId: lectureId });
    return lecture;
  },

  async delete(lectureId: string, actorId: string) {
    const lecture = await prisma.lecture.findUnique({ where: { id: lectureId } });
    if (!lecture) throw new AppError('المحاضرة غير موجودة', 404, 'NOT_FOUND');

    await prisma.lecture.delete({ where: { id: lectureId } });
    await prisma.course.update({
      where: { id: lecture.courseId },
      data: { totalLectures: { decrement: 1 } },
    });

    await auditService.log({ actorId, action: 'DELETE', resource: 'Lecture', resourceId: lectureId });
  },

  async createSection(courseId: string, title: string, sortOrder?: number, actorId?: string) {
    const section = await prisma.section.create({ data: { courseId, title, sortOrder: sortOrder || 0 } });
    if (actorId) await auditService.log({ actorId, action: 'CREATE', resource: 'Section', resourceId: section.id });
    return section;
  },

  async updateSection(sectionId: string, data: { title?: string; sortOrder?: number }, actorId: string) {
    return prisma.section.update({ where: { id: sectionId }, data });
  },

  async deleteSection(sectionId: string, actorId: string) {
    const count = await prisma.lecture.count({ where: { sectionId } });
    if (count > 0) throw new AppError(`القسم يحتوي على ${count} محاضرة`, 400, 'SECTION_NOT_EMPTY');
    await prisma.section.delete({ where: { id: sectionId } });
  },

  async reorderLectures(lectures: Array<{ id: string; sortOrder: number }>) {
    await prisma.$transaction(
      lectures.map((l) => prisma.lecture.update({ where: { id: l.id }, data: { sortOrder: l.sortOrder } })),
    );
  },
};
