import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { registerSchema, loginSchema } from './auth.schemas.js';
import { setRefreshTokenCookie, clearRefreshTokenCookie } from './auth.utils.js';
import { ApiResponse } from '@careerforge/types';
import { env } from '@careerforge/config';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await AuthService.register(validated, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      setRefreshTokenCookie(res, result.rawRefreshToken);

      const response: ApiResponse<{ user: typeof result.user; accessToken: string; expiresIn: string }> = {
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
        },
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await AuthService.login(validated, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      setRefreshTokenCookie(res, result.rawRefreshToken);

      const response: ApiResponse<{ user: typeof result.user; accessToken: string; expiresIn: string }> = {
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
        },
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies[env.AUTH_COOKIE_NAME] || req.body?.refreshToken;
      const result = await AuthService.refresh(rawRefreshToken, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      setRefreshTokenCookie(res, result.rawRefreshToken);

      const response: ApiResponse<{ user: typeof result.user; accessToken: string; expiresIn: string }> = {
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
        },
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      clearRefreshTokenCookie(res);
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies[env.AUTH_COOKIE_NAME] || req.body?.refreshToken;
      await AuthService.logout(rawRefreshToken);
      clearRefreshTokenCookie(res);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Logged out successfully' },
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      clearRefreshTokenCookie(res);
      next(err);
    }
  }

  static async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      await AuthService.logoutAll(req.user.id);
      clearRefreshTokenCookie(res);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'All active sessions terminated across devices' },
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const currentUser = await AuthService.getCurrentUser(req.user.id);

      const response: ApiResponse<{ user: typeof currentUser }> = {
        success: true,
        data: { user: currentUser },
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}
