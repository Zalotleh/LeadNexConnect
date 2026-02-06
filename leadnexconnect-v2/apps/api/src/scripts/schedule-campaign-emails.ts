/**
 * Script to properly schedule emails for a campaign using the scheduler service
 */

import { campaignEmailSchedulerService } from '../services/campaign/campaign-email-scheduler.service';
import { logger } from '../utils/logger';

const campaignId = '406f9da3-dcca-487e-8590-d9af203bc183';

async function scheduleEmails() {
  try {
    logger.info('[ScheduleEmails] Starting email scheduling for campaign', { campaignId });

    const result = await campaignEmailSchedulerService.scheduleEmailsForCampaign(campaignId);

    if (result.success) {
      logger.info('[ScheduleEmails] Successfully scheduled emails', {
        campaignId,
        scheduledCount: result.scheduledCount,
      });
    } else {
      logger.error('[ScheduleEmails] Failed to schedule emails', {
        campaignId,
        error: result.error,
      });
    }

    return result;
  } catch (error: any) {
    logger.error('[ScheduleEmails] Error scheduling emails', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// Run the script
scheduleEmails()
  .then((result) => {
    logger.info('[ScheduleEmails] Script completed', { result });
    process.exit(0);
  })
  .catch((error) => {
    logger.error('[ScheduleEmails] Script failed', { error: error.message });
    process.exit(1);
  });
