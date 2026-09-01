import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LearningPathService } from './learning-path.service.js';
import { ApiResponse, LearningPathResponse } from '@careerforge/types';
import { AppError } from '../../middleware/errorHandler.js';

const updateProgressSchema = z.object({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
});

export class LearningPathController {
  /**
   * GET /api/v1/jobs/:jobId/learning-path
   * Candidate views or retrieves their current personalized learning path.
   */
  static async getLearningPath(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      const forceRegenerate = req.query.refresh === 'true';

      const result = await LearningPathService.getOrCreateLearningPath(
        req.user!.id,
        jobId,
        forceRegenerate
      );

      const response: ApiResponse<LearningPathResponse> = {
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
   * POST /api/v1/jobs/:jobId/learning-path
   * Force generates or regenerates learning path.
   */
  static async generateLearningPath(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;

      const result = await LearningPathService.getOrCreateLearningPath(
        req.user!.id,
        jobId,
        true // Force regenerate
      );

      const response: ApiResponse<LearningPathResponse> = {
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
   * PATCH /api/v1/learning-path/items/:itemId
   * Candidate updates status of an individual learning roadmap item.
   */
  static async updateItemProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { itemId } = req.params;
      const parseResult = updateProgressSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new AppError('Invalid progress status value', 400, 'INVALID_STATUS');
      }

      const result = await LearningPathService.updateItemProgress(
        req.user!.id,
        itemId,
        parseResult.data.status as any
      );

      const response: ApiResponse<LearningPathResponse> = {
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
