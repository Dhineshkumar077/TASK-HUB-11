import type { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';
import type { User, UserRole } from './types.ts';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. No bearer token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const session = db.findSession(token);
  if (!session) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  const user = db.findUserById(session.userId);
  if (!user) {
    res.status(401).json({ error: 'User account not found.' });
    return;
  }

  if (user.role !== 'ADMIN' && user.status === 'SUSPENDED') {
    res.status(403).json({
      error: `Your account has been suspended: ${user.suspensionReason || 'Contact TaskHub administration.'}`,
      accountStatus: 'SUSPENDED'
    });
    return;
  }

  if (user.role !== 'ADMIN' && user.status === 'BANNED') {
    res.status(403).json({
      error: 'Your account has been permanently banned from TaskHub.',
      accountStatus: 'BANNED'
    });
    return;
  }

  req.user = user;
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!roles.includes(req.user.role) && req.user.role !== 'ADMIN') {
      res.status(403).json({
        error: `Access denied. This endpoint is restricted to: ${roles.join(', ')}.`,
      });
      return;
    }

    next();
  };
}
