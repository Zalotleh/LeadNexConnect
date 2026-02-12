import { Router } from 'express';
import adminAuditLogController from '../controllers/admin-audit-log.controller';

const router = Router();

/**
 * Admin Audit Log Routes
 * All routes require authentication + admin role (applied in index.ts)
 */

// GET /api/admin/audit-logs - Get audit logs with filtering and pagination
router.get('/', (req, res) => 
  adminAuditLogController.getAuditLogs(req as any, res)
);

// GET /api/admin/audit-logs/stats - Get audit log statistics
router.get('/stats', (req, res) => 
  adminAuditLogController.getAuditStats(req as any, res)
);

// GET /api/admin/audit-logs/users/:userId - Get user's audit history
router.get('/users/:userId', (req, res) => 
  adminAuditLogController.getUserAuditHistory(req as any, res)
);

export default router;
