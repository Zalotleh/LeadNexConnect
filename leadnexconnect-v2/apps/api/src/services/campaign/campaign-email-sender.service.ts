/**
 * Campaign Email Sender Service
 *
 * Purpose: Send scheduled emails at their scheduled time
 *
 * This service is called by a cron job every minute to:
 * 1. Query scheduledEmails WHERE status='pending' AND scheduledFor <= NOW()
 * 2. Send each email using the existing email-sender.service
 * 3. Update scheduledEmail.status to 'sent' or 'failed'
 * 4. Link scheduledEmail.emailId to emails table
 * 5. Check if all emails sent → mark campaign 'completed'
 *
 * Key Methods:
 * - sendDueEmails() - Called by cron every minute
 * - sendScheduledEmail(scheduledEmailId) - Send a specific scheduled email
 * - checkCampaignCompletion(campaignId) - Check if campaign is done
 */

import { db, campaigns, leads, scheduledEmails, emails, emailTemplates, users } from '@leadnex/database';
import { eq, and, lte, or } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { emailSenderService } from '../outreach/email-sender.service';
import { emailGeneratorService } from '../outreach/email-generator.service';

export class CampaignEmailSenderService {

  /**
   * Send all emails that are due now
   * This method is called by the cron job every minute
   * Processes each user's scheduled emails separately for data isolation
   */
  async sendDueEmails(): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    error?: string;
  }> {
    try {
      logger.info('[CampaignEmailSender] Checking for due emails');

      // Get all active users
      const activeUsers = await db
        .select()
        .from(users)
        .where(eq(users.status, 'active'));

      let totalSentCount = 0;
      let totalFailedCount = 0;

      // Process each user's emails
      for (const user of activeUsers) {
        // Get all scheduled emails for this user that are due and pending
        const dueEmails = await db
          .select()
          .from(scheduledEmails)
          .where(
            and(
              eq(scheduledEmails.userId, user.id),
              eq(scheduledEmails.status, 'pending'),
              lte(scheduledEmails.scheduledFor, new Date())
            )
          )
          .limit(50); // Process max 50 emails per user per run to avoid overload

        if (dueEmails.length === 0) {
          continue;
        }

        logger.info('[CampaignEmailSender] Found due emails for user', {
          userId: user.id,
          userEmail: user.email,
          count: dueEmails.length,
        });

        let sentCount = 0;
        let failedCount = 0;

        // Process each email
        for (const scheduledEmail of dueEmails) {
          const result = await this.sendScheduledEmail(scheduledEmail.id);

          if (result.success) {
            sentCount++;
          } else {
            failedCount++;
          }

          // Check campaign completion after each email
          await this.checkCampaignCompletion(scheduledEmail.campaignId);
        }

        totalSentCount += sentCount;
        totalFailedCount += failedCount;

        logger.info('[CampaignEmailSender] User batch processing complete', {
          userId: user.id,
          userEmail: user.email,
          sentCount,
          failedCount,
          totalProcessed: sentCount + failedCount,
        });

        // Small delay between users
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (totalSentCount === 0 && totalFailedCount === 0) {
        logger.info('[CampaignEmailSender] No due emails found for any user');
      } else {
        logger.info('[CampaignEmailSender] All users batch processing complete', {
          totalSentCount,
          totalFailedCount,
          totalProcessed: totalSentCount + totalFailedCount,
        });
      }

      return {
        success: true,
        sentCount: totalSentCount,
        failedCount: totalFailedCount,
      };

    } catch (error: any) {
      logger.error('[CampaignEmailSender] Error in sendDueEmails', {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        error: error.message,
      };
    }
  }

  /**
   * Send a specific scheduled email
   */
  async sendScheduledEmail(scheduledEmailId: string): Promise<{
    success: boolean;
    emailId?: string;
    error?: string;
  }> {
    try {
      logger.info('[CampaignEmailSender] Sending scheduled email', { scheduledEmailId });

      // Get scheduled email details
      const scheduledEmailData = await db
        .select()
        .from(scheduledEmails)
        .where(eq(scheduledEmails.id, scheduledEmailId))
        .limit(1);

      if (!scheduledEmailData[0]) {
        throw new Error('Scheduled email not found');
      }

      const scheduled = scheduledEmailData[0];

      // Check if already sent
      if (scheduled.status === 'sent') {
        logger.warn('[CampaignEmailSender] Email already sent', { scheduledEmailId });
        return { success: true, emailId: scheduled.emailId || undefined };
      }

      // Get campaign details
      const campaign = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, scheduled.campaignId))
        .limit(1);

      if (!campaign[0]) {
        throw new Error('Campaign not found');
      }

      // Check if campaign is still running
      if (campaign[0].status !== 'running') {
        logger.warn('[CampaignEmailSender] Campaign not running, skipping email', {
          scheduledEmailId,
          campaignId: scheduled.campaignId,
          campaignStatus: campaign[0].status,
        });

        // Mark as skipped
        await db
          .update(scheduledEmails)
          .set({
            status: 'skipped',
            failureReason: `Campaign status is ${campaign[0].status}`,
            updatedAt: new Date(),
          })
          .where(eq(scheduledEmails.id, scheduledEmailId));

        return { success: false, error: `Campaign is ${campaign[0].status}` };
      }

      // Get lead details
      const lead = await db
        .select()
        .from(leads)
        .where(eq(leads.id, scheduled.leadId))
        .limit(1);

      if (!lead[0]) {
        throw new Error('Lead not found');
      }

      // Get email template
      const template = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, scheduled.templateId))
        .limit(1);

      if (!template[0]) {
        throw new Error('Email template not found');
      }

      // Generate personalized email content
      const generatedEmail = await emailGeneratorService.generateEmail(
        lead[0],
        template[0],
        scheduled.workflowStepNumber === 1 ? 'initial' : `follow_up_${scheduled.workflowStepNumber - 1}`
      );

      // Send the email
      const sendResult = await emailSenderService.sendEmail({
        leadId: lead[0].id,
        campaignId: scheduled.campaignId,
        subject: generatedEmail.subject,
        bodyText: generatedEmail.bodyText,
        bodyHtml: generatedEmail.bodyHtml,
        followUpStage: scheduled.workflowStepNumber === 1 ? 'initial' : `follow_up_${scheduled.workflowStepNumber - 1}`,
      });

      // Update scheduled email as sent
      await db
        .update(scheduledEmails)
        .set({
          status: 'sent',
          sentAt: new Date(),
          emailId: sendResult.emailId,
          updatedAt: new Date(),
        })
        .where(eq(scheduledEmails.id, scheduledEmailId));

      // Update campaign metrics
      await this.incrementCampaignSentCount(scheduled.campaignId);

      logger.info('[CampaignEmailSender] Email sent successfully', {
        scheduledEmailId,
        emailId: sendResult.emailId,
        to: lead[0].email,
      });

      return {
        success: true,
        emailId: sendResult.emailId,
      };

    } catch (error: any) {
      logger.error('[CampaignEmailSender] Error sending scheduled email', {
        scheduledEmailId,
        error: error.message,
        stack: error.stack,
      });

      // Update scheduled email as failed
      await db
        .update(scheduledEmails)
        .set({
          status: 'failed',
          failedAt: new Date(),
          failureReason: error.message,
          retryCount: db.$count(scheduledEmails.retryCount) + 1,
          updatedAt: new Date(),
        })
        .where(eq(scheduledEmails.id, scheduledEmailId))
        .catch(err => {
          logger.error('[CampaignEmailSender] Error updating failed status', {
            scheduledEmailId,
            error: err.message,
          });
        });

      // Update campaign failed count
      await this.incrementCampaignFailedCount(scheduledEmailId);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if all emails for a campaign are sent and mark campaign as completed
   * This is THE KEY to fixing the bug!
   */
  async checkCampaignCompletion(campaignId: string): Promise<void> {
    try {
      // Get count of pending scheduled emails
      const pendingEmails = await db
        .select()
        .from(scheduledEmails)
        .where(
          and(
            eq(scheduledEmails.campaignId, campaignId),
            eq(scheduledEmails.status, 'pending')
          )
        );

      if (pendingEmails.length > 0) {
        // Still has pending emails, campaign not complete
        logger.debug('[CampaignEmailSender] Campaign still has pending emails', {
          campaignId,
          pendingCount: pendingEmails.length,
        });
        return;
      }

      // No more pending emails - check if campaign is still running
      const campaign = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId))
        .limit(1);

      if (!campaign[0]) {
        logger.warn('[CampaignEmailSender] Campaign not found during completion check', {
          campaignId,
        });
        return;
      }

      if (campaign[0].status !== 'running') {
        // Campaign already completed/paused, no need to update
        return;
      }

      // Mark campaign as completed!
      logger.info('[CampaignEmailSender] All emails sent/failed, marking campaign as completed', {
        campaignId,
      });

      await db
        .update(campaigns)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, campaignId));

      logger.info('[CampaignEmailSender] Campaign marked as completed', {
        campaignId,
      });

    } catch (error: any) {
      logger.error('[CampaignEmailSender] Error checking campaign completion', {
        campaignId,
        error: error.message,
      });
      // Don't throw - this shouldn't fail the email send
    }
  }

  /**
   * Increment campaign's sent email count
   */
  private async incrementCampaignSentCount(campaignId: string): Promise<void> {
    try {
      const campaign = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId))
        .limit(1);

      if (campaign[0]) {
        await db
          .update(campaigns)
          .set({
            emailsSentCount: (campaign[0].emailsSentCount || 0) + 1,
            updatedAt: new Date(),
          })
          .where(eq(campaigns.id, campaignId));
      }
    } catch (error: any) {
      logger.error('[CampaignEmailSender] Error incrementing sent count', {
        campaignId,
        error: error.message,
      });
    }
  }

  /**
   * Increment campaign's failed email count
   */
  private async incrementCampaignFailedCount(campaignId: string): Promise<void> {
    try {
      const campaign = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId))
        .limit(1);

      if (campaign[0]) {
        await db
          .update(campaigns)
          .set({
            emailsFailedCount: (campaign[0].emailsFailedCount || 0) + 1,
            updatedAt: new Date(),
          })
          .where(eq(campaigns.id, campaignId));
      }
    } catch (error: any) {
      logger.error('[CampaignEmailSender] Error incrementing failed count', {
        campaignId,
        error: error.message,
      });
    }
  }

  /**
   * Get campaign email statistics
   */
  async getCampaignEmailStats(campaignId: string): Promise<{
    total: number;
    pending: number;
    sent: number;
    failed: number;
    cancelled: number;
    skipped: number;
  }> {
    try {
      const allEmails = await db
        .select()
        .from(scheduledEmails)
        .where(eq(scheduledEmails.campaignId, campaignId));

      const stats = {
        total: allEmails.length,
        pending: allEmails.filter(e => e.status === 'pending').length,
        sent: allEmails.filter(e => e.status === 'sent').length,
        failed: allEmails.filter(e => e.status === 'failed').length,
        cancelled: allEmails.filter(e => e.status === 'cancelled').length,
        skipped: allEmails.filter(e => e.status === 'skipped').length,
      };

      return stats;
    } catch (error: any) {
      logger.error('[CampaignEmailSender] Error getting campaign stats', {
        campaignId,
        error: error.message,
      });

      return {
        total: 0,
        pending: 0,
        sent: 0,
        failed: 0,
        cancelled: 0,
        skipped: 0,
      };
    }
  }

  /**
   * Retry failed emails for a campaign
   */
  async retryFailedEmails(campaignId: string): Promise<{
    success: boolean;
    retriedCount: number;
    error?: string;
  }> {
    try {
      logger.info('[CampaignEmailSender] Retrying failed emails', { campaignId });

      // Get failed emails
      const failedEmails = await db
        .select()
        .from(scheduledEmails)
        .where(
          and(
            eq(scheduledEmails.campaignId, campaignId),
            eq(scheduledEmails.status, 'failed')
          )
        );

      if (failedEmails.length === 0) {
        logger.info('[CampaignEmailSender] No failed emails to retry', { campaignId });
        return { success: true, retriedCount: 0 };
      }

      // Reset failed emails to pending
      await db
        .update(scheduledEmails)
        .set({
          status: 'pending',
          failedAt: null,
          failureReason: null,
          scheduledFor: new Date(), // Reschedule for immediate sending
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(scheduledEmails.campaignId, campaignId),
            eq(scheduledEmails.status, 'failed')
          )
        );

      logger.info('[CampaignEmailSender] Failed emails reset to pending', {
        campaignId,
        retriedCount: failedEmails.length,
      });

      return {
        success: true,
        retriedCount: failedEmails.length,
      };

    } catch (error: any) {
      logger.error('[CampaignEmailSender] Error retrying failed emails', {
        campaignId,
        error: error.message,
      });

      return {
        success: false,
        retriedCount: 0,
        error: error.message,
      };
    }
  }
}

export const campaignEmailSenderService = new CampaignEmailSenderService();
