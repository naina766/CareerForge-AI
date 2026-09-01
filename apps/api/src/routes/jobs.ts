import { Router } from 'express';
import { JobDiscoveryController } from '../modules/job/job-discovery.controller.js';
import { ApplicationController } from '../modules/application/application.controller.js';
import { MatchingController } from '../modules/matching/matching.controller.js';
import { SkillGapController } from '../modules/skill-gap/skill-gap.controller.js';
import { LearningPathController } from '../modules/learning-path/learning-path.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

export const jobsRouter: Router = Router();

// Public Candidate Job Discovery & Search (Phase 11)
jobsRouter.get('/', JobDiscoveryController.searchJobs);
jobsRouter.get('/:slugOrId', JobDiscoveryController.getJob);

// Candidate Submit Application (Phase 12)
jobsRouter.post(
  '/:jobId/applications',
  requireAuth,
  requireRole('CANDIDATE'),
  ApplicationController.createApplication
);

// Candidate Hybrid AI Match Calculation (Phase 13)
jobsRouter.get(
  '/:jobId/match',
  requireAuth,
  requireRole('CANDIDATE'),
  MatchingController.getCandidateJobMatch
);

// Candidate Skill Gap Analysis (Phase 14)
jobsRouter.get(
  '/:jobId/skill-gaps',
  requireAuth,
  requireRole('CANDIDATE'),
  SkillGapController.getSkillGaps
);
jobsRouter.post(
  '/:jobId/skill-gaps/analyze',
  requireAuth,
  requireRole('CANDIDATE'),
  SkillGapController.analyzeSkillGaps
);

// Candidate Personalized Learning Path (Phase 14)
jobsRouter.get(
  '/:jobId/learning-path',
  requireAuth,
  requireRole('CANDIDATE'),
  LearningPathController.getLearningPath
);
jobsRouter.post(
  '/:jobId/learning-path',
  requireAuth,
  requireRole('CANDIDATE'),
  LearningPathController.generateLearningPath
);




