import { Request, Response, NextFunction } from 'express';
import { JobService } from './job.service.js';
import { createJobSchema, jobListQuerySchema, jobStatusSchema, updateJobSchema } from './job.schema.js';
import { ApiResponse } from '@careerforge/types';

export class JobController {
  /**
   * POST /api/v1/recruiter/jobs
   */
  static async createJob(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedInput = createJobSchema.parse(req.body);
      const userId = req.user!.id;

      const job = await JobService.createJob(userId, validatedInput);

      const response: ApiResponse<typeof job> = {
        success: true,
        data: job,
      };

      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/recruiter/jobs
   */
  static async listJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedQuery = jobListQuerySchema.parse(req.query);
      const userId = req.user!.id;

      const result = await JobService.listRecruiterJobs(userId, validatedQuery);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/recruiter/jobs/stats
   */
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const stats = await JobService.getRecruiterStats(userId);

      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/recruiter/jobs/:jobId
   */
  static async getJob(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { jobId } = req.params;

      const job = await JobService.getJobById(userId, jobId, req.user!.role);

      const response: ApiResponse<typeof job> = {
        success: true,
        data: job,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/recruiter/jobs/:jobId
   */
  static async updateJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      const validatedInput = updateJobSchema.parse(req.body);
      const userId = req.user!.id;

      const updatedJob = await JobService.updateJob(userId, jobId, validatedInput);

      const response: ApiResponse<typeof updatedJob> = {
        success: true,
        data: updatedJob,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/recruiter/jobs/:jobId/status
   */
  static async updateJobStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      const { status } = jobStatusSchema.parse(req.body);
      const userId = req.user!.id;

      const updatedJob = await JobService.updateJobStatus(userId, jobId, status as any);

      const response: ApiResponse<typeof updatedJob> = {
        success: true,
        data: updatedJob,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/recruiter/jobs/:jobId/duplicate
   */
  static async duplicateJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      const userId = req.user!.id;

      const duplicated = await JobService.duplicateJob(userId, jobId);

      const response: ApiResponse<typeof duplicated> = {
        success: true,
        data: duplicated,
      };

      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/recruiter/jobs/:jobId/archive
   */
  static async archiveJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      const userId = req.user!.id;

      const archived = await JobService.archiveJob(userId, jobId);

      const response: ApiResponse<typeof archived> = {
        success: true,
        data: archived,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}
