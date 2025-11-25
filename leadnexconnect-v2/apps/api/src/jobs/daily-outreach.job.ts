import * as cron from 'node-cron';
import { db, leads, campaigns } from '@leadnex/database';
import { eq, and, gte } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { emailGeneratorService } from '../services/outreach/email-generator.service';
import { emailQueueService } from '../services/outreach/email-queue.service';

/**
 * Daily Outreach Job
 * Runs every day at 9:00 AM
 * Sends initial emails to new leads with quality score >= 60
 */
export class DailyOutreachJob {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Start the cron job
   */
  start() {
    // Run every day at 9:00 AM
    this.cronJob = cron.schedule('0 9 * * *', async () => {
      await this.execute();
    });

    logger.info('📅 Daily Outreach Job scheduled (9:00 AM)');
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Daily Outreach Job stopped');
    }
  }

  /**
   * Execute the job
   */
  async execute() {
    try {
      logger.info('[DailyOutreach] Starting daily outreach');

      // Get all active campaigns
      const activeCampaigns = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.status, 'active'));

      if (activeCampaigns.length === 0) {
        logger.info('[DailyOutreach] No active campaigns found');
        return;
      }

      logger.info(`[DailyOutreach] Found ${activeCampaigns.length} active campaigns`);

      // Process each campaign
      for (const campaign of activeCampaigns) {
        try {
          await this.sendOutreachForCampaign(campaign);
        } catch (error: any) {
          logger.error('[DailyOutreach] Error sending outreach for campaign', {
            campaignId: campaign.id,
            campaignName: campaign.name,
            error: error.message,
          });
        }

        // Add delay between campaigns
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      logger.info('[DailyOutreach] Daily outreach completed');
    } catch (error: any) {
      logger.error('[DailyOutreach] Fatal error in daily outreach', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Send outreach emails for a specific campaign
   */
  private async sendOutreachForCampaign(campaign: any) {
    logger.info(`[DailyOutreach] Processing campaign: ${campaign.name}`);

    // Find new leads with good quality scores that haven't been contacted
    // Note: This is a simplified query. In production, you'd want to track
    // campaign-lead relationships more explicitly
    const newLeads = await db
      .select()
      .from(leads)
      .where(and(
        eq(leads.status, 'new'),
        gte(leads.qualityScore, 60)
      ))
      .limit(campaign.leadsPerDay || 50);

    if (newLeads.length === 0) {
      logger.info(`[DailyOutreach] No new leads found for campaign ${campaign.id}`);
      return;
    }

    logger.info(`[DailyOutreach] Found ${newLeads.length} leads to contact`);

    let emailsQueued = 0;

    // Generate and queue emails
    for (const lead of newLeads) {
      try {
        // Skip if no email
        if (!lead.email) {
          continue;
        }

        // Generate personalized email
        const emailContent = await emailGeneratorService.generateEmail({
          industry: lead.industry,
          companyName: lead.companyName,
          contactName: lead.contactName || undefined,
          city: lead.city || undefined,
          country: lead.country || undefined,
          followUpStage: 'initial',
        });

        // Queue email for sending
        await emailQueueService.addEmail({
          leadId: lead.id,
          campaignId: campaign.id,
          to: lead.email,
          subject: emailContent.subject,
          bodyText: emailContent.bodyText,
          bodyHtml: emailContent.bodyHtml,
          followUpStage: 'initial',
          metadata: {
            companyName: lead.companyName,
            industry: lead.industry,
          },
        });

        // Update lead status to contacted
        await db
          .update(leads)
          .set({
            status: 'contacted',
            followUpStage: 'initial',
            lastContactedAt: new Date(),
            emailsSent: (lead.emailsSent || 0) + 1,
          })
          .where(eq(leads.id, lead.id));

        emailsQueued++;

        // Small delay between emails
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        logger.error('[DailyOutreach] Error queuing email for lead', {
          leadId: lead.id,
          error: error.message,
        });
      }
    }

    // Update campaign metrics
    await db
      .update(campaigns)
      .set({
        emailsSent: (campaign.emailsSent || 0) + emailsQueued,
      })
      .where(eq(campaigns.id, campaign.id));

    logger.info(`[DailyOutreach] Campaign ${campaign.name} completed`, {
      leadsProcessed: newLeads.length,
      emailsQueued,
    });
  }
}

export const dailyOutreachJob = new DailyOutreachJob();
