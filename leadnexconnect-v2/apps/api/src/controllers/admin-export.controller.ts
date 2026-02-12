import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { adminExportService } from '../services/admin-export.service';
import { logger } from '../utils/logger';

export class AdminExportController {
  /**
   * GET /api/admin/export/users
   * Export users to CSV
   */
  async exportUsers(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;

      const result = await adminExportService.exportUsers(adminId);

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.content);
    } catch (error: any) {
      logger.error('[AdminExportController] Error in exportUsers', { error: error.message });

      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
        success: false,
        error: {
          message: error.message || 'Failed to export users',
          code: error.message.includes('Unauthorized') ? 'FORBIDDEN' : 'INTERNAL_ERROR',
        },
      });
    }
  }

  /**
   * GET /api/admin/export/audit-logs
   * Export audit logs to CSV
   */
  async exportAuditLogs(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;
      const { startDate, endDate, userId, action, entity } = req.query;

      const result = await adminExportService.exportAuditLogs(adminId, {
        startDate: startDate as string,
        endDate: endDate as string,
        userId: userId as string,
        action: action as string,
        entity: entity as string,
      });

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.content);
    } catch (error: any) {
      logger.error('[AdminExportController] Error in exportAuditLogs', { error: error.message });

      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
        success: false,
        error: {
          message: error.message || 'Failed to export audit logs',
          code: error.message.includes('Unauthorized') ? 'FORBIDDEN' : 'INTERNAL_ERROR',
        },
      });
    }
  }

  /**
   * GET /api/admin/export/sessions
   * Export sessions to CSV
   */
  async exportSessions(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;

      const result = await adminExportService.exportSessions(adminId);

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.content);
    } catch (error: any) {
      logger.error('[AdminExportController] Error in exportSessions', { error: error.message });

      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
        success: false,
        error: {
          message: error.message || 'Failed to export sessions',
          code: error.message.includes('Unauthorized') ? 'FORBIDDEN' : 'INTERNAL_ERROR',
        },
      });
    }
  }
}

export const adminExportController = new AdminExportController();
