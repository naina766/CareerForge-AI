import { Router } from 'express';
import multer from 'multer';
import { CandidateController } from './candidate.controller.js';
import { ResumeController } from '../resume/resume.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { env } from '@careerforge/config';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (env.MAX_RESUME_SIZE_MB + 1) * 1024 * 1024,
  },
});

export const candidateRouter: Router = Router();

// Candidate authorization boundary
candidateRouter.use(requireAuth);
candidateRouter.use(requireRole('CANDIDATE'));

// Profile
candidateRouter.get('/me/profile', CandidateController.getProfile);
candidateRouter.patch('/me/profile', CandidateController.updateProfile);
candidateRouter.delete('/me/profile', CandidateController.deleteProfile);
candidateRouter.get('/me/profile/summary', CandidateController.getProfileSummary);

// Resume Management & Parsing (Phase 5, Phase 6, Phase 8)
candidateRouter.get('/me/resume', ResumeController.getResume);
candidateRouter.post('/me/resume', upload.single('resume'), ResumeController.uploadResume);
candidateRouter.post('/me/resume/replace', upload.single('resume'), ResumeController.replaceResume);
candidateRouter.post('/me/resume/parse', ResumeController.parseResume);
candidateRouter.get('/me/resume/parsed', ResumeController.getParsedResume);
candidateRouter.post('/me/resume/index', ResumeController.indexResume);
candidateRouter.get('/me/resume/index-status', ResumeController.getIndexStatus);
candidateRouter.post('/me/resume/search', ResumeController.searchResume);
candidateRouter.delete('/me/resume', ResumeController.deleteResume);
candidateRouter.get('/me/resume/download', ResumeController.downloadResume);

// Skills
candidateRouter.get('/me/skills', CandidateController.getSkills);
candidateRouter.post('/me/skills', CandidateController.addSkill);
candidateRouter.patch('/me/skills/:skillId', CandidateController.updateSkill);
candidateRouter.delete('/me/skills/:skillId', CandidateController.removeSkill);

// Work Experience
candidateRouter.get('/me/experience', CandidateController.getExperience);
candidateRouter.post('/me/experience', CandidateController.addExperience);
candidateRouter.patch('/me/experience/:experienceId', CandidateController.updateExperience);
candidateRouter.delete('/me/experience/:experienceId', CandidateController.deleteExperience);

// Education
candidateRouter.get('/me/education', CandidateController.getEducation);
candidateRouter.post('/me/education', CandidateController.addEducation);
candidateRouter.patch('/me/education/:educationId', CandidateController.updateEducation);
candidateRouter.delete('/me/education/:educationId', CandidateController.deleteEducation);

// Career Preferences
candidateRouter.get('/me/preferences', CandidateController.getPreferences);
candidateRouter.put('/me/preferences', CandidateController.updatePreferences);
candidateRouter.patch('/me/preferences', CandidateController.updatePreferences);
