import * as cron from 'node-cron';
import { db, campaigns } from '@leadnex/database';
import { eq, and, lte } from 'drizzle-orm';
import { logger } from '../utils/logger';
import axios from 'axios';

/**
 * Scheduled Campaigns Job
 * Runs every minute to check for campaigns scheduled to start
 * Executes campaigns whose startDate has been reached
 */
export class ScheduledCampaignsJob {
  private cronJob: cron.ScheduledTask | null = null;
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
  }

  /**
   * Start the cron job
   */
  start() {
    // Run every minute to check for scheduled campaigns
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.execute();
    });

    logger.info('📅 Scheduled Campaigns Job started (runs every minute)');
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Scheduled Campaigns Job stopped');
    }
  }

  /**
   * Execute the job
   */
  async execute() {
    try {
      const now = new Date();

      // Get all active campaigns with a startDate in the past or now
      // Only get campaigns where startDate exists and lastRunAt is null or before startDate
      // This ensures we only execute each campaign once at its scheduled time
      const scheduledCampaigns = await db
        .select()
        .from(campaigns)
        .where(
          and(
            eq(campaigns.status, 'active'),
            lte(campaigns.startDate, now)
          )
        );

      if (scheduledCampaigns.length === 0) {
        return;
      }

      logger.info(`[ScheduledCampaigns] Found ${scheduledCampaigns.length} active campaigns, checking which need execution`);

      // Process each campaign
      for (const campaign of scheduledCampaigns) {
        try {
          // Skip if no startDate (shouldn't happen due to query, but safety check)
          if (!campaign.startDate) {
            continue;
          }

          const startDate = new Date(campaign.startDate);
          
          // Check if campaign has been executed already
          // A campaign should only be executed once at its scheduled time
          if (campaign.lastRunAt) {
            const lastRunAt = new Date(campaign.lastRunAt);
            
            // If lastRunAt is after or equal to startDate, campaign was already executed
            if (lastRunAt >= startDate) {
              logger.debug('[ScheduledCampaigns] Campaign already executed, skipping', {
                campaignId: campaign.id,
                startDate: startDate.toISOString(),
                lastRunAt: lastRunAt.toISOString(),
              });
              continue;
            }
          }

          logger.info('[ScheduledCampaigns] Executing scheduled campaign', {
            campaignId: campaign.id,
            campaignName: campaign.name,
            scheduledFor: startDate.toISOString(),
          });

          // Call the execute endpoint first
          // The execute endpoint will set lastRunAt after successful execution
          await axios.post(
            `${this.apiBaseUrl}/api/campaigns/${campaign.id}/execute`,
            {},
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 30000, // 30 second timeout for email queueing
            }
          );

          logger.info('[ScheduledCampaigns] Successfully triggered campaign execution', {
            campaignId: campaign.id,
          });

        } catch (error: any) {
          logger.error('[ScheduledCampaigns] Error executing scheduled campaign', {
            campaignId: campaign.id,
            campaignName: campaign.name,
            error: error.message,
          });
        }

        // Add small delay between campaigns
        await new Promise(resolve => setTimeout(resolve, 500));
      }

    } catch (error: any) {
      logger.error('[ScheduledCampaigns] Fatal error in scheduled campaigns job', {
        error: error.message,
        stack: error.stack,
      });
    }
  }
}

export const scheduledCampaignsJob = new ScheduledCampaignsJob();
