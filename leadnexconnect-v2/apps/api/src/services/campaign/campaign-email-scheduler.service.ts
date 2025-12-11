/**
 * Campaign Email Scheduler Service
 *
 * Purpose: Schedule emails when a campaign starts
 *
 * This service is KEY to fixing the bug where campaigns complete immediately.
 * Instead of sending emails right away, we:
 * 1. Write ALL future emails to the scheduledEmails table
 * 2. Let a cron job send them at the scheduled time
 * 3. Mark campaign complete only when ALL scheduled emails are sent/failed
 *
 * Key Methods:
 * - scheduleEmailsForCampaign(campaignId) - Schedule all emails for a campaign
 * - scheduleEmailForLead(campaignId, leadId, template, delay) - Schedule single email
 * - cancelScheduledEmails(campaignId) - Cancel all scheduled emails (for pause)
 */

import { db, campaigns, leads, scheduledEmails, emailTemplates, workflows, workflowSteps, campaignLeads, leadBatches } from '@leadnex/database';
import { eq, and, inArray } from 'drizzle-orm';
import { logger } from '../../utils/logger';

export class CampaignEmailSchedulerService {

  /**
   * Schedule all emails for a campaign when it starts
   * This is called when campaign status changes to 'running'
   */
  async scheduleEmailsForCampaign(campaignId: string): Promise<{
    success: boolean;
    scheduledCount: number;
    error?: string;
  }> {
    try {
      logger.info('[CampaignEmailScheduler] Starting email scheduling', { campaignId });

      // Get campaign details
      const campaign = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId))
        .limit(1);

      if (!campaign[0]) {
        throw new Error('Campaign not found');
      }

      const campaignData = campaign[0];

      // Get leads for this campaign
      const campaignLeadsList = await this.getCampaignLeads(campaignId, campaignData);

      if (campaignLeadsList.length === 0) {
        logger.warn('[CampaignEmailScheduler] No leads found for campaign', { campaignId });
        return { success: true, scheduledCount: 0 };
      }

      logger.info('[CampaignEmailScheduler] Found leads for campaign', {
        campaignId,
        leadCount: campaignLeadsList.length,
      });

      let scheduledCount = 0;

      // Check if campaign uses workflow or single template
      if (campaignData.useWorkflow && campaignData.workflowId) {
        // Schedule workflow emails (multiple emails per lead)
        scheduledCount = await this.scheduleWorkflowEmails(
          campaignId,
          campaignData.workflowId,
          campaignLeadsList
        );
      } else if (campaignData.emailTemplateId) {
        // Schedule single template email for each lead
        scheduledCount = await this.scheduleSingleTemplateEmails(
          campaignId,
          campaignData.emailTemplateId,
          campaignLeadsList
        );
      } else {
        throw new Error('Campaign has no email template or workflow configured');
      }

      // Update campaign metrics
      await db
        .update(campaigns)
        .set({
          emailsScheduledCount: scheduledCount,
          totalLeadsTargeted: campaignLeadsList.length,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, campaignId));

      logger.info('[CampaignEmailScheduler] Email scheduling complete', {
        campaignId,
        scheduledCount,
        leadsTargeted: campaignLeadsList.length,
      });

