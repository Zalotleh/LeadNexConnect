import { Router } from 'express';
import { adminExportController } from '../controllers/admin-export.controller';

const router = Router();

/**
 * Admin Export Routes
 * All routes require authMiddleware and requireAdmin middleware
 * which are applied in index.ts
 */

// Export users to CSV
router.get('/users', (req, res) => adminExportController.exportUsers(req as any, res));

// Export audit logs to CSV
router.get('/audit-logs', (req, res) => adminExportController.exportAuditLogs(req as any, res));

// Export sessions to CSV
router.get('/sessions', (req, res) => adminExportController.exportSessions(req as any, res));

export default router;
