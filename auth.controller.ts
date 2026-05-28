import { Request, Response } from 'express';
import { authService } from './auth.service';
import { config } from '@/config/env';

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.isProd,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/v1/auth/refresh',
};

export const authController = {
  async register(req: Request, res: Response) {
    const { user, tokens } = await authService.register(req.body, {
      ip: req.ip,
      ua: req.headers['user-agent'],
    });

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      data: {
        user,
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
    });
  },

  async login(req: Request, res: Response) {
    const { user, tokens } = await authService.login(req.body, {
      ip: req.ip,
      ua: req.headers['user-agent'],
    });

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);

    res.json({
      success: true,
      data: {
        user,
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
    });
  },

  async logout(req: Request, res: Response) {
    const refreshToken =
      req.cookies[REFRESH_COOKIE] || req.body.refreshToken;

    if (refreshToken && req.user) {
      await authService.logout(refreshToken, req.user.id);
    }

    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth/refresh' });
    res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
  },

  async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies[REFRESH_COOKIE] || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: { code: 'NO_REFRESH_TOKEN', message: 'Refresh token required' },
      });
    }

    const tokens = await authService.refresh(refreshToken, {
      ip: req.ip,
      ua: req.headers['user-agent'],
    });

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
    });
  },

  async me(req: Request, res: Response) {
    const user = await authService.getMe(req.user!.id);
    res.json({ success: true, data: user });
  },

  async changePassword(req: Request, res: Response) {
    await authService.changePassword(
      req.user!.id,
      req.body.currentPassword,
      req.body.newPassword,
      { ip: req.ip, ua: req.headers['user-agent'] },
    );
    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  },
};
