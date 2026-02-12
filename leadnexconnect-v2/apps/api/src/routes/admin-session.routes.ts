import { Router } from 'express';
import adminSessionController from '../controllers/admin-session.controller';

const router = Router();

/**
 * Admin Session Routes
 * All routes require authentication + admin role (applied in index.ts)
 */

// GET /api/admin/sessions - Get all active sessions
router.get('/', (req, res) =>
  adminSessionController.getActiveSessions(req as any, res)
);

// GET /api/admin/sessions/stats - Get session statistics
router.get('/stats', (req, res) =>
  adminSessionController.getSessionStats(req as any, res)
);

// GET /api/admin/sessions/users/:userId - Get sessions for a specific user
router.get('/users/:userId', (req, res) =>
  adminSessionController.getUserSessions(req as any, res)
);

// DELETE /api/admin/sessions/:sessionId - Revoke a specific session
router.delete('/:sessionId', (req, res) =>
  adminSessionController.revokeSession(req as any, res)
);

// DELETE /api/admin/sessions/users/:userId - Revoke all sessions for a user
router.delete('/users/:userId/revoke-all', (req, res) =>
  adminSessionController.revokeUserSessions(req as any, res)
);

export default router;
