import { Router, Response } from 'express';
import { db } from '../db.ts';
import { authMiddleware } from '../middleware.ts';
import type { AuthenticatedRequest } from '../middleware.ts';

const router = Router();

// Get notifications for current user
router.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const notifications = db.getNotifications(req.user!.id);
  res.json({ notifications });
});

// Mark all notifications as read for current user
router.post('/read-all', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  db.markAllNotificationsAsRead(req.user!.id);
  res.json({ success: true });
});

// Clear all notifications for current user
router.delete('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  db.clearNotifications(req.user!.id);
  res.json({ success: true });
});

// Mark single notification as read
router.post('/:id/read', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  db.markNotificationAsRead(req.params.id);
  res.json({ success: true });
});

export default router;
