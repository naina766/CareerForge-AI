import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/auth.utils.js';
import { AppError } from './errorHandler.js';
import { UserRepository } from '@careerforge/database';
import { UserRole } from '@careerforge/types';

export interface AuthContextUser {
  id: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthContextUser;
    }
  }
}

/**
 * Validates the Authorization Bearer JWT and attaches authenticated user context to req.user.
 */
export const requireAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Missing or malformed Authorization header.', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new AppError('Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED');
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      throw new AppError('Invalid or expired authentication token.', 401, 'UNAUTHORIZED');
    }

    // Confirm user still exists in database
    const user = await UserRepository.findById(decoded.sub);
    if (!user) {
      throw new AppError('User account associated with this token no longer exists.', 401, 'UNAUTHORIZED');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
    };

    next();
  } catch (err) {
    next(err);
  }
};
