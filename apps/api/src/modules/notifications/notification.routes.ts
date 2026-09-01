import { Router } from 'express';
import { NotificationController } from './notification.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

export const notificationRouter: Router = Router();

notificationRouter.use(requireAuth);
notificationRouter.use(requireRole('CANDIDATE'));

// Notification CRUD endpoints
notificationRouter.get('/', NotificationController.getNotifications);
notificationRouter.get('/unread-count', NotificationController.getUnreadCount);
notificationRouter.patch('/read-all', NotificationController.markAllAsRead);
notificationRouter.patch('/:id/read', NotificationController.markAsRead);
notificationRouter.delete('/:id', NotificationController.deleteNotification);

// Notification Preferences
notificationRouter.get('/preferences', NotificationController.getPreferences);
notificationRouter.patch('/preferences', NotificationController.updatePreferences);
