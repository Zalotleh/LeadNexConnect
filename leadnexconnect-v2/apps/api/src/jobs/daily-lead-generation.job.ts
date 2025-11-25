import * as cron from 'node-cron';
import { db, campaigns } from '@leadnex/database';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { apolloService } from '../services/lead-generation/apollo.service';
import { googlePlacesService } from '../services/lead-generation/google-places.service';
import { enrichmentPipelineService } from '../services/crm/enrichment-pipeline.service';

/**
 * Daily Lead Generation Job
 * Runs every day at 9:00 AM
 * Generates leads for all active campaigns
 */
export class DailyLeadGenerationJob {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Start the cron job
   */
  start() {
    // Run every day at 9:00 AM
    this.cronJob = cron.schedule('0 9 * * *', async () => {
      await this.execute();
    });

    logger.info('📅 Daily Lead Generation Job scheduled (9:00 AM)');
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
   */
  async execute() {
    try {
      logger.info('[DailyLeadGeneration] Starting daily lead generation');

      // Get all active campaigns with daily schedule
      const activeCampaigns = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.status, 'active'));

      if (activeCampaigns.length === 0) {
        logger.info('[DailyLeadGeneration] No active campaigns found');
        return;
      }

      logger.info(`[DailyLeadGeneration] Found ${activeCampaigns.length} active campaigns`);

      // Process each campaign
      for (const campaign of activeCampaigns) {
        // Only process campaigns with daily schedule or if it's time to run
        if (campaign.scheduleType !== 'daily') {
          continue;
        }

        // Check if we should run based on schedule time
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        if (campaign.scheduleTime && campaign.scheduleTime !== currentTime) {
          logger.info(`[DailyLeadGeneration] Skipping campaign ${campaign.id} - not scheduled for ${currentTime}`);
          continue;
        }

        try {
          await this.generateLeadsForCampaign(campaign);
        } catch (error: any) {
          logger.error('[DailyLeadGeneration] Error generating leads for campaign', {
            campaignId: campaign.id,
            campaignName: campaign.name,
            error: error.message,
          });
        }

        // Add delay between campaigns to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
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

    const rawLeads: any[] = [];
    const targetCount = campaign.leadsPerDay || 50;
    const activeSources = this.countActiveSources(campaign);
    const leadsPerSource = Math.ceil(targetCount / activeSources);

    // Generate leads from Apollo.io
    if (campaign.usesApollo) {
      try {
        const apolloLeads = await apolloService.searchLeads({
          industry: campaign.industry,
          country: campaign.targetCountries?.[0] || 'United States',
          maxResults: Math.min(leadsPerSource, 100),
        });
        rawLeads.push(...apolloLeads.map((lead: any) => ({ ...lead, source: 'apollo' })));
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

    // Enrich leads
    logger.info(`[DailyLeadGeneration] Enriching ${rawLeads.length} leads`);
    const enrichmentResults = await enrichmentPipelineService.enrichBatch(rawLeads);

    const successCount = enrichmentResults.filter(r => r.success && !r.isDuplicate).length;
    const duplicateCount = enrichmentResults.filter(r => r.isDuplicate).length;

    // Update campaign metrics
    await db
      .update(campaigns)
      .set({
        leadsGenerated: (campaign.leadsGenerated || 0) + successCount,
        lastRunAt: new Date(),
      })
      .where(eq(campaigns.id, campaign.id));

    logger.info(`[DailyLeadGeneration] Campaign ${campaign.name} completed`, {
      rawLeads: rawLeads.length,
      enriched: successCount,
      duplicates: duplicateCount,
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
}

export const dailyLeadGenerationJob = new DailyLeadGenerationJob();
