import * as cron from 'node-cron';
import { db, leads, campaigns, users } from '@leadnex/database';
import { eq, and, lt, isNotNull } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { emailGeneratorService } from '../services/outreach/email-generator.service';
import { emailQueueService } from '../services/outreach/email-queue.service';

/**
 * Follow-up Checker Job
 * Runs every day at 10:00 AM
 * Sends follow-up emails to leads that haven't responded
 * MULTI-USER: Processes each user's campaigns separately to maintain data isolation
 */
export class FollowUpCheckerJob {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Start the cron job
   */
  start() {
    // Run every day at 10:00 AM
    this.cronJob = cron.schedule('0 10 * * *', async () => {
      await this.execute();
    });

    logger.info('📅 Follow-up Checker Job scheduled (10:00 AM)');
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Follow-up Checker Job stopped');
    }
  }

  /**
   * Execute the job
   * Iterates through all active users and processes their campaigns
   */
  async execute() {
    try {
      logger.info('[FollowUpChecker] Starting follow-up check');

      // Get all active users
      const activeUsers = await db
        .select()
        .from(users)
        .where(eq(users.status, 'active'));

      logger.info(`[FollowUpChecker] Processing campaigns for ${activeUsers.length} active users`);

      // Process each user's campaigns
      for (const user of activeUsers) {
        try {
          // Get all active campaigns with follow-up enabled for this user
          const activeCampaigns = await db
            .select()
            .from(campaigns)
            .where(and(
              eq(campaigns.userId, user.id),
              eq(campaigns.status, 'active'),
              eq(campaigns.followUpEnabled, true)
            ));

          if (activeCampaigns.length === 0) {
            continue;
          }

          logger.info(`[FollowUpChecker] Found ${activeCampaigns.length} campaigns with follow-ups for user ${user.email}`);

          // Process each campaign
          for (const campaign of activeCampaigns) {
            try {
              await this.checkFollowUpsForCampaign(campaign);
            } catch (error: any) {
              logger.error('[FollowUpChecker] Error checking follow-ups for campaign', {
                campaignId: campaign.id,
                campaignName: campaign.name,
                userId: user.id,
                error: error.message,
              });
            }

            // Add delay between campaigns
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error: any) {
          logger.error('[FollowUpChecker] Error processing campaigns for user', {
            userId: user.id,
            userEmail: user.email,
            error: error.message,
          });
        }

        // Add delay between users
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      logger.info('[FollowUpChecker] Follow-up check completed');
    } catch (error: any) {
      logger.error('[FollowUpChecker] Fatal error in follow-up checker', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Check and send follow-ups for a specific campaign
   */
  private async checkFollowUpsForCampaign(campaign: any) {
    logger.info(`[FollowUpChecker] Checking follow-ups for campaign: ${campaign.name}`);

    const now = new Date();
    
    // Calculate follow-up dates
    const followUp1Date = new Date(now);
    followUp1Date.setDate(followUp1Date.getDate() - (campaign.followUp1DelayDays || 3));
    
    const followUp2Date = new Date(now);
    followUp2Date.setDate(followUp2Date.getDate() - (campaign.followUp2DelayDays || 5));

    // Find leads ready for follow-up 1
    const followUp1Leads = await db
      .select()
      .from(leads)
      .where(and(
        eq(leads.status, 'contacted'),
        eq(leads.followUpStage, 'initial'),
        lt(leads.lastContactedAt, followUp1Date),
        isNotNull(leads.email)
      ))
      .limit(100);

    logger.info(`[FollowUpChecker] Found ${followUp1Leads.length} leads for follow-up 1`);

    // Send follow-up 1 emails
    for (const lead of followUp1Leads) {
      await this.sendFollowUp(lead, campaign, 'follow_up_1');
    }

    // Find leads ready for follow-up 2
    const followUp2Leads = await db
      .select()
      .from(leads)
      .where(and(
        eq(leads.status, 'contacted'),
        eq(leads.followUpStage, 'follow_up_1'),
        lt(leads.lastContactedAt, followUp2Date),
        isNotNull(leads.email)
      ))
      .limit(100);

    logger.info(`[FollowUpChecker] Found ${followUp2Leads.length} leads for follow-up 2`);

    // Send follow-up 2 emails
    for (const lead of followUp2Leads) {
      await this.sendFollowUp(lead, campaign, 'follow_up_2');
    }

    logger.info(`[FollowUpChecker] Campaign ${campaign.name} completed`);
  }

  /**
   * Send a follow-up email to a lead
   */
  private async sendFollowUp(lead: any, campaign: any, stage: 'follow_up_1' | 'follow_up_2') {
    try {
      if (!lead.email) {
        return;
      }

      // Generate follow-up email
      const emailContent = await emailGeneratorService.generateEmail({
        industry: lead.industry,
        companyName: lead.companyName,
        contactName: lead.contactName || undefined,
        city: lead.city || undefined,
        country: lead.country || undefined,
        followUpStage: stage,
      });

      // Queue email for sending
      await emailQueueService.addEmail({
        leadId: lead.id,
        campaignId: campaign.id,
        to: lead.email,
        subject: emailContent.subject,
        bodyText: emailContent.bodyText,
        bodyHtml: emailContent.bodyHtml,
        followUpStage: stage,
        metadata: {
          companyName: lead.companyName,
          industry: lead.industry,
        },
      });

      // Update lead
      await db
        .update(leads)
        .set({
          followUpStage: stage,
          lastContactedAt: new Date(),
          emailsSent: (lead.emailsSent || 0) + 1,
        })
        .where(eq(leads.id, lead.id));

      // Update campaign metrics
      await db
        .update(campaigns)
        .set({
          emailsSent: (campaign.emailsSent || 0) + 1,
        })
        .where(eq(campaigns.id, campaign.id));

      logger.info(`[FollowUpChecker] Sent ${stage} to lead ${lead.id}`);

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      logger.error('[FollowUpChecker] Error sending follow-up', {
        leadId: lead.id,
        stage,
        error: error.message,
      });
    }
  }
}

export const followUpCheckerJob = new FollowUpCheckerJob();
