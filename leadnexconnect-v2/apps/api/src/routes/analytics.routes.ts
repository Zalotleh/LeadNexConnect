import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';

const router = Router();

router.get('/dashboard', (req, res) => analyticsController.getDashboardStats(req, res));
router.get('/campaigns/:id', (req, res) => analyticsController.getCampaignAnalytics(req, res));
router.get('/leads/timeline', (req, res) => analyticsController.getLeadsTimeline(req, res));

export default router;
