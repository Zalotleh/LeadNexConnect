import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { adminAnalyticsService } from '../services/admin-analytics.service';
import { logger } from '../utils/logger';

export class AdminAnalyticsController {
  /**
   * GET /api/admin/analytics/users
   * Get analytics for all users (admin only)
   */
  async getAllUsersAnalytics(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;

      const analytics = await adminAnalyticsService.getAllUsersAnalytics(adminId);

      res.json({
        success: true,
        data: analytics,
        message: 'Successfully retrieved all users analytics',
      });
    } catch (error: any) {
      logger.error('[AdminAnalyticsController] Error in getAllUsersAnalytics', {
        error: error.message,
      });

      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
        success: false,
        error: {
          message: error.message || 'Failed to get users analytics',
          code: error.message.includes('Unauthorized') ? 'FORBIDDEN' : 'INTERNAL_ERROR',
        },
      });
    }
  }

  /**
   * GET /api/admin/analytics/users/:userId
   * Get analytics for a specific user (admin only)
   */
  async getUserAnalytics(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;
      const { userId } = req.params;

      const analytics = await adminAnalyticsService.getUserAnalytics(adminId, userId);

      res.json({
        success: true,
        data: analytics,
        message: 'Successfully retrieved user analytics',
      });
    } catch (error: any) {
      logger.error('[AdminAnalyticsController] Error in getUserAnalytics', {
        error: error.message,
        userId: req.params.userId,
      });

      const status = error.message.includes('Unauthorized') ? 403
        : error.message.includes('not found') ? 404
        : 500;

      res.status(status).json({
        success: false,
        error: {
          message: error.message || 'Failed to get user analytics',
          code: error.message.includes('Unauthorized') ? 'FORBIDDEN'
            : error.message.includes('not found') ? 'NOT_FOUND'
            : 'INTERNAL_ERROR',
        },
      });
    }
  }

  /**
   * GET /api/admin/analytics/api-usage
   * Get API usage metrics for all users (admin only)
   */
  async getApiUsageMetrics(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;

      const metrics = await adminAnalyticsService.getApiUsageMetrics(adminId);

      res.json({
        success: true,
        data: metrics,
        message: 'Successfully retrieved API usage metrics',
      });
    } catch (error: any) {
      logger.error('[AdminAnalyticsController] Error in getApiUsageMetrics', {
        error: error.message,
      });

      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
        success: false,
        error: {
          message: error.message || 'Failed to get API usage metrics',
          code: error.message.includes('Unauthorized') ? 'FORBIDDEN' : 'INTERNAL_ERROR',
        },
      });
    }
  }

  /**
   * GET /api/admin/analytics/overview
   * Get system overview statistics (admin only)
   */
  async getSystemOverview(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;

      const overview = await adminAnalyticsService.getSystemOverview(adminId);

      res.json({
        success: true,
        data: overview,
        message: 'Successfully retrieved system overview',
      });
    } catch (error: any) {
      logger.error('[AdminAnalyticsController] Error in getSystemOverview', {
        error: error.message,
      });

      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
        success: false,
        error: {
          message: error.message || 'Failed to get system overview',
          code: error.message.includes('Unauthorized') ? 'FORBIDDEN' : 'INTERNAL_ERROR',
        },
      });
    }
  }

  /**
   * GET /api/admin/analytics/charts/leads-trend
   * Get leads trend data for charts
   */
  async getLeadsTrend(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;
      const trend = await adminAnalyticsService.getLeadsTrend(adminId);

      res.json({
        success: true,
        data: trend,
      });
    } catch (error: any) {
      logger.error('[AdminAnalyticsController] Error in getLeadsTrend', {
        error: error.message,
      });
      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
        success: false,
        error: { message: error.message || 'Failed to get leads trend' },
      });
    }
  }

  /**
   * GET /api/admin/analytics/charts/campaign-distribution
   * Get campaign distribution data for charts
   */
  async getCampaignDistribution(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;
      const distribution = await adminAnalyticsService.getCampaignDistribution(adminId);

      res.json({
        success: true,
        data: distribution,
      });
    } catch (error: any) {
      logger.error('[AdminAnalyticsController] Error in getCampaignDistribution', {
        error: error.message,
      });
      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
        success: false,
        error: { message: error.message || 'Failed to get campaign distribution' },
      });
    }
  }

  /**
   * GET /api/admin/analytics/charts/email-engagement
   * Get email engagement data for charts
   */
  async getEmailEngagement(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;
      const engagement = await adminAnalyticsService.getEmailEngagement(adminId);

      res.json({
        success: true,
        data: engagement,
      });
    } catch (error: any) {
      logger.error('[AdminAnalyticsController] Error in getEmailEngagement', {
        error: error.message,
      });
      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
        success: false,
        error: { message: error.message || 'Failed to get email engagement' },
      });
    }
  }

  /**
   * GET /api/admin/analytics/charts/lead-tiers
   * Get lead tier distribution for charts
   */
  async getLeadTierDistribution(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;
      const distribution = await adminAnalyticsService.getLeadTierDistribution(adminId);

      res.json({
        success: true,
        data: distribution,
      });
    } catch (error: any) {
      logger.error('[AdminAnalyticsController] Error in getLeadTierDistribution', {
        error: error.message,
      });
      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
        success: false,
        error: { message: error.message || 'Failed to get lead tier distribution' },
      });
    }
  }
}

export const adminAnalyticsController = new AdminAnalyticsController();
