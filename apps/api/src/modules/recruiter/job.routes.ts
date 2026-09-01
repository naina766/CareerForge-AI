import { Router } from 'express';
import { JobController } from './job.controller.js';
import { ApplicationController } from '../application/application.controller.js';
import { MatchingController } from '../matching/matching.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

export const recruiterJobRouter: Router = Router();

// Recruiter authorization boundary
recruiterJobRouter.use(requireAuth);
recruiterJobRouter.use(requireRole('RECRUITER'));

// Job Lifecycle Management (Phase 10)
recruiterJobRouter.post('/', JobController.createJob);
recruiterJobRouter.get('/', JobController.listJobs);
recruiterJobRouter.get('/stats', JobController.getStats);
recruiterJobRouter.get('/:jobId', JobController.getJob);
recruiterJobRouter.patch('/:jobId', JobController.updateJob);
recruiterJobRouter.patch('/:jobId/status', JobController.updateJobStatus);
recruiterJobRouter.post('/:jobId/duplicate', JobController.duplicateJob);
recruiterJobRouter.patch('/:jobId/archive', JobController.archiveJob);

// Recruiter Application Pipeline (Phase 12)
recruiterJobRouter.get('/:jobId/applications', ApplicationController.getRecruiterJobApplications);

// Recruiter Candidate Match Inspection (Phase 13)
recruiterJobRouter.get('/:jobId/candidates/:candidateId/match', MatchingController.getRecruiterCandidateMatch);



