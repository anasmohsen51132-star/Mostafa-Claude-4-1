import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '@/index';
import { prisma, createUser, getAuthToken } from '../../factories';

describe('Auth Routes — /api/v1/auth', () => {
  describe('POST /register', () => {
    it('201 — creates user and returns tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'علي محمد', phone: '01091111111', password: 'Test@1234' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.phone).toBe('01091111111');
      expect(res.body.data.user.role).toBe('STUDENT');
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
      // Refresh token should be in httpOnly cookie
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('409 — rejects duplicate phone', async () => {
      await createUser({ phone: '01091111112' });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Another', phone: '01091111112', password: 'Test@1234' })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PHONE_TAKEN');
    });

    it('422 — rejects invalid phone format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'User', phone: '12345', password: 'Test@1234' })
        .expect(422);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('422 — rejects weak password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'User', phone: '01091111113', password: 'weak' })
        .expect(422);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /login', () => {
    beforeAll(async () => {
      await createUser({ phone: '01092222221', password: 'Test@1234' });
    });

    it('200 — returns tokens on valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ phone: '01092222221', password: 'Test@1234' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.user.phone).toBe('01092222221');
    });

    it('401 — rejects wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ phone: '01092222221', password: 'Wrong@5678' })
        .expect(401);

      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('401 — rejects non-existent user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ phone: '01099999999', password: 'Test@1234' })
        .expect(401);

      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('does not return passwordHash in response', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ phone: '01092222221', password: 'Test@1234' });

      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('POST /refresh', () => {
    it('200 — returns new access token with valid refresh cookie', async () => {
      // First login to get cookie
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ phone: '01092222221', password: 'Test@1234' });

      const cookie = loginRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.data.accessToken).toBeTruthy();
      // New refresh token cookie should be set
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('401 — rejects missing refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /me', () => {
    it('200 — returns current user for authenticated request', async () => {
      const user = await createUser({ phone: '01093333331' });
      const token = await getAuthToken(user);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.id).toBe(user.id);
      expect(res.body.data.phone).toBe('01093333331');
    });

    it('401 — rejects unauthenticated request', async () => {
      await request(app)
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('401 — rejects tampered token', async () => {
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.tampered.signature')
        .expect(401);
    });
  });

  describe('POST /logout', () => {
    it('200 — clears refresh token cookie', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ phone: '01092222221', password: 'Test@1234' });

      const cookie = loginRes.headers['set-cookie'];
      const token = loginRes.body.data.accessToken;

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      // Cookie should be cleared (set with empty value / past expiry)
      const setCookieHeader = res.headers['set-cookie']?.[0] ?? '';
      expect(setCookieHeader).toMatch(/refresh_token=;|refresh_token=$/);
    });

    it('401 — rejects unauthenticated logout', async () => {
      await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);
    });
  });

  describe('PATCH /change-password', () => {
    it('200 — changes password successfully', async () => {
      const user = await createUser({ phone: '01093333332', password: 'Old@1234' });
      const token = await getAuthToken(user);

      const res = await request(app)
        .patch('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'Old@1234', newPassword: 'New@5678' })
        .expect(200);

      expect(res.body.success).toBe(true);

      // Can login with new password
      await request(app)
        .post('/api/v1/auth/login')
        .send({ phone: '01093333332', password: 'New@5678' })
        .expect(200);
    });

    it('400 — rejects wrong current password', async () => {
      const user = await createUser({ phone: '01093333333', password: 'Test@1234' });
      const token = await getAuthToken(user);

      const res = await request(app)
        .patch('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'Wrong@1234', newPassword: 'New@5678' })
        .expect(400);

      expect(res.body.error.code).toBe('WRONG_PASSWORD');
    });
  });

  describe('Rate limiting', () => {
    it('blocks after too many auth attempts', async () => {
      const responses = await Promise.all(
        Array.from({ length: 12 }, () =>
          request(app)
            .post('/api/v1/auth/login')
            .send({ phone: '01099000000', password: 'Wrong@1234' }),
        ),
      );

      const blocked = responses.filter(r => r.status === 429);
      expect(blocked.length).toBeGreaterThan(0);
    });
  });
});
