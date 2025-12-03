import { db } from '@leadnex/database';
import { apiPerformance, leadSourceRoi, leads, apiConfig } from '@leadnex/database';
import { eq, and, gte, lte, lt, sql } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { configService } from '../config.service';

interface APIUsageLog {
  apiSource: string;
  leadsGenerated: number;
  apiCallsUsed: number;
}

export class APIPerformanceService {
  private apiLimitsCache: Record<string, number> = {};
  private apiCostsCache: Record<string, { perLead: number; perCall: number }> = {};
  private cacheExpiry: number = 0;
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  /**
   * Get API limits and costs from database (with caching)
   */
  private async getApiConfigsFromDB(): Promise<void> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.cacheExpiry > now) {
      return;
    }

    try {
      const configs = await configService.getActiveApiConfigs();
      
      // Reset caches
      this.apiLimitsCache = {};
      this.apiCostsCache = {};
      
      // Populate from database
      for (const config of configs) {
        this.apiLimitsCache[config.apiSource] = config.monthlyLimit || 0;
        this.apiCostsCache[config.apiSource] = {
          perLead: parseFloat(config.costPerLead || '0'),
          perCall: parseFloat(config.costPerAPICall || '0'),
        };
      }
      
      // Set default values if not in database
      const defaults = [
        { source: 'apollo', limit: 100, costPerLead: 8.75, costPerCall: 0 },
        { source: 'hunter', limit: 50, costPerLead: 12.5, costPerCall: 0 },
        { source: 'google_places', limit: 40000, costPerLead: 3.5, costPerCall: 0 },
        { source: 'peopledatalabs', limit: 100, costPerLead: 6, costPerCall: 0 },
      ];
      
      for (const def of defaults) {
        if (!this.apiLimitsCache[def.source]) {
          this.apiLimitsCache[def.source] = def.limit;
          this.apiCostsCache[def.source] = {
            perLead: def.costPerLead,
            perCall: def.costPerCall,
          };
        }
      }
      
      // Update cache expiry
      this.cacheExpiry = now + this.cacheDuration;
      
      logger.info('[APIPerformance] API configs cached from database', {
        sources: Object.keys(this.apiLimitsCache),
      });
    } catch (error: any) {
      logger.error('[APIPerformance] Error loading API configs from database', {
        error: error.message,
      });
      
      // Fall back to hardcoded defaults on error
      this.apiLimitsCache = {
        apollo: 100,
        hunter: 50,
        google_places: 40000,
        peopledatalabs: 100,
      };
      this.apiCostsCache = {
        apollo: { perLead: 8.75, perCall: 0 },
        hunter: { perLead: 12.5, perCall: 0 },
        google_places: { perLead: 3.5, perCall: 0 },
        peopledatalabs: { perLead: 6, perCall: 0 },
      };
      
      // Still set cache expiry to avoid repeated failed queries
      this.cacheExpiry = now + this.cacheDuration;
    }
  }
  /**
   * Log API usage - creates or updates performance tracking
   */
  async logAPIUsage(log: APIUsageLog): Promise<void> {
    try {
      // Ensure we have latest config
      await this.getApiConfigsFromDB();
      
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
        // Update existing record - just increment API calls
        await db
          .update(apiPerformance)
          .set({
            apiCallsUsed: existing[0].apiCallsUsed! + log.apiCallsUsed,
          })
          .where(eq(apiPerformance.id, existing[0].id));
      } else {
        // Create new record with limit from config
        await db.insert(apiPerformance).values({
          apiSource: log.apiSource,
          leadsGenerated: 0, // Will be calculated from leads table
          apiCallsUsed: log.apiCallsUsed,
          apiCallsLimit: this.apiLimitsCache[log.apiSource] || 0,
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
   * Get monthly performance report - calculates real-time stats from leads table
   */
  async getMonthlyReport(month?: Date): Promise<any> {
    try {
      // Load API configs from database
      await this.getApiConfigsFromDB();
      
      const targetMonth = month || new Date();
      const periodStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
      periodStart.setHours(0, 0, 0, 0);
      
      const periodEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 1);
      periodEnd.setHours(0, 0, 0, 0);

      // Get all leads created in this period
      const allLeads = await db
        .select()
        .from(leads)
        .where(
          and(
            gte(leads.createdAt, periodStart),
            lt(leads.createdAt, periodEnd)
          )
        );

      // Group leads by source and calculate metrics
      const report: Record<string, any> = {};

      // Group automated leads by source
      const automatedLeads = allLeads.filter(l => l.sourceType === 'automated');
      const sourceGroups = automatedLeads.reduce((acc, lead) => {
        if (!acc[lead.source]) {
          acc[lead.source] = [];
        }
        acc[lead.source].push(lead);
        return acc;
      }, {} as Record<string, any[]>);

      // Calculate metrics for each API source
      for (const [source, sourceLeads] of Object.entries(sourceGroups)) {
        const totalLeads = sourceLeads.length;
        const avgScore = totalLeads > 0
          ? Math.round(sourceLeads.reduce((sum, l) => sum + (l.qualityScore || 0), 0) / totalLeads)
          : 0;
        const hotLeads = sourceLeads.filter(l => (l.qualityScore || 0) >= 80).length;
        const hotLeadsPercent = totalLeads > 0 ? Math.round((hotLeads / totalLeads) * 100) : 0;

        // Count conversions based on lead status
        const demosBooked = sourceLeads.filter(l => 
          ['contacted', 'follow_up_1', 'follow_up_2', 'responded', 'interested', 'converted'].includes(l.status)
        ).length;
        const trialsStarted = sourceLeads.filter(l => 
          ['interested', 'converted'].includes(l.status)
        ).length;
        const customersConverted = sourceLeads.filter(l => l.status === 'converted').length;

        // Check if we have recorded API usage data for this source
        const apiRecord = await db
          .select()
          .from(apiPerformance)
          .where(
            and(
              eq(apiPerformance.apiSource, source),
              gte(apiPerformance.periodStart, periodStart.toISOString().split('T')[0]),
              lte(apiPerformance.periodEnd, periodEnd.toISOString().split('T')[0])
            )
          )
          .limit(1);

        const apiCallsUsed = apiRecord[0]?.apiCallsUsed || totalLeads; // Estimate 1 call per lead if no data
        const apiCallsLimit = this.apiLimitsCache[source] || 0;
        const quotaPercent = apiCallsLimit > 0 ? Math.round((apiCallsUsed / apiCallsLimit) * 100) : 0;
        const costPerLead = this.apiCostsCache[source]?.perLead || 0;

        report[source] = {
          leadsGenerated: totalLeads,
          apiCallsUsed,
          apiCallsLimit,
          quotaPercent,
          avgLeadScore: avgScore,
          hotLeadsPercent,
          demosBooked,
          trialsStarted,
          customersConverted,
          costPerLead,
        };
      }

      // Add imported leads statistics
      const importedLeads = allLeads.filter(l => l.sourceType === 'manual_import');
      
      if (importedLeads.length > 0) {
        const totalImported = importedLeads.length;
        const avgScore = Math.round(
          importedLeads.reduce((sum, l) => sum + (l.qualityScore || 0), 0) / totalImported
        );
        const hotLeads = importedLeads.filter(l => (l.qualityScore || 0) >= 80).length;
        const hotLeadsPercent = Math.round((hotLeads / totalImported) * 100);

        // Count conversions for imported leads
        const demosBooked = importedLeads.filter(l => 
          l.status && ['contacted', 'follow_up_1', 'follow_up_2', 'responded', 'interested', 'converted'].includes(l.status)
        ).length;
        const trialsStarted = importedLeads.filter(l => 
          l.status && ['interested', 'converted'].includes(l.status)
        ).length;
        const customersConverted = importedLeads.filter(l => l.status === 'converted').length;

        report['manual_import'] = {
          leadsGenerated: totalImported,
          apiCallsUsed: 0,
          apiCallsLimit: 0,
          quotaPercent: 0,
          avgLeadScore: avgScore,
          hotLeadsPercent,
          demosBooked,
          trialsStarted,
          customersConverted,
          costPerLead: 0,
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
   * Get all-time performance report
   */
  async getAllTimeReport(): Promise<any> {
    try {
      // Load API configs from database
      await this.getApiConfigsFromDB();
      
      // Get ALL leads (no date filter)
      const allLeads = await db.select().from(leads);

      // Group leads by source and calculate metrics
      const report: Record<string, any> = {};

      // Group automated leads by source
      const automatedLeads = allLeads.filter(l => l.sourceType === 'automated');
      const sourceGroups = automatedLeads.reduce((acc, lead) => {
        if (!acc[lead.source]) {
          acc[lead.source] = [];
        }
        acc[lead.source].push(lead);
        return acc;
      }, {} as Record<string, any[]>);

      // Calculate metrics for each API source
      for (const [source, sourceLeads] of Object.entries(sourceGroups)) {
        const totalLeads = sourceLeads.length;
        const avgScore = totalLeads > 0
          ? Math.round(sourceLeads.reduce((sum, l) => sum + (l.qualityScore || 0), 0) / totalLeads)
          : 0;
        const hotLeads = sourceLeads.filter(l => (l.qualityScore || 0) >= 80).length;
        const hotLeadsPercent = totalLeads > 0 ? Math.round((hotLeads / totalLeads) * 100) : 0;

        const demosBooked = sourceLeads.filter(l => 
          ['contacted', 'follow_up_1', 'follow_up_2', 'responded', 'interested', 'converted'].includes(l.status)
        ).length;
        const trialsStarted = sourceLeads.filter(l => 
          ['interested', 'converted'].includes(l.status)
        ).length;
        const customersConverted = sourceLeads.filter(l => l.status === 'converted').length;

        const apiCallsUsed = totalLeads; // Estimate
        const apiCallsLimit = this.apiLimitsCache[source] || 0;
        const quotaPercent = 0; // No quota for all-time view
        const costPerLead = this.apiCostsCache[source]?.perLead || 0;

        report[source] = {
          leadsGenerated: totalLeads,
          apiCallsUsed,
          apiCallsLimit,
          quotaPercent,
          avgLeadScore: avgScore,
          hotLeadsPercent,
          demosBooked,
          trialsStarted,
          customersConverted,
          costPerLead,
        };
      }

      // Add imported leads statistics
      const importedLeads = allLeads.filter(l => l.sourceType === 'manual_import');
      
      if (importedLeads.length > 0) {
        const totalImported = importedLeads.length;
        const avgScore = Math.round(
          importedLeads.reduce((sum, l) => sum + (l.qualityScore || 0), 0) / totalImported
        );
        const hotLeads = importedLeads.filter(l => (l.qualityScore || 0) >= 80).length;
        const hotLeadsPercent = Math.round((hotLeads / totalImported) * 100);

        const demosBooked = importedLeads.filter(l => 
          l.status && ['contacted', 'follow_up_1', 'follow_up_2', 'responded', 'interested', 'converted'].includes(l.status)
        ).length;
        const trialsStarted = importedLeads.filter(l => 
          l.status && ['interested', 'converted'].includes(l.status)
        ).length;
        const customersConverted = importedLeads.filter(l => l.status === 'converted').length;

        report['manual_import'] = {
          leadsGenerated: totalImported,
          apiCallsUsed: 0,
          apiCallsLimit: 0,
          quotaPercent: 0,
          avgLeadScore: avgScore,
          hotLeadsPercent,
          demosBooked,
          trialsStarted,
          customersConverted,
          costPerLead: 0,
        };
      }

      return report;
    } catch (error: any) {
      logger.error('[APIPerformance] Error getting all-time report', {
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
