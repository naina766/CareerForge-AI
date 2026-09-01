import { Request, Response, NextFunction } from 'express';
import { JobDiscoveryService } from './job-discovery.service.js';
import { candidateJobSearchSchema } from './job-discovery.schema.js';
import { ApiResponse } from '@careerforge/types';

export class JobDiscoveryController {
  /**
   * GET /api/v1/jobs
   * Public / candidate endpoint to search, filter, and paginate published vacancies.
   */
  static async searchJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedQuery = candidateJobSearchSchema.parse(req.query);
      const result = await JobDiscoveryService.searchPublishedJobs(validatedQuery);

      const response: ApiResponse<typeof result.items> = {
        success: true,
        data: result.items,
        meta: {
          requestId: req.requestId,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
          pagination: result.meta,
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/jobs/:slugOrId
   * Public endpoint to view a single published job posting by slug or unique ID.
   */
  static async getJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { slugOrId } = req.params;
      const job = await JobDiscoveryService.getPublicJobBySlugOrId(slugOrId);

      const response: ApiResponse<typeof job> = {
        success: true,
        data: job,
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
