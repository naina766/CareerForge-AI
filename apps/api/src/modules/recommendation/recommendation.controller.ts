import { Request, Response, NextFunction } from 'express';
import { RecommendationService } from './recommendation.service.js';
import { ApiResponse, JobRecommendationListResponse, JobRecommendationItem } from '@careerforge/types';

export class RecommendationController {
  /**
   * GET /api/v1/recommendations/jobs
   * Candidate views personalized recommended jobs with pagination and filters.
   */
  static async getRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const workMode = req.query.workMode as any;
      const location = req.query.location as string;
      const minScore = req.query.minScore ? parseFloat(req.query.minScore as string) : undefined;
      const sortBy = req.query.sortBy as any;

      const result = await RecommendationService.getRecommendedJobs(req.user!.id, {
        page,
        limit,
        workMode,
        location,
        minScore,
        sortBy,
      });

      const response: ApiResponse<JobRecommendationListResponse> = {
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
   * POST /api/v1/recommendations/jobs/refresh
   * Force refreshes recommendations for the authenticated candidate.
   */
  static async refreshRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RecommendationService.getRecommendedJobs(req.user!.id, {
        forceRefresh: true,
      });

      const response: ApiResponse<JobRecommendationListResponse> = {
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
   * GET /api/v1/recommendations/jobs/:jobId
   * Retrieves single job recommendation details and explanation for authenticated candidate.
   */
  static async getSingleRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;

      const result = await RecommendationService.getSingleRecommendation(
        req.user!.id,
        jobId
      );

      const response: ApiResponse<JobRecommendationItem> = {
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
