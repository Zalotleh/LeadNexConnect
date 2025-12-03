import { Request, Response } from 'express';
import { apiPerformanceService } from '../services/tracking/api-performance.service';
import { logger } from '../utils/logger';

export class APIPerformanceController {
  /**
   * GET /api/performance/report - Get monthly API performance report
   */
  async getMonthlyReport(req: Request, res: Response) {
    try {
      const { month, year, allTime } = req.query;
      
      if (allTime === 'true') {
        // Get all-time performance
        const report = await apiPerformanceService.getAllTimeReport();
        
        res.json({
          success: true,
          data: {
            period: {
              type: 'all-time',
            },
            performance: report,
          },
        });
        return;
      }

      const targetDate = month && year 
        ? new Date(Number(year), Number(month) - 1, 1)
        : new Date();

      const report = await apiPerformanceService.getMonthlyReport(targetDate);

      res.json({
        success: true,
        data: {
          period: {
            month: targetDate.getMonth() + 1,
            year: targetDate.getFullYear(),
          },
          performance: report,
        },
      });
    } catch (error: any) {
      logger.error('[APIPerformanceController] Error getting report', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/performance/conversion - Update conversion metrics
   */
  async updateConversion(req: Request, res: Response) {
    try {
      const { leadId, apiSource, type } = req.body;

      const metrics: Record<string, any> = {};
      
      if (type === 'demo') {
        metrics.demosBooked = 1;
      } else if (type === 'trial') {
        metrics.trialsStarted = 1;
      } else if (type === 'customer') {
        metrics.customersConverted = 1;
      }

      await apiPerformanceService.updateConversionMetrics(apiSource, metrics);

      res.json({
        success: true,
        message: 'Conversion tracked successfully',
      });
    } catch (error: any) {
      logger.error('[APIPerformanceController] Error updating conversion', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * GET /api/performance/roi - Get ROI summary
   */
  async getROISummary(req: Request, res: Response) {
    try {
      const summary = await apiPerformanceService.getROISummary();

      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      logger.error('[APIPerformanceController] Error getting ROI summary', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }
}

export const apiPerformanceController = new APIPerformanceController();
