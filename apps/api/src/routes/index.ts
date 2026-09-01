import { Router } from 'express';
import { healthRouter } from './health.js';
import { jobsRouter } from './jobs.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { candidateRouter } from '../modules/candidate/candidate.routes.js';
import { skillRouter, adminSkillRouter } from '../modules/skill/skill.routes.js';
import { recruiterJobRouter } from '../modules/recruiter/job.routes.js';
import { applicationRouter } from '../modules/application/application.routes.js';
import { learningPathItemRouter } from '../modules/learning-path/learning-path.routes.js';

import { recommendationRouter } from '../modules/recommendation/recommendation.routes.js';

export const apiV1Router: Router = Router();

// Health Check
apiV1Router.use('/', healthRouter);

// Authentication & Authorization (Phase 3)
apiV1Router.use('/auth', authRouter);

// Candidate Profile Management (Phase 4, 5, 6, 8)
apiV1Router.use('/candidates', candidateRouter);

// Skill Taxonomy & Normalization Engine (Phase 7)
apiV1Router.use('/skills', skillRouter);
apiV1Router.use('/admin', adminSkillRouter);

// Recruiter Job Lifecycle Management (Phase 10)
apiV1Router.use('/recruiter/jobs', recruiterJobRouter);

// Job Applications & Application Lifecycle (Phase 12)
apiV1Router.use('/applications', applicationRouter);

// Public Candidate Jobs Discovery & Matching (Phase 11, 13, 14)
apiV1Router.use('/jobs', jobsRouter);

// Candidate Learning Path Progress Tracking (Phase 14)
apiV1Router.use('/learning-path', learningPathItemRouter);

// Candidate Personalized Job Recommendations (Phase 15)
apiV1Router.use('/recommendations', recommendationRouter);

// Grounded RAG Career Assistant (Phase 16)
import { careerAssistantRouter } from '../modules/career-assistant/career-assistant.routes.js';
apiV1Router.use('/career-assistant', careerAssistantRouter);





