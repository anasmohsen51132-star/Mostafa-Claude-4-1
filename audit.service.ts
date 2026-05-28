import { AuditAction } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const auditService = {
  async log(data: {
    actorId?: string;
    userId?: string;
    action: AuditAction;
    resource: string;
    resourceId?: string;
    before?: any;
    after?: any;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          actorId: data.actorId,
          userId: data.userId || data.actorId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          before: data.before,
          after: data.after,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          metadata: data.metadata,
        },
      });
    } catch (err) {
      logger.warn({ err, ...data }, 'Failed to write audit log');
    }
  },

  async list(params: {
    page?: number;
    limit?: number;
    actorId?: string;
    resource?: string;
    action?: AuditAction;
    from?: Date;
    to?: Date;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 200);
    const where: any = {};
    if (params.actorId) where.actorId = params.actorId;
    if (params.resource) where.resource = params.resource;
    if (params.action) where.action = params.action;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = params.from;
      if (params.to) where.createdAt.lte = params.to;
    }

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, limit, pages: Math.ceil(total / limit) };
  },
};
