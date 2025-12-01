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

      logger.info(`[ScheduledCampaigns] Found ${scheduledCampaigns.length} campaigns ready to execute`);

      // Process each campaign
      for (const campaign of scheduledCampaigns) {
        try {
          // Check if campaign has been executed already
          // We'll use lastRunAt to track if execution has started
          if (campaign.lastRunAt) {
            const timeSinceLastRun = now.getTime() - new Date(campaign.lastRunAt).getTime();
            // If last run was less than 2 minutes ago, skip (already executing or recently executed)
            if (timeSinceLastRun < 2 * 60 * 1000) {
              continue;
            }
          }

          logger.info('[ScheduledCampaigns] Executing scheduled campaign', {
            campaignId: campaign.id,
            campaignName: campaign.name,
            scheduledFor: campaign.startDate,
          });

          // Mark as running by updating lastRunAt
          await db
            .update(campaigns)
            .set({ lastRunAt: now })
            .where(eq(campaigns.id, campaign.id));

          // Call the execute endpoint
          await axios.post(
            `${this.apiBaseUrl}/api/campaigns/${campaign.id}/execute`,
            {},
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 5000, // 5 second timeout
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
