import { Request, Response, NextFunction } from 'express';
import { CandidateService } from './candidate.service.js';
import {
  updateProfileSchema,
  addSkillSchema,
  updateSkillSchema,
  createExperienceSchema,
  updateExperienceSchema,
  createEducationSchema,
  updateEducationSchema,
  updateCareerPreferencesSchema,
} from './candidate.schemas.js';
import { ApiResponse } from '@careerforge/types';

export class CandidateController {
  // ============================================================================
  // PROFILE ENDPOINTS
  // ============================================================================

  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CandidateService.getProfile(req.user!.id);
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async getProfileSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CandidateService.getProfileSummary(req.user!.id);
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateProfileSchema.parse(req.body);
      const result = await CandidateService.updateProfile(req.user!.id, validated);
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async deleteProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CandidateService.deleteProfile(req.user!.id);
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  // ============================================================================
  // SKILLS ENDPOINTS
  // ============================================================================

  static async getSkills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const skills = await CandidateService.getSkills(req.user!.id);
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
    } catch (err) {
      next(err);
    }
  }

  static async addSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = addSkillSchema.parse(req.body);
      const skill = await CandidateService.addSkill(req.user!.id, validated);
      const response: ApiResponse<typeof skill> = {
        success: true,
        data: skill,
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async updateSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateSkillSchema.parse(req.body);
      const skill = await CandidateService.updateSkill(req.user!.id, req.params['skillId'] as string, validated);
      const response: ApiResponse<typeof skill> = {
        success: true,
        data: skill,
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async removeSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CandidateService.removeSkill(req.user!.id, req.params['skillId'] as string);
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  // ============================================================================
  // EXPERIENCE ENDPOINTS
  // ============================================================================

  static async getExperience(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const experiences = await CandidateService.getExperience(req.user!.id);
      const response: ApiResponse<typeof experiences> = {
        success: true,
        data: experiences,
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async addExperience(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createExperienceSchema.parse(req.body);
      const experience = await CandidateService.addExperience(req.user!.id, validated);
      const response: ApiResponse<typeof experience> = {
        success: true,
        data: experience,
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async updateExperience(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateExperienceSchema.parse(req.body);
      const experience = await CandidateService.updateExperience(
        req.user!.id,
        req.params['experienceId'] as string,
        validated
      );
      const response: ApiResponse<typeof experience> = {
        success: true,
        data: experience,
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async deleteExperience(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CandidateService.deleteExperience(req.user!.id, req.params['experienceId'] as string);
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  // ============================================================================
  // EDUCATION ENDPOINTS
  // ============================================================================

  static async getEducation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const educations = await CandidateService.getEducation(req.user!.id);
      const response: ApiResponse<typeof educations> = {
        success: true,
        data: educations,
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async addEducation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createEducationSchema.parse(req.body);
      const education = await CandidateService.addEducation(req.user!.id, validated);
      const response: ApiResponse<typeof education> = {
        success: true,
        data: education,
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async updateEducation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateEducationSchema.parse(req.body);
      const education = await CandidateService.updateEducation(
        req.user!.id,
        req.params['educationId'] as string,
        validated
      );
      const response: ApiResponse<typeof education> = {
        success: true,
        data: education,
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async deleteEducation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CandidateService.deleteEducation(req.user!.id, req.params['educationId'] as string);
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  // ============================================================================
  // CAREER PREFERENCES ENDPOINTS
  // ============================================================================

  static async getPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const preferences = await CandidateService.getPreferences(req.user!.id);
      const response: ApiResponse<typeof preferences> = {
        success: true,
        data: preferences,
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateCareerPreferencesSchema.parse(req.body);
      const preferences = await CandidateService.updatePreferences(req.user!.id, validated);
      const response: ApiResponse<typeof preferences> = {
        success: true,
        data: preferences,
        meta: {
          correlationId: req.correlationId,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}
