import { Router, Response } from 'express';
import { db } from '../db.ts';

const router = Router();

// Get active announcements
router.get('/', (req, res: Response) => {
  const { role } = req.query;
  const announcements = db.getAnnouncements().filter((a) => {
    if (!a.isActive) return false;
    if (a.expiresAt && new Date(a.expiresAt).getTime() < Date.now()) return false;
    if (a.targetAudience === 'ALL') return true;
    if (role && a.targetAudience === String(role)) return true;
    return false;
  });

  res.json({ announcements });
});

export default router;
