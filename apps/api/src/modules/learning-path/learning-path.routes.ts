import { Router } from 'express';
import { LearningPathController } from './learning-path.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

export const learningPathItemRouter: Router = Router();

// Candidate Learning Item Progress Updates (Phase 14)
learningPathItemRouter.patch(
  '/items/:itemId',
  requireAuth,
  requireRole('CANDIDATE'),
  LearningPathController.updateItemProgress
);
