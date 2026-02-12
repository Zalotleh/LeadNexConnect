import { Router } from 'express';
import { adminAnalyticsController } from '../controllers/admin-analytics.controller';

const router = Router();

/**
 * Admin Analytics Routes
 * All routes here require authMiddleware and requireAdmin middleware
 * which are applied in index.ts
 */

// Get system overview statistics
router.get('/overview', (req, res) => 
  adminAnalyticsController.getSystemOverview(req as any, res)
);

// Get analytics for all users
router.get('/users', (req, res) => 
  adminAnalyticsController.getAllUsersAnalytics(req as any, res)
);

// Get analytics for a specific user
router.get('/users/:userId', (req, res) => 
  adminAnalyticsController.getUserAnalytics(req as any, res)
);

// Get API usage metrics for all users
router.get('/api-usage', (req, res) => 
  adminAnalyticsController.getApiUsageMetrics(req as any, res)
);

// Chart data endpoints
router.get('/charts/leads-trend', (req, res) =>
  adminAnalyticsController.getLeadsTrend(req as any, res)
);

router.get('/charts/campaign-distribution', (req, res) =>
  adminAnalyticsController.getCampaignDistribution(req as any, res)
);

router.get('/charts/email-engagement', (req, res) =>
  adminAnalyticsController.getEmailEngagement(req as any, res)
);

router.get('/charts/lead-tiers', (req, res) =>
  adminAnalyticsController.getLeadTierDistribution(req as any, res)
);

export default router;
