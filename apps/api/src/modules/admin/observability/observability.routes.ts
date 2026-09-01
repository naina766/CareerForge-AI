import { Router } from 'express';
import { AdminObservabilityController } from './observability.controller.js';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireRole } from '../../../middleware/role.middleware.js';

export const adminObservabilityRouter: Router = Router();

adminObservabilityRouter.use(requireAuth);
adminObservabilityRouter.use(requireRole('ADMIN'));

adminObservabilityRouter.get('/health', AdminObservabilityController.getSystemHealth);
adminObservabilityRouter.get('/metrics', AdminObservabilityController.getMetrics);
adminObservabilityRouter.get('/workers', AdminObservabilityController.getWorkers);
adminObservabilityRouter.get('/kafka', AdminObservabilityController.getKafkaHealth);
adminObservabilityRouter.get('/errors', AdminObservabilityController.getErrors);
adminObservabilityRouter.get('/system-status', AdminObservabilityController.getSystemStatus);
