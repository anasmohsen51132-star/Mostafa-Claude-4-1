import { describe, it, expect } from 'vitest';
import { tokenService } from '@/lib/tokens';
import { prisma, createUser } from '../../factories';
import { UserRole } from '@prisma/client';

describe('tokenService', () => {
  describe('generateAccessToken', () => {
    it('generates a verifiable JWT with correct payload', () => {
      const token = tokenService.generateAccessToken({
        sub: 'user-123',
        role: UserRole.STUDENT,
        phone: '01012345678',
      });

      const payload = tokenService.verifyAccessToken(token);
      expect(payload.sub).toBe('user-123');
      expect(payload.role).toBe('STUDENT');
      expect(payload.phone).toBe('01012345678');
      expect(payload.jti).toBeTruthy(); // unique JWT ID
    });

    it('generates different JTIs for each token', () => {
      const t1 = tokenService.generateAccessToken({ sub: 'u1', role: UserRole.STUDENT, phone: '01000000001' });
      const t2 = tokenService.generateAccessToken({ sub: 'u1', role: UserRole.STUDENT, phone: '01000000001' });
      const p1 = tokenService.verifyAccessToken(t1);
      const p2 = tokenService.verifyAccessToken(t2);
      expect(p1.jti).not.toBe(p2.jti);
    });
  });

  describe('verifyAccessToken', () => {
    it('throws on tampered token', () => {
      const token = tokenService.generateAccessToken({ sub: 'u1', role: UserRole.STUDENT, phone: '01000000001' });
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(() => tokenService.verifyAccessToken(tampered)).toThrow();
    });

    it('throws on completely invalid token', () => {
      expect(() => tokenService.verifyAccessToken('not-a-jwt')).toThrow();
    });
  });

  describe('issueTokenPair', () => {
    it('stores refresh token in database', async () => {
      const user = await createUser({ phone: '01044444441' });
      const { refreshToken } = await tokenService.issueTokenPair(user.id, user.role, user.phone);

      const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
      expect(stored).not.toBeNull();
      expect(stored!.userId).toBe(user.id);
    });

    it('refresh token expires in ~7 days', async () => {
      const user = await createUser({ phone: '01044444442' });
      const { refreshToken } = await tokenService.issueTokenPair(user.id, user.role, user.phone);

      const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
      const msUntilExpiry = stored!.expiresAt.getTime() - Date.now();
      const daysUntilExpiry = msUntilExpiry / (1000 * 60 * 60 * 24);
      expect(daysUntilExpiry).toBeGreaterThan(6.9);
      expect(daysUntilExpiry).toBeLessThan(7.1);
    });
  });

  describe('rotateRefreshToken', () => {
    it('issues new pair and revokes old token', async () => {
      const user = await createUser({ phone: '01044444443' });
      const { refreshToken: oldToken } = await tokenService.issueTokenPair(user.id, user.role, user.phone);

      const newPair = await tokenService.rotateRefreshToken(oldToken);
      expect(newPair).not.toBeNull();
      expect(newPair!.refreshToken).not.toBe(oldToken);

      const oldRecord = await prisma.refreshToken.findUnique({ where: { token: oldToken } });
      expect(oldRecord!.revokedAt).not.toBeNull();
      expect(oldRecord!.replacedBy).toBe(newPair!.refreshToken);
    });

    it('returns null for non-existent token', async () => {
      const result = await tokenService.rotateRefreshToken('token-does-not-exist');
      expect(result).toBeNull();
    });

    it('detects reuse: returns null and revokes all user tokens', async () => {
      const user = await createUser({ phone: '01044444444' });
      const { refreshToken: original } = await tokenService.issueTokenPair(user.id, user.role, user.phone);

      // First rotation (legitimate)
      await tokenService.rotateRefreshToken(original);

      // Second rotation with same token (reuse attack)
      const result = await tokenService.rotateRefreshToken(original);
      expect(result).toBeNull();

      // All user tokens should be revoked
      const activeTokens = await prisma.refreshToken.count({
        where: { userId: user.id, revokedAt: null },
      });
      expect(activeTokens).toBe(0);
    });
  });

  describe('revokeAllUserTokens', () => {
    it('revokes all active tokens for a user', async () => {
      const user = await createUser({ phone: '01044444445' });
      await tokenService.issueTokenPair(user.id, user.role, user.phone);
      await tokenService.issueTokenPair(user.id, user.role, user.phone);
      await tokenService.issueTokenPair(user.id, user.role, user.phone);

      await tokenService.revokeAllUserTokens(user.id);

      const active = await prisma.refreshToken.count({
        where: { userId: user.id, revokedAt: null },
      });
      expect(active).toBe(0);
    });
  });
});
