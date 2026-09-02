import { Router } from 'express';
import { ObservabilityController } from './observability.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

export const observabilityRouter: Router = Router();

// Public System Health & Probes
observabilityRouter.get('/health/system', ObservabilityController.getSystemHealth);
observabilityRouter.get('/live', ObservabilityController.getLiveness);
observabilityRouter.get('/ready', ObservabilityController.getReadiness);

// Admin Observability Endpoints (RBAC: ADMIN ONLY)
const adminSubRouter = Router();
adminSubRouter.use(requireAuth);
adminSubRouter.use(requireRole('ADMIN'));

adminSubRouter.get('/health', ObservabilityController.getAdminHealth);
adminSubRouter.get('/summary', ObservabilityController.getAdminSummary);
adminSubRouter.get('/metrics', ObservabilityController.getMetrics);
adminSubRouter.get('/alerts', ObservabilityController.getAlerts);
adminSubRouter.patch('/alerts/:alertId/acknowledge', ObservabilityController.acknowledgeAlert);
adminSubRouter.patch('/alerts/:alertId/resolve', ObservabilityController.resolveAlert);
adminSubRouter.get('/traces', ObservabilityController.getRecentTraces);
adminSubRouter.get('/traces/:traceId', ObservabilityController.getTraceTimeline);

observabilityRouter.use('/admin/observability', adminSubRouter);
