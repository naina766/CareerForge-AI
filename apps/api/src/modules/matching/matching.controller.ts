import { Request, Response, NextFunction } from 'express';
import { MatchingService } from './matching.service.js';
import { ApiResponse, MatchReport } from '@careerforge/types';

export class MatchingController {
  /**
   * GET /api/v1/jobs/:jobId/match
   * Candidate inspects their explainable match score against a job vacancy.
   */
  static async getCandidateJobMatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      const forceRecompute = req.query.refresh === 'true';

      const result = await MatchingService.getCandidateJobMatch(
        req.user!.id,
        jobId,
        forceRecompute
      );

      const response: ApiResponse<MatchReport> = {
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
   * GET /api/v1/recruiter/jobs/:jobId/candidates/:candidateId/match
   * Recruiter inspects explainable match score for an applicant on their owned vacancy.
   */
  static async getRecruiterCandidateMatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId, candidateId } = req.params;

      const result = await MatchingService.getRecruiterCandidateMatch(
        req.user!.id,
        req.user!.role,
        jobId,
        candidateId
      );

      const response: ApiResponse<MatchReport> = {
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