      return {
        success: true,
        scheduledCount,
      };

    } catch (error: any) {
      logger.error('[CampaignEmailScheduler] Error scheduling emails', {
        campaignId,
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        scheduledCount: 0,
        error: error.message,
      };
    }
  }

  /**
   * Get leads for a campaign based on batch IDs or direct lead assignments
   */
  private async getCampaignLeads(campaignId: string, campaignData: any): Promise<any[]> {
    try {
      // Option 1: Campaign uses batchIds (new format)
      if (campaignData.batchIds && Array.isArray(campaignData.batchIds) && campaignData.batchIds.length > 0) {
        logger.info('[CampaignEmailScheduler] Getting leads from batchIds', {
          campaignId,
          batchIds: campaignData.batchIds,
        });

        // Get leads from lead_batches
        const batchLeads = await db
          .select()
          .from(leads)
          .where(
            inArray(leads.batchId, campaignData.batchIds)
          );

        return batchLeads;
      }

      // Option 2: Campaign uses old batchId (backward compatibility)
      if (campaignData.batchId) {
        logger.info('[CampaignEmailScheduler] Getting leads from batchId', {
          campaignId,
          batchId: campaignData.batchId,
        });

        const batchLeads = await db
          .select()
          .from(leads)
          .where(eq(leads.batchId, campaignData.batchId));

        return batchLeads;
      }

      // Option 3: Campaign has direct lead assignments (campaign_leads table)
      logger.info('[CampaignEmailScheduler] Getting leads from campaign_leads', {
        campaignId,
      });

      const directLeads = await db
        .select({
          lead: leads,
        })
        .from(campaignLeads)
        .innerJoin(leads, eq(campaignLeads.leadId, leads.id))
        .where(eq(campaignLeads.campaignId, campaignId));

      return directLeads.map(row => row.lead);

    } catch (error: any) {
      logger.error('[CampaignEmailScheduler] Error getting campaign leads', {
        campaignId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Schedule single template email for each lead
   */
  private async scheduleSingleTemplateEmails(
    campaignId: string,
    templateId: string,
    leadsList: any[]
  ): Promise<number> {
    try {
      logger.info('[CampaignEmailScheduler] Scheduling single template emails', {
        campaignId,
        templateId,
        leadCount: leadsList.length,
      });

      // Get template details
      const template = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, templateId))
        .limit(1);

      if (!template[0]) {
        throw new Error(`Email template ${templateId} not found`);
      }

      // Schedule one email per lead
      const scheduledEmailsData = leadsList.map(lead => ({
        campaignId,
        leadId: lead.id,
        templateId,
        workflowId: null,
        workflowStepNumber: 1,
        scheduledFor: new Date(), // Send immediately (or we could add a small delay)
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Batch insert scheduled emails
      await db.insert(scheduledEmails).values(scheduledEmailsData);

      logger.info('[CampaignEmailScheduler] Single template emails scheduled', {
        campaignId,
        count: scheduledEmailsData.length,
      });

      return scheduledEmailsData.length;

    } catch (error: any) {
      logger.error('[CampaignEmailScheduler] Error scheduling single template emails', {
        campaignId,
        templateId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Schedule workflow emails (multiple steps per lead)
   */
  private async scheduleWorkflowEmails(
    campaignId: string,
    workflowId: string,
    leadsList: any[]
  ): Promise<number> {
    try {
      logger.info('[CampaignEmailScheduler] Scheduling workflow emails', {
        campaignId,
        workflowId,
        leadCount: leadsList.length,
      });

      // Get workflow steps
      const steps = await db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowId, workflowId))
        .orderBy(workflowSteps.stepNumber);

      if (steps.length === 0) {
        throw new Error(`No steps found for workflow ${workflowId}`);
      }

      logger.info('[CampaignEmailScheduler] Found workflow steps', {
        campaignId,
        workflowId,
        stepCount: steps.length,
      });

      // Schedule emails for each lead and each step
      const scheduledEmailsData: any[] = [];

      for (const lead of leadsList) {
        let cumulativeDelayDays = 0;

        for (const step of steps) {
          // Calculate when this email should be sent
          cumulativeDelayDays += step.delayDays || 0;
          const scheduledFor = new Date();
          scheduledFor.setDate(scheduledFor.getDate() + cumulativeDelayDays);

          scheduledEmailsData.push({
            campaignId,
            leadId: lead.id,
            templateId: step.emailTemplateId,
            workflowId,
            workflowStepNumber: step.stepNumber,
            scheduledFor,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      // Batch insert all scheduled emails
      await db.insert(scheduledEmails).values(scheduledEmailsData);

      logger.info('[CampaignEmailScheduler] Workflow emails scheduled', {
        campaignId,
        count: scheduledEmailsData.length,
        leadsCount: leadsList.length,
        stepsPerLead: steps.length,
      });

      return scheduledEmailsData.length;

    } catch (error: any) {
      logger.error('[CampaignEmailScheduler] Error scheduling workflow emails', {
        campaignId,
        workflowId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Cancel all scheduled emails for a campaign (when paused)
   * Sets status to 'cancelled' instead of deleting
   */
  async cancelScheduledEmails(campaignId: string): Promise<{
    success: boolean;
    cancelledCount: number;
    error?: string;
  }> {
    try {
      logger.info('[CampaignEmailScheduler] Cancelling scheduled emails', { campaignId });

      // Update all pending scheduled emails to cancelled
      const result = await db
        .update(scheduledEmails)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(scheduledEmails.campaignId, campaignId),
            eq(scheduledEmails.status, 'pending')
          )
        );

      logger.info('[CampaignEmailScheduler] Scheduled emails cancelled', {
        campaignId,
        cancelledCount: result.rowCount || 0,
      });

      return {
        success: true,
        cancelledCount: result.rowCount || 0,
      };

    } catch (error: any) {
      logger.error('[CampaignEmailScheduler] Error cancelling scheduled emails', {
        campaignId,
        error: error.message,
      });

      return {
        success: false,
        cancelledCount: 0,
        error: error.message,
      };
    }
  }

  /**
   * Resume scheduled emails for a campaign (when resumed after pause)
   * Resets cancelled emails back to pending and adjusts their scheduled times
   */
  async resumeScheduledEmails(campaignId: string): Promise<{
    success: boolean;
    resumedCount: number;
    error?: string;
  }> {
    try {
      logger.info('[CampaignEmailScheduler] Resuming scheduled emails', { campaignId });

      // Get all cancelled emails
      const cancelledEmails = await db
        .select()
        .from(scheduledEmails)
        .where(
          and(
            eq(scheduledEmails.campaignId, campaignId),
            eq(scheduledEmails.status, 'cancelled')
          )
        );

      if (cancelledEmails.length === 0) {
        logger.info('[CampaignEmailScheduler] No cancelled emails to resume', { campaignId });
        return { success: true, resumedCount: 0 };
      }

      // Update all cancelled emails back to pending
      // Adjust scheduled time to be now (or maintain relative delays)
      const now = new Date();

      for (const email of cancelledEmails) {
        await db
          .update(scheduledEmails)
          .set({
            status: 'pending',
            scheduledFor: now, // Reschedule for immediate sending
            updatedAt: new Date(),
          })
          .where(eq(scheduledEmails.id, email.id));
      }

      logger.info('[CampaignEmailScheduler] Scheduled emails resumed', {
        campaignId,
        resumedCount: cancelledEmails.length,
      });

      return {
        success: true,
        resumedCount: cancelledEmails.length,
      };

    } catch (error: any) {
      logger.error('[CampaignEmailScheduler] Error resuming scheduled emails', {
        campaignId,
        error: error.message,
      });

      return {
        success: false,
        resumedCount: 0,
        error: error.message,
      };
    }
  }

  /**
   * Get count of pending scheduled emails for a campaign
   */
  async getPendingEmailsCount(campaignId: string): Promise<number> {
    try {
      const result = await db
        .select()
        .from(scheduledEmails)
        .where(
          and(
            eq(scheduledEmails.campaignId, campaignId),
            eq(scheduledEmails.status, 'pending')
          )
        );

      return result.length;
    } catch (error: any) {
      logger.error('[CampaignEmailScheduler] Error getting pending emails count', {
        campaignId,
        error: error.message,
      });
      return 0;
    }
  }
}

export const campaignEmailSchedulerService = new CampaignEmailSchedulerService();
