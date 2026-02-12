import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import adminAuditLogService from '../services/admin-audit-log.service';

class AdminAuditLogController {
  /**
   * GET /api/admin/audit-logs
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;
      
      const params = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        userId: req.query.userId as string | undefined,
        action: req.query.action as string | undefined,
        entity: req.query.entity as string | undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        search: req.query.search as string | undefined,
      };

      const result = await adminAuditLogService.getAuditLogs(adminId, params);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Get audit logs error:', error);
      
      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({
          success: false,
          error: { message: error.message },
        });
      }

      return res.status(500).json({
        success: false,
        error: { message: 'Failed to retrieve audit logs' },
      });
    }
  }

  /**
   * GET /api/admin/audit-logs/stats
   * Get audit log statistics
   */
  async getAuditStats(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;

      const stats = await adminAuditLogService.getAuditStats(adminId);

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Get audit stats error:', error);
      
      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({
          success: false,
          error: { message: error.message },
        });
      }

      return res.status(500).json({
        success: false,
        error: { message: 'Failed to retrieve audit statistics' },
      });
    }
  }

  /**
   * GET /api/admin/audit-logs/users/:userId
   * Get user's audit log history
   */
  async getUserAuditHistory(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;
      const { userId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const logs = await adminAuditLogService.getUserAuditHistory(adminId, userId, limit);

      return res.status(200).json({
        success: true,
        data: { logs },
      });
    } catch (error: any) {
      console.error('Get user audit history error:', error);
      
      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({
          success: false,
          error: { message: error.message },
        });
      }

      return res.status(500).json({
        success: false,
        error: { message: 'Failed to retrieve user audit history' },
      });
    }
  }
}

export default new AdminAuditLogController();
