import { Request, Response, NextFunction } from 'express';
import { ApplicationService } from './application.service.js';
import {
  createApplicationSchema,
  updateApplicationStatusSchema,
  applicationQuerySchema,
} from './application.schema.js';
import { ApiResponse } from '@careerforge/types';

export class ApplicationController {
  /**
   * POST /api/v1/jobs/:jobId/applications
   * Candidate submits an application to a vacancy.
   */
  static async createApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      const validatedBody = createApplicationSchema.parse(req.body);
      const result = await ApplicationService.createApplication(req.user!.id, jobId, validatedBody);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        meta: {
          requestId: req.requestId,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/applications/me
   * Candidate views their active and past job applications.
   */
  static async getCandidateApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedQuery = applicationQuerySchema.parse(req.query);
      const result = await ApplicationService.getCandidateApplications(req.user!.id, validatedQuery);

      const response: ApiResponse<typeof result.items> = {
        success: true,
        data: result.items,
        meta: {
          requestId: req.requestId,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
          pagination: result.meta,
          stats: result.stats,
        } as any,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/applications/:applicationId
   * Fetch single application details with authorization verification.
   */
  static async getApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const { applicationId } = req.params;
      const result = await ApplicationService.getApplicationById(req.user!.id, req.user!.role, applicationId);

      const response: ApiResponse<typeof result> = {
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
   * POST /api/v1/applications/:applicationId/withdraw
   * Candidate withdraws their active application.
   */
  static async withdrawApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const { applicationId } = req.params;
      const result = await ApplicationService.withdrawApplication(req.user!.id, applicationId);

      const response: ApiResponse<typeof result> = {
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
   * GET /api/v1/recruiter/jobs/:jobId/applications
   * Recruiter views applications for their owned vacancy.
   */
  static async getRecruiterJobApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      const validatedQuery = applicationQuerySchema.parse(req.query);
      const result = await ApplicationService.getRecruiterJobApplications(
        req.user!.id,
        req.user!.role,
        jobId,
        validatedQuery
      );

      const response: ApiResponse<typeof result.items> = {
        success: true,
        data: result.items,
        meta: {
          requestId: req.requestId,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
          total: result.total,
        } as any,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/applications/:applicationId/status
   * Recruiter updates lifecycle status of an application.
   */
  static async updateApplicationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { applicationId } = req.params;
      const validatedBody = updateApplicationStatusSchema.parse(req.body);
      const result = await ApplicationService.updateApplicationStatus(
        req.user!.id,
        req.user!.role,
        applicationId,
        validatedBody
      );

      const response: ApiResponse<typeof result> = {
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
