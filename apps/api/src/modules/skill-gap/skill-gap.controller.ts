import { Request, Response, NextFunction } from 'express';
import { SkillGapService } from './skill-gap.service.js';
import { ApiResponse, SkillGapAnalysisReport } from '@careerforge/types';

export class SkillGapController {
  /**
   * GET /api/v1/jobs/:jobId/skill-gaps
   * Authenticated candidate views their skill gaps and readiness for a job.
   */
  static async getSkillGaps(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      const forceRecompute = req.query.refresh === 'true';

      const result = await SkillGapService.analyzeSkillGaps(
        req.user!.id,
        jobId,
        forceRecompute
      );

      const response: ApiResponse<SkillGapAnalysisReport> = {
        success: true,
        data: result,
        meta: {
          requestId: req.requestId,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/jobs/:jobId/skill-gaps/analyze
   * Force computes or refreshes skill gaps.
   */
  static async analyzeSkillGaps(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;

      const result = await SkillGapService.analyzeSkillGaps(
        req.user!.id,
        jobId,
        true // Force recompute
      );

      const response: ApiResponse<SkillGapAnalysisReport> = {
        success: true,
        data: result,
        meta: {
          requestId: req.requestId,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}
