import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '@/config/env';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { UserRole } from '@prisma/client';

export interface TokenPayload {
  sub: string;      // userId
  role: UserRole;
  phone: string;
  jti?: string;     // JWT ID (for revocation)
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const REFRESH_TOKEN_BLOCKLIST_PREFIX = 'rt:revoked:';
const SESSION_PREFIX = 'session:';
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

export const tokenService = {
  generateAccessToken(payload: Omit<TokenPayload, 'jti'>): string {
    return jwt.sign(
      { ...payload, jti: uuidv4() },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpires as any },
    );
  },

  generateRefreshToken(): string {
    return uuidv4() + '-' + uuidv4();
  },

  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
  },

  verifyRefreshToken(token: string): boolean {
    // Refresh tokens are opaque; verified by DB lookup
    return typeof token === 'string' && token.length > 30;
  },

  async issueTokenPair(
    userId: string,
    role: UserRole,
    phone: string,
    meta: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<TokenPair> {
    const accessToken = tokenService.generateAccessToken({ sub: userId, role, phone });
    const refreshToken = tokenService.generateRefreshToken();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store refresh token in DB
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    // Cache session in Redis for fast lookups
    await redis.setex(
      `${SESSION_PREFIX}${refreshToken}`,
      SESSION_TTL,
      JSON.stringify({ userId, role, phone }),
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  },

  async rotateRefreshToken(
    oldToken: string,
    meta: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<TokenPair | null> {
    // Check if revoked
    const isRevoked = await redis.exists(`${REFRESH_TOKEN_BLOCKLIST_PREFIX}${oldToken}`);
    if (isRevoked) {
      // Potential token reuse attack — revoke all user tokens
      const record = await prisma.refreshToken.findUnique({ where: { token: oldToken } });
      if (record) {
        await tokenService.revokeAllUserTokens(record.userId);
      }
      return null;
    }

    // Find valid token
    const record = await prisma.refreshToken.findFirst({
      where: {
        token: oldToken,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!record) return null;

    // Issue new token pair
    const newPair = await tokenService.issueTokenPair(
      record.userId,
      record.user.role,
      record.user.phone,
      meta,
    );

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: record.id },
      data: {
        revokedAt: new Date(),
        replacedBy: newPair.refreshToken,
      },
    });

    // Add old token to Redis blocklist (TTL: original expiry)
    const ttl = Math.floor((record.expiresAt.getTime() - Date.now()) / 1000);
    if (ttl > 0) {
      await redis.setex(`${REFRESH_TOKEN_BLOCKLIST_PREFIX}${oldToken}`, ttl, '1');
    }
    await redis.del(`${SESSION_PREFIX}${oldToken}`);

    return newPair;
  },

  async revokeToken(token: string): Promise<void> {
    const record = await prisma.refreshToken.findUnique({ where: { token } });
    if (!record) return;

    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    const ttl = Math.floor((record.expiresAt.getTime() - Date.now()) / 1000);
    if (ttl > 0) {
      await redis.setex(`${REFRESH_TOKEN_BLOCKLIST_PREFIX}${token}`, ttl, '1');
    }
    await redis.del(`${SESSION_PREFIX}${token}`);
  },

  async revokeAllUserTokens(userId: string): Promise<void> {
    const tokens = await prisma.refreshToken.findMany({
      where: { userId, revokedAt: null },
    });

    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Add all to blocklist
    const pipeline = redis.pipeline();
    for (const t of tokens) {
      const ttl = Math.floor((t.expiresAt.getTime() - Date.now()) / 1000);
      if (ttl > 0) {
        pipeline.setex(`${REFRESH_TOKEN_BLOCKLIST_PREFIX}${t.token}`, ttl, '1');
      }
      pipeline.del(`${SESSION_PREFIX}${t.token}`);
    }
    await pipeline.exec();
  },

  async validateRefreshToken(token: string) {
    // Fast path: check Redis cache
    const cached = await redis.get(`${SESSION_PREFIX}${token}`);
    if (!cached) {
      // Fall back to DB
      const record = await prisma.refreshToken.findFirst({
        where: {
          token,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: { user: { select: { id: true, role: true, phone: true, status: true } } },
      });
      return record ? record.user : null;
    }
    return JSON.parse(cached);
  },

  // Cleanup expired tokens (called by cron job)
  async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  },
};
