import { Request, Response, NextFunction } from 'express';
import { UserRole, UserStatus } from '@prisma/client';
import { tokenService } from '@/lib/tokens';
import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/redis';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/lib/logger';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        phone: string;
        status: UserStatus;
      };
      requestId?: string;
    }
  }
}

const USER_CACHE_TTL = 60; // 1 minute

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    let payload;
    try {
      payload = tokenService.verifyAccessToken(token);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('Token expired', 401, 'TOKEN_EXPIRED');
      }
      throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
    }

    // Fast user lookup from cache
    const cacheKey = `user:${payload.sub}`;
    let user = await cache.get<{
      id: string;
      role: UserRole;
      phone: string;
      status: UserStatus;
    }>(cacheKey);

    if (!user) {
      const dbUser = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, phone: true, status: true, deletedAt: true },
      });

      if (!dbUser || dbUser.deletedAt) {
        throw new AppError('User not found', 401, 'USER_NOT_FOUND');
      }

      user = {
        id: dbUser.id,
        role: dbUser.role,
        phone: dbUser.phone,
        status: dbUser.status,
      };
      await cache.set(cacheKey, user, USER_CACHE_TTL);
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError('Account suspended', 403, 'ACCOUNT_SUSPENDED');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(
        { userId: req.user.id, role: req.user.role, required: roles },
        'Access denied: insufficient role',
      );
      return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
    }

    next();
  };
};

// Convenience role guards
export const requireAdmin = requireRole(UserRole.ADMIN, UserRole.OWNER);
export const requireOwner = requireRole(UserRole.OWNER);
export const requireInstructor = requireRole(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.OWNER);

// Self-or-admin guard (user can access their own resource, or admin)
export const requireSelfOrAdmin = (
  getTargetId: (req: Request) => string,
) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }
    const targetId = getTargetId(req);
    const isSelf = req.user.id === targetId;
    const isAdmin = [UserRole.ADMIN, UserRole.OWNER].includes(req.user.role);

    if (!isSelf && !isAdmin) {
      return next(new AppError('Access denied', 403, 'FORBIDDEN'));
    }
    next();
  };
};

// Optional auth (doesn't fail if no token)
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return next();

    const payload = tokenService.verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, phone: true, status: true },
    });
    if (user) req.user = user;
  } catch {
    // Ignore auth errors for optional auth
  }
  next();
};
