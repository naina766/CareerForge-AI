import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { ApiResponse } from '@careerforge/types';

export const authRouter: Router = Router();

// Public Authentication Endpoints
authRouter.post('/register', AuthController.register);
authRouter.post('/login', AuthController.login);
authRouter.post('/refresh', AuthController.refresh);
authRouter.post('/logout', AuthController.logout);

// Protected Authentication Endpoints
authRouter.get('/me', requireAuth, AuthController.me);
authRouter.post('/logout-all', requireAuth, AuthController.logoutAll);

// RBAC Demonstration & Verification Endpoints (for automated & manual verification)
authRouter.get('/candidate-only', requireAuth, requireRole('CANDIDATE'), (req, res) => {
  const response: ApiResponse<{ message: string; user: typeof req.user }> = {
    success: true,
    data: {
      message: 'Access granted to Candidate Portal resource',
      user: req.user,
    },
  };
  res.status(200).json(response);
});

authRouter.get('/recruiter-only', requireAuth, requireRole('RECRUITER'), (req, res) => {
  const response: ApiResponse<{ message: string; user: typeof req.user }> = {
    success: true,
    data: {
      message: 'Access granted to Recruiter Portal resource',
      user: req.user,
    },
  };
  res.status(200).json(response);
});

authRouter.get('/admin-only', requireAuth, requireRole('ADMIN'), (req, res) => {
  const response: ApiResponse<{ message: string; user: typeof req.user }> = {
    success: true,
    data: {
      message: 'Access granted to Admin Portal resource',
      user: req.user,
    },
  };
  res.status(200).json(response);
});
