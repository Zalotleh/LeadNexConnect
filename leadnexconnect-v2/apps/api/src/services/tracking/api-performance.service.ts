import { db } from '@leadnex/database';
import { apiPerformance, leadSourceRoi } from '@leadnex/database';
import { eq, and, gte, lte } from 'drizzle-orm';
import { logger } from '../../utils/logger';

interface APIUsageLog {
  apiSource: string;
  leadsGenerated: number;
  apiCallsUsed: number;
}

export class APIPerformanceService {
  /**
   * Log API usage
   */
  async logAPIUsage(log: APIUsageLog): Promise<void> {
    try {
      const today = new Date();
      const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // Check if record exists for this month
      const existing = await db
        .select()
        .from(apiPerformance)
        .where(
          and(
            eq(apiPerformance.apiSource, log.apiSource),
            eq(apiPerformance.periodStart, periodStart.toISOString().split('T')[0]),
            eq(apiPerformance.periodEnd, periodEnd.toISOString().split('T')[0])
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        await db
          .update(apiPerformance)
          .set({
            leadsGenerated: existing[0].leadsGenerated! + log.leadsGenerated,
            apiCallsUsed: existing[0].apiCallsUsed! + log.apiCallsUsed,
          })
          .where(eq(apiPerformance.id, existing[0].id));
      } else {
        // Create new record
        const limits: Record<string, number> = {
          apollo: 100,
          hunter: 50,
          google_places: 40000,
          peopledatalabs: 100,
        };

        await db.insert(apiPerformance).values({
          apiSource: log.apiSource,
          leadsGenerated: log.leadsGenerated,
          apiCallsUsed: log.apiCallsUsed,
          apiCallsLimit: limits[log.apiSource] || 0,
          periodStart: periodStart.toISOString().split('T')[0],
          periodEnd: periodEnd.toISOString().split('T')[0],
        });
      }

      logger.info('[APIPerformance] Logged API usage', { log });
    } catch (error: any) {
      logger.error('[APIPerformance] Error logging API usage', {
        error: error.message,
      });
    }
  }

  /**
   * Get monthly performance report
   */
  async getMonthlyReport(month?: Date): Promise<any> {
    try {
      const targetMonth = month || new Date();
      const periodStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
      const periodEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);

      const records = await db
        .select()
        .from(apiPerformance)
        .where(
          and(
            gte(apiPerformance.periodStart, periodStart.toISOString().split('T')[0]),
            lte(apiPerformance.periodEnd, periodEnd.toISOString().split('T')[0])
          )
        );

      const report: Record<string, any> = {};

      for (const record of records) {
        const quotaPercent = record.apiCallsLimit 
          ? (record.apiCallsUsed! / record.apiCallsLimit) * 100 
          : 0;

        report[record.apiSource] = {
          leadsGenerated: record.leadsGenerated,
          apiCallsUsed: record.apiCallsUsed,
          apiCallsLimit: record.apiCallsLimit,
          quotaPercent: Math.round(quotaPercent),
          avgLeadScore: record.avgLeadScore ? Number(record.avgLeadScore) : 0,
          hotLeadsPercent: record.hotLeadsPercent ? Number(record.hotLeadsPercent) : 0,
          demosBooked: record.demosBooked,
          trialsStarted: record.trialsStarted,
          customersConverted: record.customersConverted,
          costPerLead: record.costPerLead ? Number(record.costPerLead) : 0,
        };
      }

      return report;
    } catch (error: any) {
      logger.error('[APIPerformance] Error getting monthly report', {
        error: error.message,
      });
      return {};
    }
  }

  /**
   * Update conversion metrics
   */
  async updateConversionMetrics(
    apiSource: string,
    metrics: {
      demosBooked?: number;
      trialsStarted?: number;
      customersConverted?: number;
    }
  ): Promise<void> {
    try {
      const today = new Date();
      const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const existing = await db
        .select()
        .from(apiPerformance)
        .where(
          and(
            eq(apiPerformance.apiSource, apiSource),
            eq(apiPerformance.periodStart, periodStart.toISOString().split('T')[0]),
            eq(apiPerformance.periodEnd, periodEnd.toISOString().split('T')[0])
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(apiPerformance)
          .set({
            demosBooked: (existing[0].demosBooked || 0) + (metrics.demosBooked || 0),
            trialsStarted: (existing[0].trialsStarted || 0) + (metrics.trialsStarted || 0),
            customersConverted: (existing[0].customersConverted || 0) + (metrics.customersConverted || 0),
          })
          .where(eq(apiPerformance.id, existing[0].id));
      }

      logger.info('[APIPerformance] Updated conversion metrics', {
        apiSource,
        metrics,
      });
    } catch (error: any) {
      logger.error('[APIPerformance] Error updating conversion metrics', {
        error: error.message,
      });
    }
  }

  /**
   * Track lead source ROI
   */
  async trackLeadROI(leadId: string, data: {
    source: string;
    demoBookedAt?: Date;
    trialStartedAt?: Date;
    convertedAt?: Date;
    planType?: string;
    mrr?: number;
  }): Promise<void> {
    try {
      await db.insert(leadSourceRoi).values({
        leadId,
        source: data.source,
        demoBookedAt: data.demoBookedAt,
        trialStartedAt: data.trialStartedAt,
        convertedAt: data.convertedAt,
        planType: data.planType,
        mrr: data.mrr?.toString(),
        attributedSource: data.source,
      });

      logger.info('[APIPerformance] Tracked lead ROI', { leadId, data });
    } catch (error: any) {
      logger.error('[APIPerformance] Error tracking lead ROI', {
        error: error.message,
      });
    }
  }

  /**
   * Get ROI summary for all sources
   */
  async getROISummary(): Promise<any> {
    try {
      const allROI = await db.select().from(leadSourceRoi);

      const summary: Record<string, any> = {};

      for (const roi of allROI) {
        if (!summary[roi.source]) {
          summary[roi.source] = {
            totalLeads: 0,
            demosBooked: 0,
            trialsStarted: 0,
            conversions: 0,
            totalMRR: 0,
          };
        }

        summary[roi.source].totalLeads++;
        if (roi.demoBookedAt) summary[roi.source].demosBooked++;
        if (roi.trialStartedAt) summary[roi.source].trialsStarted++;
        if (roi.convertedAt) summary[roi.source].conversions++;
        if (roi.mrr) summary[roi.source].totalMRR += Number(roi.mrr);
      }

      return summary;
    } catch (error: any) {
      logger.error('[APIPerformance] Error getting ROI summary', {
        error: error.message,
      });
      return {};
    }
  }
}

export const apiPerformanceService = new APIPerformanceService();
