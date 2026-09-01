import { Router } from 'express';
import { SkillController } from './skill.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

export const skillRouter: Router = Router();
export const adminSkillRouter: Router = Router();

// Public / Authenticated skill lookup endpoints
skillRouter.get('/', SkillController.searchSkills);
skillRouter.post('/resolve', SkillController.resolveSkills);
skillRouter.get('/:skillId', SkillController.getSkillById);

// Admin-only taxonomy management endpoints
adminSkillRouter.use(requireAuth);
adminSkillRouter.use(requireRole('ADMIN'));

adminSkillRouter.post('/skills', SkillController.createSkill);
adminSkillRouter.patch('/skills/:skillId', SkillController.updateSkill);
adminSkillRouter.post('/skills/:skillId/aliases', SkillController.createAlias);
adminSkillRouter.delete('/skill-aliases/:aliasId', SkillController.deleteAlias);
