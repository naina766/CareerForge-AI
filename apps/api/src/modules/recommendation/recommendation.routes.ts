import { Router } from 'express';
import { RecommendationController } from './recommendation.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

export const recommendationRouter: Router = Router();

// Candidate Personalized Job Recommendations (Phase 15)
recommendationRouter.get(
  '/jobs',
  requireAuth,
  requireRole('CANDIDATE'),
  RecommendationController.getRecommendations
);

recommendationRouter.post(
  '/jobs/refresh',
  requireAuth,
  requireRole('CANDIDATE'),
  RecommendationController.refreshRecommendations
);

recommendationRouter.get(
  '/jobs/:jobId',
  requireAuth,
  requireRole('CANDIDATE'),
  RecommendationController.getSingleRecommendation
);
