import { EnrollmentStatus, PaymentProvider } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/middleware/errorHandler';
import { enrollmentsTotal } from '@/lib/metrics';
import { coursesService } from './courses.service';
import { notificationService } from '@/modules/notifications/notifications.service';

export const enrollmentService = {
  async enroll(data: {
    userId: string;
    courseId: string;
    paymentId?: string;
    source?: string | PaymentProvider;
  }) {
    // Upsert enrollment (idempotent)
    const enrollment = await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: data.userId, courseId: data.courseId } },
      create: {
        userId: data.userId,
        courseId: data.courseId,
        paymentId: data.paymentId,
        status: EnrollmentStatus.ACTIVE,
        source: String(data.source || 'payment'),
      },
      update: {
        status: EnrollmentStatus.ACTIVE,
        paymentId: data.paymentId || undefined,
        source: String(data.source || 'payment'),
      },
    });

    // Update course student count
    await coursesService.updateStats(data.courseId);
    enrollmentsTotal.inc({ source: String(data.source || 'payment') });

    // Send enrollment notification
    const course = await prisma.course.findUnique({
      where: { id: data.courseId },
      select: { title: true },
    });

    await notificationService.create({
      userId: data.userId,
      type: 'ENROLLMENT',
      title: 'تم التسجيل بنجاح! 🎉',
      body: `تم تسجيلك في كورس "${course?.title}"، يمكنك البدء الآن`,
      data: { courseId: data.courseId, enrollmentId: enrollment.id },
    });

    return enrollment;
  },

  async getEnrollment(userId: string, courseId: string) {
    return prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        course: { select: { id: true, title: true, slug: true, thumbnail: true } },
      },
    });
  },

  async getMyEnrollments(userId: string) {
    return prisma.enrollment.findMany({
      where: { userId, status: EnrollmentStatus.ACTIVE },
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
  },

  async updateProgress(enrollmentId: string, lectureId: string, watchedSeconds: number) {
    const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) throw new AppError('Enrollment not found', 404, 'NOT_FOUND');

    const totalLectures = await prisma.lecture.count({ where: { courseId: enrollment.courseId, isPublished: true } });
    const videoDuration = (await prisma.lecture.findUnique({ where: { id: lectureId }, select: { videoDuration: true } }))?.videoDuration || 0;
    const isCompleted = videoDuration > 0 ? watchedSeconds >= videoDuration * 0.9 : watchedSeconds > 0;

    await prisma.lectureProgress.upsert({
      where: { lectureId_enrollmentId: { lectureId, enrollmentId } },
      create: { lectureId, enrollmentId, watchedSeconds, isCompleted, completedAt: isCompleted ? new Date() : undefined },
      update: { watchedSeconds: { set: watchedSeconds }, isCompleted, completedAt: isCompleted ? new Date() : undefined },
    });

    if (totalLectures > 0) {
      const completedCount = await prisma.lectureProgress.count({
        where: { enrollmentId, isCompleted: true },
      });
      const progress = Math.round((completedCount / totalLectures) * 100);

      const updateData: any = { progress };
      if (progress >= 100) {
        updateData.status = EnrollmentStatus.COMPLETED;
        updateData.completedAt = new Date();
      }

      await prisma.enrollment.update({ where: { id: enrollmentId }, data: updateData });

      if (progress >= 100) {
        const course = await prisma.course.findUnique({
          where: { id: enrollment.courseId },
          select: { certificateEnabled: true, title: true },
        });
        if (course?.certificateEnabled) {
          // Queue certificate generation
          const { certificateQueue } = await import('@/queues/processors/certificate.processor');
          await certificateQueue.add('generate', { enrollmentId, userId: enrollment.userId, courseId: enrollment.courseId });
        }
      }
    }

    return { isCompleted };
  },

  async checkAccess(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    return enrollment?.status === EnrollmentStatus.ACTIVE || enrollment?.status === EnrollmentStatus.COMPLETED;
  },
};
