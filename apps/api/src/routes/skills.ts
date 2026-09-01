import { Router, Request, Response } from 'express';
import { SkillRepository } from '@careerforge/database';
import { ApiResponse } from '@careerforge/types';

export const skillsRouter: Router = Router();

/**
 * GET /api/v1/skills
 * Read-only skill taxonomy listing endpoint
 */
skillsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const skills = await SkillRepository.list();

  const response: ApiResponse<typeof skills> = {
    success: true,
    data: skills,
    meta: {
      correlationId: req.correlationId,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    },
  };

  res.status(200).json(response);
});
