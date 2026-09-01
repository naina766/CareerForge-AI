import { Router } from 'express';
import { AdminEventController } from './event.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

export const adminEventRouter: Router = Router();

// Strict Admin RBAC Protection
adminEventRouter.use(requireAuth, requireRole('ADMIN'));

adminEventRouter.get('/stats', AdminEventController.getStats);
adminEventRouter.get('/', AdminEventController.listEvents);
adminEventRouter.get('/dlq', AdminEventController.listDLQ);
adminEventRouter.post('/dlq/:eventId/retry', AdminEventController.retryDLQEvent);
