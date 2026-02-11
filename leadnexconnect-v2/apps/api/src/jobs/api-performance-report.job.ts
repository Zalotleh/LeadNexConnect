import * as cron from 'node-cron';
import { logger } from '../utils/logger';
import { apiPerformanceService } from '../services/tracking/api-performance.service';
import { db, users } from '@leadnex/database';
import { eq } from 'drizzle-orm';

/**
 * API Performance Report Job
 * Runs every Monday at 8:00 AM
 * Generates weekly API performance report and logs summary
 * MULTI-USER: Generates separate report for each active user
 */
export class APIPerformanceReportJob {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Start the cron job
   */
  start() {
    // Run every Monday at 8:00 AM
    this.cronJob = cron.schedule('0 8 * * 1', async () => {
      await this.execute();
    });

    logger.info('📅 API Performance Report Job scheduled (Mondays at 8:00 AM)');
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('API Performance Report Job stopped');
    }
  }

  /**
   * Execute the job
   * Generates performance reports for each active user
   */
  async execute() {
    try {
      logger.info('[APIPerformanceReport] Starting weekly performance report');

      const now = new Date();

      // Get all active users
      const activeUsers = await db
        .select()
        .from(users)
        .where(eq(users.status, 'active'));

      logger.info(`[APIPerformanceReport] Generating reports for ${activeUsers.length} active users`);

      // Process each user
      for (const user of activeUsers) {
        try {
          // Get monthly report for this user (using current date)
          const monthlyReport = await apiPerformanceService.getMonthlyReport(now, user.id);
          
          if (monthlyReport.length === 0) {
            logger.info(`[APIPerformanceReport] No API usage data for user ${user.email}`);
            continue;
          }

          // Calculate totals
          const totals = {
            leadsGenerated: 0,
            apiCallsUsed: 0,
            averageQuality: 0,
            demosBooked: 0,
            trialsStarted: 0,
            customersAcquired: 0,
          };

          for (const source of monthlyReport) {
            totals.leadsGenerated += source.leadsGenerated;
            totals.apiCallsUsed += source.apiCallsUsed;
            totals.demosBooked += source.demosBooked;
            totals.trialsStarted += source.trialsStarted;
            totals.customersAcquired += source.customersAcquired;
          }

          totals.averageQuality = Math.round(
            monthlyReport.reduce((sum: number, s: any) => sum + s.averageQuality, 0) / monthlyReport.length
          );

          // Get ROI summary for this user
          const roiSummary = await apiPerformanceService.getROISummary(user.id);

          // Log comprehensive report
          logger.info(`[APIPerformanceReport] Weekly Performance Summary - ${user.email}`, {
            userId: user.id,
            period: `${now.getMonth() + 1}/${now.getFullYear()}`,
            sources: monthlyReport.length,
            totals,
            roi: {
              totalLeads: roiSummary.totalLeadsGenerated,
              conversionRate: `${(roiSummary.averageConversionRate * 100).toFixed(2)}%`,
              costPerLead: `$${roiSummary.averageCostPerLead.toFixed(2)}`,
              totalMRR: `$${roiSummary.totalMRR}`,
            },
          });

          // Log per-source breakdown
          for (const source of monthlyReport) {
            logger.info(`[APIPerformanceReport] ${source.apiSource} Performance (User: ${user.email})`, {
              userId: user.id,
              leadsGenerated: source.leadsGenerated,
              apiCallsUsed: `${source.apiCallsUsed}/${source.quotaLimit}`,
              quotaUsage: `${source.quotaPercentage.toFixed(1)}%`,
              averageQuality: `${source.averageQuality}/100`,
              conversions: {
                demos: source.demosBooked,
                trials: source.trialsStarted,
                customers: source.customersAcquired,
              },
            });

            // Warn if quota is running high
            if (source.quotaPercentage >= 90) {
              logger.warn(`[APIPerformanceReport] ⚠️  ${source.apiSource} quota at ${source.quotaPercentage.toFixed(1)}% (User: ${user.email})`, {
                userId: user.id,
                used: source.apiCallsUsed,
                limit: source.quotaLimit,
                remaining: source.quotaLimit - source.apiCallsUsed,
              });
            }
          }

          // Quality assessment
          if (totals.averageQuality >= 80) {
            logger.info(`[APIPerformanceReport] ✅ Excellent lead quality (80+) - ${user.email}`);
          } else if (totals.averageQuality >= 60) {
            logger.info(`[APIPerformanceReport] ⚡ Good lead quality (60-79) - ${user.email}`);
          } else {
            logger.warn(`[APIPerformanceReport] ⚠️  Lead quality needs improvement (<60) - ${user.email}`);
          }

          // Conversion funnel analysis
          if (roiSummary.totalLeadsGenerated > 0) {
            const demoRate = (roiSummary.totalDemosBooked / roiSummary.totalFirstContact) * 100;
            const trialRate = (roiSummary.totalTrialsStarted / roiSummary.totalDemosBooked) * 100;
            const customerRate = (roiSummary.totalCustomersAcquired / roiSummary.totalTrialsStarted) * 100;

            logger.info(`[APIPerformanceReport] Conversion Funnel - ${user.email}`, {
              userId: user.id,
              leads: roiSummary.totalLeadsGenerated,
              firstContact: roiSummary.totalFirstContact,
              demos: `${roiSummary.totalDemosBooked} (${demoRate.toFixed(1)}%)`,
              trials: `${roiSummary.totalTrialsStarted} (${trialRate.toFixed(1)}%)`,
              customers: `${roiSummary.totalCustomersAcquired} (${customerRate.toFixed(1)}%)`,
            });
          }
        } catch (error: any) {
          logger.error('[APIPerformanceReport] Error generating report for user', {
            userId: user.id,
            userEmail: user.email,
            error: error.message,
          });
        }

        // Small delay between users
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info('[APIPerformanceReport] Weekly performance report completed for all users');
    } catch (error: any) {
      logger.error('[APIPerformanceReport] Fatal error generating performance report', {
        error: error.message,
        stack: error.stack,
      });
    }
  }
}

export const apiPerformanceReportJob = new APIPerformanceReportJob();
