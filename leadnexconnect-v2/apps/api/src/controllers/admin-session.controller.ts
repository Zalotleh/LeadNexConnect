import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import adminSessionService from '../services/admin-session.service';

class AdminSessionController {
  /**
   * GET /api/admin/sessions
   * Get all active sessions
   */
  async getActiveSessions(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;

      const sessions = await adminSessionService.getActiveSessions(adminId);

      return res.status(200).json({
        success: true,
        data: { sessions },
      });
    } catch (error: any) {
      console.error('Get active sessions error:', error);

      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({
          success: false,
          error: { message: error.message },
        });
      }

      return res.status(500).json({
        success: false,
        error: { message: 'Failed to retrieve sessions' },
      });
    }
  }

  /**
   * GET /api/admin/sessions/stats
   * Get session statistics
   */
  async getSessionStats(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;

      const stats = await adminSessionService.getSessionStats(adminId);

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Get session stats error:', error);

      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({
          success: false,
          error: { message: error.message },
        });
      }

      return res.status(500).json({
        success: false,
        error: { message: 'Failed to retrieve session statistics' },
      });
    }
  }

  /**
   * GET /api/admin/sessions/users/:userId
   * Get sessions for a specific user
   */
  async getUserSessions(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;
      const { userId } = req.params;

      const sessions = await adminSessionService.getUserSessions(adminId, userId);

      return res.status(200).json({
        success: true,
        data: { sessions },
      });
    } catch (error: any) {
      console.error('Get user sessions error:', error);

      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({
          success: false,
          error: { message: error.message },
        });
      }

      return res.status(500).json({
        success: false,
        error: { message: 'Failed to retrieve user sessions' },
      });
    }
  }

  /**
   * DELETE /api/admin/sessions/:sessionId
   * Revoke a specific session
   */
  async revokeSession(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;
      const { sessionId } = req.params;

      const result = await adminSessionService.revokeSession(adminId, sessionId);

      return res.status(200).json({
        success: true,
        data: result,
        message: 'Session revoked successfully',
      });
    } catch (error: any) {
      console.error('Revoke session error:', error);

      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({
          success: false,
          error: { message: error.message },
        });
      }

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: { message: error.message },
        });
      }

      return res.status(500).json({
        success: false,
        error: { message: 'Failed to revoke session' },
      });
    }
  }

  /**
   * DELETE /api/admin/sessions/users/:userId
   * Revoke all sessions for a specific user
   */
  async revokeUserSessions(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;
      const { userId } = req.params;

      const result = await adminSessionService.revokeUserSessions(adminId, userId);

      return res.status(200).json({
        success: true,
        data: result,
        message: `${result.sessionsRevoked} session(s) revoked successfully`,
      });
    } catch (error: any) {
      console.error('Revoke user sessions error:', error);

      if (error.message.includes('Unauthorized') || error.message.includes('Cannot revoke')) {
        return res.status(403).json({
          success: false,
          error: { message: error.message },
        });
      }

      return res.status(500).json({
        success: false,
        error: { message: 'Failed to revoke user sessions' },
      });
    }
  }
}

export default new AdminSessionController();
