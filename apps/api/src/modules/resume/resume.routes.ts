import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { ResumeController } from './resume.controller.js';
import { env } from '@careerforge/config';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (env.MAX_RESUME_SIZE_MB + 1) * 1024 * 1024,
  },
});

export const resumeRouter: Router = Router();

// All resume routes require CANDIDATE authentication
resumeRouter.use(requireAuth);
resumeRouter.use(requireRole('CANDIDATE'));

resumeRouter.get('/me/resume', ResumeController.getResume);
resumeRouter.post('/me/resume', upload.single('resume'), ResumeController.uploadResume);
resumeRouter.post('/me/resume/replace', upload.single('resume'), ResumeController.replaceResume);
resumeRouter.post('/me/resume/parse', ResumeController.parseResume);
resumeRouter.get('/me/resume/parsed', ResumeController.getParsedResume);
resumeRouter.post('/me/resume/index', ResumeController.indexResume);
resumeRouter.get('/me/resume/index-status', ResumeController.getIndexStatus);
resumeRouter.post('/me/resume/search', ResumeController.searchResume);
resumeRouter.delete('/me/resume', ResumeController.deleteResume);
resumeRouter.get('/me/resume/download', ResumeController.downloadResume);

export default resumeRouter;
