import { Router } from 'express';
import { CareerAssistantController } from './career-assistant.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { rateLimiters } from '../../infrastructure/security/rate-limit.js';

export const careerAssistantRouter: Router = Router();

// Candidate Grounded RAG Career Assistant (Phase 16 / Phase 7 AI Security)
careerAssistantRouter.post(
  '/conversations',
  requireAuth,
  requireRole('CANDIDATE'),
  rateLimiters.assistant,
  CareerAssistantController.createConversation
);

careerAssistantRouter.get(
  '/conversations',
  requireAuth,
  requireRole('CANDIDATE'),
  rateLimiters.assistant,
  CareerAssistantController.getConversations
);

careerAssistantRouter.get(
  '/conversations/:conversationId',
  requireAuth,
  requireRole('CANDIDATE'),
  rateLimiters.assistant,
  CareerAssistantController.getConversationById
);

careerAssistantRouter.post(
  '/conversations/:conversationId/messages',
  requireAuth,
  requireRole('CANDIDATE'),
  rateLimiters.assistant,
  CareerAssistantController.sendMessage
);

careerAssistantRouter.delete(
  '/conversations/:conversationId',
  requireAuth,
  requireRole('CANDIDATE'),
  rateLimiters.assistant,
  CareerAssistantController.deleteConversation
);

careerAssistantRouter.post(
  '/messages/:messageId/feedback',
  requireAuth,
  requireRole('CANDIDATE'),
  rateLimiters.assistant,
  CareerAssistantController.submitFeedback
);

// Real RAG Intelligence Endpoints
careerAssistantRouter.post(
  '/skill-gap',
  requireAuth,
  requireRole('CANDIDATE'),
  rateLimiters.assistant,
  CareerAssistantController.analyzeSkillGap
);

careerAssistantRouter.post(
  '/recommend-roles',
  requireAuth,
  requireRole('CANDIDATE'),
  rateLimiters.assistant,
  CareerAssistantController.recommendRoles
);

careerAssistantRouter.post(
  '/learning-roadmap',
  requireAuth,
  requireRole('CANDIDATE'),
  rateLimiters.assistant,
  CareerAssistantController.getLearningRoadmap
);
