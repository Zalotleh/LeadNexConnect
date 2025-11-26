import { Router } from 'express';
import { apiPerformanceController } from '../controllers/api-performance.controller';

const router = Router();

router.get('/report', (req, res) => apiPerformanceController.getMonthlyReport(req, res));
router.post('/conversion', (req, res) => apiPerformanceController.updateConversion(req, res));
router.get('/roi', (req, res) => apiPerformanceController.getROISummary(req, res));

export default router;
