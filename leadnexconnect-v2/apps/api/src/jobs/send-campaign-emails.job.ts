/**
 * Send Campaign Emails Job
 *
 * Cron Job that runs every minute to send scheduled campaign emails
 *
 * This job is KEY to the new campaign system:
 * - Runs every 1 minute
 * - Calls campaignEmailSenderService.sendDueEmails()
 * - Sends all emails that are due (scheduledFor <= NOW())
 * - Updates campaign completion status automatically
 *
 * Schedule: Every 1 minute
 */

import * as cron from 'node-cron';
import { logger } from '../utils/logger';
import { campaignEmailSenderService } from '../services/campaign/campaign-email-sender.service';

export class SendCampaignEmailsJob {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  /**
   * Start the cron job
   */
  start() {
    // Run every minute: '* * * * *'
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.execute();
    });

    logger.info('📧 Send Campaign Emails Job scheduled (every 1 minute)');
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('📧 Send Campaign Emails Job stopped');
    }
  }

  /**
   * Execute the job manually (for testing)
   */
  async execute(): Promise<void> {
    // Prevent concurrent executions
    if (this.isRunning) {
      logger.warn('[SendCampaignEmailsJob] Job already running, skipping this execution');
      return;
    }

    this.isRunning = true;

    try {
      logger.info('[SendCampaignEmailsJob] Starting email sending cycle');

      // Call the campaign email sender service
      const result = await campaignEmailSenderService.sendDueEmails();

      if (result.success) {
        logger.info('[SendCampaignEmailsJob] Email sending cycle completed', {
          sentCount: result.sentCount,
          failedCount: result.failedCount,
        });
      } else {
        logger.error('[SendCampaignEmailsJob] Email sending cycle failed', {
          error: result.error,
        });
      }

    } catch (error: any) {
      logger.error('[SendCampaignEmailsJob] Unexpected error in job execution', {
        error: error.message,
        stack: error.stack,
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get job status
   */
  getStatus(): {
    isScheduled: boolean;
    isRunning: boolean;
  } {
    return {
      isScheduled: this.cronJob !== null,
      isRunning: this.isRunning,
    };
  }
}

export const sendCampaignEmailsJob = new SendCampaignEmailsJob();
