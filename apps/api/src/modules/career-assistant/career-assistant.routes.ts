import { Router } from 'express';
import { CareerAssistantController } from './career-assistant.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

export const careerAssistantRouter: Router = Router();

// Candidate Grounded RAG Career Assistant (Phase 16)
careerAssistantRouter.post(
  '/conversations',
  requireAuth,
  requireRole('CANDIDATE'),
  CareerAssistantController.createConversation
);

careerAssistantRouter.get(
  '/conversations',
  requireAuth,
  requireRole('CANDIDATE'),
  CareerAssistantController.getConversations
);

careerAssistantRouter.get(
  '/conversations/:conversationId',
  requireAuth,
  requireRole('CANDIDATE'),
  CareerAssistantController.getConversationById
);

careerAssistantRouter.post(
  '/conversations/:conversationId/messages',
  requireAuth,
  requireRole('CANDIDATE'),
  CareerAssistantController.sendMessage
);

careerAssistantRouter.delete(
  '/conversations/:conversationId',
  requireAuth,
  requireRole('CANDIDATE'),
  CareerAssistantController.deleteConversation
);

careerAssistantRouter.post(
  '/messages/:messageId/feedback',
  requireAuth,
  requireRole('CANDIDATE'),
  CareerAssistantController.submitFeedback
);

// Real RAG Intelligence Endpoints (Phase 3)
careerAssistantRouter.post(
  '/skill-gap',
  requireAuth,
  requireRole('CANDIDATE'),
  CareerAssistantController.analyzeSkillGap
);

careerAssistantRouter.post(
  '/recommend-roles',
  requireAuth,
  requireRole('CANDIDATE'),
  CareerAssistantController.recommendRoles
);

careerAssistantRouter.post(
  '/learning-roadmap',
  requireAuth,
  requireRole('CANDIDATE'),
  CareerAssistantController.getLearningRoadmap
);
