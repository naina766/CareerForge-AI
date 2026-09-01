import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';
import { UserRole } from '@careerforge/types';

/**
 * Role-Based Access Control (RBAC) middleware.
 * Ensures the authenticated user possesses one of the allowed roles.
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required prior to authorization check.', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden. Requires one of [${allowedRoles.join(', ')}] role permissions.`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};
