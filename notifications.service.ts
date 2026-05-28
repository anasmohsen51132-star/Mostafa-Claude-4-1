import { NotificationType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const notificationService = {
  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, any>;
  }) {
    return prisma.notification.create({ data });
  },

  async sendPaymentSuccess(data: { userId: string; paymentId: string; amount: number; courseId: string }) {
    const course = await prisma.course.findUnique({ where: { id: data.courseId }, select: { title: true } });
    await notificationService.create({
      userId: data.userId,
      type: NotificationType.PAYMENT,
      title: 'تم الدفع بنجاح ✅',
      body: `تم استلام دفعتك بقيمة ${data.amount} جنيه للكورس "${course?.title}"`,
      data: { paymentId: data.paymentId, courseId: data.courseId },
    });
  },

  async getForUser(userId: string, page = 1, limit = 20) {
    const [notifications, total, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { notifications, total, unreadCount, page, limit };
  },

  async markRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  },

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  },

  async deleteNotification(notificationId: string, userId: string) {
    return prisma.notification.deleteMany({ where: { id: notificationId, userId } });
  },
};
