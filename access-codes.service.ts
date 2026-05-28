import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/lib/logger';

const hashCode = (code: string) =>
  crypto.createHash('sha256').update(code.toUpperCase().trim()).digest('hex');

const generateCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(12);
  let code = '';
  for (let i = 0; i < 12; i++) code += chars[bytes[i] % chars.length];
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
};

export const accessCodesService = {
  async generateBatch(data: {
    count: number;
    courseId?: string;
    usageLimit?: number;
    expiresAt?: Date | string;
    description?: string;
    createdBy: string;
  }) {
    const batchId = crypto.randomUUID();
    const codes: string[] = [];
    const records: any[] = [];
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : undefined;

    for (let i = 0; i < Math.min(data.count, 500); i++) {
      const code = generateCode();
      codes.push(code);
      records.push({
        code,
        codeHash: hashCode(code),
        courseId: data.courseId || null,
        batchId,
        usageLimit: data.usageLimit || 1,
        expiresAt,
        description: data.description,
        createdBy: data.createdBy,
        isActive: true,
      });
    }

    await prisma.accessCode.createMany({ data: records, skipDuplicates: true });
    logger.info({ batchId, count: codes.length, createdBy: data.createdBy }, 'Access codes generated');

    return { batchId, count: codes.length, codes };
  },

  async redeem(code: string, userId: string, courseId?: string) {
    const codeHash = hashCode(code);
    const accessCode = await prisma.accessCode.findUnique({
      where: { codeHash },
      include: { redemptions: { where: { userId } } },
    });

    if (!accessCode || !accessCode.isActive) throw new AppError('كود الوصول غير صحيح', 400, 'INVALID_CODE');
    if (accessCode.expiresAt && accessCode.expiresAt < new Date()) throw new AppError('انتهت صلاحية الكود', 400, 'CODE_EXPIRED');
    if (accessCode.usageCount >= accessCode.usageLimit) throw new AppError('تم استنفاد هذا الكود', 400, 'CODE_DEPLETED');
    if (accessCode.redemptions.length > 0) throw new AppError('لقد استخدمت هذا الكود من قبل', 400, 'ALREADY_REDEEMED');

    const targetCourseId = accessCode.courseId || courseId;
    if (!targetCourseId) throw new AppError('يجب تحديد الكورس', 400, 'COURSE_REQUIRED');

    await prisma.$transaction([
      prisma.accessCode.update({ where: { id: accessCode.id }, data: { usageCount: { increment: 1 } } }),
      prisma.accessCodeRedemption.create({
        data: { accessCodeId: accessCode.id, userId, courseId: targetCourseId },
      }),
    ]);

    return { valid: true, courseId: targetCourseId, accessCodeId: accessCode.id };
  },

  async list(params: { page?: number; limit?: number; batchId?: string; courseId?: string }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const where: any = {};
    if (params.batchId) where.batchId = params.batchId;
    if (params.courseId) where.courseId = params.courseId;

    const [codes, total] = await prisma.$transaction([
      prisma.accessCode.findMany({
        where,
        include: {
          _count: { select: { redemptions: true } },
          redemptions: {
            take: 3,
            include: { user: { select: { name: true, phone: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.accessCode.count({ where }),
    ]);

    return { codes, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async deactivate(codeId: string) {
    return prisma.accessCode.update({ where: { id: codeId }, data: { isActive: false } });
  },
};
