import * as cron from 'node-cron';
import { db, campaigns, leadBatches, leads, users } from '@leadnex/database';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { apolloService } from '../services/lead-generation/apollo.service';
import { googlePlacesService } from '../services/lead-generation/google-places.service';
import { enrichmentPipelineService } from '../services/crm/enrichment-pipeline.service';
import { leadScoringV2Service } from '../services/crm/lead-scoring-v2.service';
import { websiteAnalysisService } from '../services/analysis/website-analysis.service';
import { apiPerformanceService } from '../services/tracking/api-performance.service';

/**
 * Daily Lead Generation Job
 * Runs every day at 9:00 AM
 * Generates leads for all active campaigns with enhanced scoring and analysis
 * MULTI-USER: Processes each user's campaigns separately to maintain data isolation
 */
export class DailyLeadGenerationJob {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Start the cron job
   */
  start() {
    // Run every hour to check for campaigns that should run
    this.cronJob = cron.schedule('0 * * * *', async () => {
      await this.execute();
    });

    logger.info('📅 Daily Lead Generation Job scheduled (runs hourly, checks campaign schedules)');
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Daily Lead Generation Job stopped');
    }
  }

  /**
   * Execute the job
   * Iterates through all active users and processes their campaigns
   */
  async execute() {
    try {
      logger.info('[DailyLeadGeneration] Starting daily lead generation');

      // Get all active users
      const activeUsers = await db
        .select()
        .from(users)
        .where(eq(users.status, 'active'));

      logger.info(`[DailyLeadGeneration] Processing campaigns for ${activeUsers.length} active users`);

      // Process each user's campaigns
      for (const user of activeUsers) {
        try {
          // Get all active campaigns with daily schedule for this user
          const activeCampaigns = await db
            .select()
            .from(campaigns)
            .where(and(
              eq(campaigns.userId, user.id),
              eq(campaigns.status, 'active')
            ));

          if (activeCampaigns.length === 0) {
            continue;
          }

          logger.info(`[DailyLeadGeneration] Found ${activeCampaigns.length} active campaigns for user ${user.email}`);

          // Process each campaign
          for (const campaign of activeCampaigns) {
            // Only process campaigns with daily schedule
            if (campaign.scheduleType !== 'daily') {
              continue;
            }

            // Check if we should run based on schedule time
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            
            // Parse campaign schedule time (format: "HH:MM")
            if (campaign.scheduleTime) {
              const [scheduleHour, scheduleMinute] = campaign.scheduleTime.split(':').map(Number);
              
              // Only run if current hour matches AND we haven't run in the last hour
              if (currentHour !== scheduleHour) {
                continue;
              }
              
              // Check if already ran today
              if (campaign.lastRunAt) {
                const lastRun = new Date(campaign.lastRunAt);
                const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);
                
                if (hoursSinceLastRun < 23) {
                  logger.info(`[DailyLeadGeneration] Skipping campaign ${campaign.id} - already ran today`);
                  continue;
                }
              }
              
              logger.info(`[DailyLeadGeneration] Running campaign ${campaign.id} at scheduled time ${campaign.scheduleTime} (User: ${user.email})`);
            }

            try {
              await this.generateLeadsForCampaign(campaign);
            } catch (error: any) {
              logger.error('[DailyLeadGeneration] Error generating leads for campaign', {
                campaignId: campaign.id,
                campaignName: campaign.name,
                userId: user.id,
                error: error.message,
              });
            }

            // Add delay between campaigns to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error: any) {
          logger.error('[DailyLeadGeneration] Error processing campaigns for user', {
            userId: user.id,
            userEmail: user.email,
            error: error.message,
          });
        }

        // Add delay between users to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      logger.info('[DailyLeadGeneration] Daily lead generation completed');
    } catch (error: any) {
      logger.error('[DailyLeadGeneration] Fatal error in daily lead generation', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Generate leads for a specific campaign
   */
  private async generateLeadsForCampaign(campaign: any) {
    logger.info(`[DailyLeadGeneration] Generating leads for campaign: ${campaign.name}`);

    // Create batch record first
    const batchName = `${campaign.name} - Daily ${new Date().toLocaleDateString()}`;
    const batch = await db.insert(leadBatches).values({
      name: batchName,
      uploadedBy: 'system',
      totalLeads: 0,
      successfulImports: 0,
      failedImports: 0,
      duplicatesSkipped: 0,
      importSettings: {
        campaignId: campaign.id,
        industry: campaign.industry,
        countries: campaign.targetCountries,
        cities: campaign.targetCities,
        sources: this.getActiveSources(campaign),
      }
    }).returning();

    const batchId = batch[0].id;
    logger.info(`[DailyLeadGeneration] Created batch: ${batchId} - ${batchName}`);

    const rawLeads: any[] = [];
    const targetCount = campaign.leadsPerDay || 50;
    const activeSources = this.countActiveSources(campaign);
    const leadsPerSource = Math.ceil(targetCount / activeSources);
    const apiMetrics: { [key: string]: { leads: number; calls: number } } = {};

    // Generate leads from Apollo.io
    if (campaign.usesApollo) {
      try {
        const apolloLeads = await apolloService.searchLeads({
          industry: campaign.industry,
          country: campaign.targetCountries?.[0] || 'United States',
          maxResults: Math.min(leadsPerSource, 100),
        });
        rawLeads.push(...apolloLeads.map((lead: any) => ({ ...lead, source: 'apollo' })));
        apiMetrics.apollo = { leads: apolloLeads.length, calls: Math.ceil(apolloLeads.length / 10) };
        logger.info(`[DailyLeadGeneration] Fetched ${apolloLeads.length} leads from Apollo`);
      } catch (error: any) {
        logger.error('[DailyLeadGeneration] Error fetching from Apollo', {
          campaignId: campaign.id,
          error: error.message,
        });
      }
    }

    // Generate leads from Google Places
    if (campaign.usesGooglePlaces) {
      try {
        const placesLeads = await googlePlacesService.searchLeads({
          industry: campaign.industry,
          city: campaign.targetCities?.[0] || campaign.targetCountries?.[0] || 'United States',
          maxResults: leadsPerSource,
        });
        rawLeads.push(...placesLeads.map((lead: any) => ({ ...lead, source: 'google_places' })));
        apiMetrics.google_places = { leads: placesLeads.length, calls: placesLeads.length };
        logger.info(`[DailyLeadGeneration] Fetched ${placesLeads.length} leads from Google Places`);
      } catch (error: any) {
        logger.error('[DailyLeadGeneration] Error fetching from Google Places', {
          campaignId: campaign.id,
          error: error.message,
        });
      }
    }

    if (rawLeads.length === 0) {
      logger.warn(`[DailyLeadGeneration] No leads generated for campaign ${campaign.id}`);
      return;
    }

    // Analyze websites for leads with website data
    logger.info(`[DailyLeadGeneration] Analyzing websites for ${rawLeads.length} leads`);
    for (const lead of rawLeads) {
      if (lead.website) {
        try {
          const analysis = await websiteAnalysisService.analyzeWebsite(lead.website);
          if (analysis) {
            lead.hasBookingKeywords = analysis.hasBookingKeywords;
            lead.bookingKeywordScore = analysis.bookingKeywordScore;
            lead.currentBookingTool = analysis.currentBookingTool;
            lead.hasAppointmentForm = analysis.hasAppointmentForm;
            lead.hasOnlineBooking = analysis.hasCalendar;
            lead.hasMultiLocation = analysis.multiLocation;
            lead.servicesCount = analysis.servicesCount;
          }
        } catch (error: any) {
          logger.error('[DailyLeadGeneration] Website analysis failed', {
            website: lead.website,
            error: error.message,
          });
        }
      }
    }

    // Apply enhanced scoring
    logger.info(`[DailyLeadGeneration] Applying V2 scoring to ${rawLeads.length} leads`);
    const scoredLeads = rawLeads.map(lead => {
      const qualityScore = leadScoringV2Service.calculateScore(lead);
      const digitalMaturityScore = leadScoringV2Service.calculateDigitalMaturity(lead);
      const bookingPotential = leadScoringV2Service.calculateBookingPotential(lead);
      
      return {
        ...lead,
        batchId, // Assign batch ID to each lead
        qualityScore,
        digitalMaturityScore,
        bookingPotential,
      };
    });

    // Enrich leads
    logger.info(`[DailyLeadGeneration] Enriching ${scoredLeads.length} leads`);
    const enrichmentResults = await enrichmentPipelineService.enrichBatch(scoredLeads);

    const successCount = enrichmentResults.filter(r => r.success && !r.isDuplicate).length;
    const duplicateCount = enrichmentResults.filter(r => r.isDuplicate).length;
    const failedCount = enrichmentResults.filter(r => !r.success && !r.isDuplicate).length;
    
    // Track API performance
    for (const [source, metrics] of Object.entries(apiMetrics)) {
      try {
        await apiPerformanceService.logAPIUsage({
          apiSource: source,
          leadsGenerated: metrics.leads,
          apiCallsUsed: metrics.calls,
        });
      } catch (error: any) {
        logger.error('[DailyLeadGeneration] Failed to log API performance', {
          source,
          error: error.message,
        });
      }
    }

    // Calculate tier breakdown
    const hotLeads = scoredLeads.filter(l => l.qualityScore >= 80).length;
    const warmLeads = scoredLeads.filter(l => l.qualityScore >= 60 && l.qualityScore < 80).length;
    const coldLeads = scoredLeads.filter(l => l.qualityScore < 60).length;

    // Update batch metrics
    await db
      .update(leadBatches)
      .set({
        totalLeads: rawLeads.length,
        successfulImports: successCount,
        failedImports: failedCount,
        duplicatesSkipped: duplicateCount,
      })
      .where(eq(leadBatches.id, batchId));

    // Update campaign metrics and link to batch
    await db
      .update(campaigns)
      .set({
        leadsGenerated: (campaign.leadsGenerated || 0) + successCount,
        lastRunAt: new Date(),
        batchId, // Link campaign to the batch used
      })
      .where(eq(campaigns.id, campaign.id));

    logger.info(`[DailyLeadGeneration] Campaign ${campaign.name} completed`, {
      batchId,
      batchName,
      rawLeads: rawLeads.length,
      enriched: successCount,
      duplicates: duplicateCount,
      failed: failedCount,
      tiers: { hot: hotLeads, warm: warmLeads, cold: coldLeads },
    });
  }

  /**
   * Count active lead sources
   */
  private countActiveSources(campaign: any): number {
    let count = 0;
    if (campaign.usesApollo) count++;
    if (campaign.usesGooglePlaces) count++;
    if (campaign.usesPeopleDL) count++;
    if (campaign.usesLinkedin) count++;
    return Math.max(count, 1);
  }

  /**
   * Get list of active lead sources
   */
  private getActiveSources(campaign: any): string[] {
    const sources: string[] = [];
    if (campaign.usesApollo) sources.push('apollo');
    if (campaign.usesGooglePlaces) sources.push('google_places');
    if (campaign.usesPeopleDL) sources.push('peopledatalabs');
    if (campaign.usesLinkedin) sources.push('linkedin');
    return sources;
  }
}

export const dailyLeadGenerationJob = new DailyLeadGenerationJob();
