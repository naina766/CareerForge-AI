import { Request, Response, NextFunction } from 'express';
import { SkillService } from './skill.service.js';
import { AppError } from '../../middleware/errorHandler.js';

export class SkillController {
  static async searchSkills(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query.query as string | undefined;
      const category = req.query.category as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await SkillService.searchSkills({ query, category, page, limit });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getSkillById(req: Request, res: Response, next: NextFunction) {
    try {
      const skill = await SkillService.getSkillById(req.params.skillId);
      res.status(200).json({
        success: true,
        data: { skill },
      });
    } catch (err) {
      next(err);
    }
  }

  static async resolveSkills(req: Request, res: Response, next: NextFunction) {
    try {
      const { skills } = req.body;
      if (!Array.isArray(skills)) {
        throw new AppError("Body property 'skills' must be an array of strings", 400, 'BAD_REQUEST');
      }

      const results = await SkillService.resolveSkills(skills);
      res.status(200).json({
        success: true,
        data: { results },
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // ADMIN HANDLERS
  // ==========================================
  static async createSkill(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, slug, category, description, aliases } = req.body;
      if (!name) {
        throw new AppError("Field 'name' is required to create a skill", 400, 'BAD_REQUEST');
      }

      const skill = await SkillService.createSkill({ name, slug, category, description, aliases });
      res.status(201).json({
        success: true,
        data: { skill },
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateSkill(req: Request, res: Response, next: NextFunction) {
    try {
      const skill = await SkillService.updateSkill(req.params.skillId, req.body);
      res.status(200).json({
        success: true,
        data: { skill },
      });
    } catch (err) {
      next(err);
    }
  }

  static async createAlias(req: Request, res: Response, next: NextFunction) {
    try {
      const { alias } = req.body;
      if (!alias) {
        throw new AppError("Field 'alias' is required", 400, 'BAD_REQUEST');
      }

      const created = await SkillService.createAlias(req.params.skillId, alias);
      res.status(201).json({
        success: true,
        data: { alias: created },
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteAlias(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SkillService.deleteAlias(req.params.aliasId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
