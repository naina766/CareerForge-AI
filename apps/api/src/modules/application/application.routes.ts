import { Router } from 'express';
import { ApplicationController } from './application.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

export const applicationRouter: Router = Router();

// Candidate Application Management
applicationRouter.get('/me', requireAuth, requireRole('CANDIDATE'), ApplicationController.getCandidateApplications);
applicationRouter.get('/:applicationId', requireAuth, ApplicationController.getApplication);
applicationRouter.post('/:applicationId/withdraw', requireAuth, requireRole('CANDIDATE'), ApplicationController.withdrawApplication);

// Recruiter Status Transitions
applicationRouter.patch(
  '/:applicationId/status',
  requireAuth,
  requireRole('RECRUITER', 'ADMIN'),
  ApplicationController.updateApplicationStatus
);
