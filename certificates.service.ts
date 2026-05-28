import crypto from 'crypto';
import { CertificateStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/middleware/errorHandler';
import { config } from '@/config/env';
import { logger } from '@/lib/logger';

export const certificatesService = {
  generateCertificateNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `CERT-${timestamp}-${random}`;
  },

  async generate(enrollmentId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        user: { select: { id: true, name: true } },
        course: { select: { id: true, title: true, certificateEnabled: true } },
      },
    });

    if (!enrollment) throw new AppError('Enrollment not found', 404, 'NOT_FOUND');
    if (!enrollment.course.certificateEnabled) return null;
    if (enrollment.status !== 'COMPLETED') throw new AppError('Course not completed', 400, 'NOT_COMPLETED');

    const existing = await prisma.certificate.findUnique({ where: { enrollmentId } });
    if (existing && existing.status === CertificateStatus.ISSUED) return existing;

    const certNumber = certificatesService.generateCertificateNumber();
    const verifyUrl = `${config.appUrl}/verify/${certNumber}`;

    const certificate = await prisma.certificate.upsert({
      where: { enrollmentId },
      create: {
        userId: enrollment.userId,
        courseId: enrollment.courseId,
        enrollmentId,
        certificateNumber: certNumber,
        status: CertificateStatus.ISSUED,
        issuedAt: new Date(),
        verifyUrl,
      },
      update: {
        status: CertificateStatus.ISSUED,
        issuedAt: new Date(),
        verifyUrl,
      },
    });

    logger.info({ certificateId: certificate.id, userId: enrollment.userId }, 'Certificate issued');

    // Queue PDF generation
    try {
      const { certificateQueue } = await import('@/queues/processors/certificate.processor');
      await certificateQueue.add('generate-pdf', { certificateId: certificate.id }, { delay: 1000 });
    } catch (err) {
      logger.warn({ err }, 'Could not queue PDF generation');
    }

    return certificate;
  },

  async verify(certNumber: string) {
    const cert = await prisma.certificate.findUnique({
      where: { certificateNumber: certNumber },
      include: {
        user: { select: { name: true } },
        course: { select: { title: true } },
      },
    });

    if (!cert || cert.status !== CertificateStatus.ISSUED) {
      throw new AppError('الشهادة غير موجودة أو غير صالحة', 404, 'CERTIFICATE_NOT_FOUND');
    }

    return { valid: true, certificate: cert };
  },

  async getUserCertificates(userId: string) {
    return prisma.certificate.findMany({
      where: { userId, status: CertificateStatus.ISSUED },
      include: { course: { select: { id: true, title: true, thumbnail: true } } },
      orderBy: { issuedAt: 'desc' },
    });
  },

  async revoke(certId: string, reason: string, actorId: string) {
    return prisma.certificate.update({
      where: { id: certId },
      data: { status: CertificateStatus.REVOKED, revokedAt: new Date(), revokeReason: reason },
    });
  },
};
