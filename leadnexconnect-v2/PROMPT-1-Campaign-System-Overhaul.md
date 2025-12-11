# 🎯 PROMPT 1: Campaign System Architecture Overhaul & Critical Bug Fixes

## 📋 Context

You are working on LeadNexConnect v2, a B2B lead generation and email outreach platform. The current campaign system has critical bugs causing emails to stop sending prematurely, and the architecture needs restructuring to separate concerns.

**Current State:**
- Campaign ID `a3b8bae3-4e31-48d1-b25f-97aaa3ef9c72` demonstrates the bug:
  - 3-step workflow (1 day between emails)
  - Expected: All leads receive 3 emails over 3 days
  - Actual: Only 4 emails sent total, campaign marked "completed" prematurely
  - When manually resumed: Sends 1 more email, then marks "completed" again
  - Prevents remaining workflow emails from being sent

**Root Cause:** Email sending logic incorrectly marks campaigns as "completed" after sending first batch instead of waiting for all workflow steps to complete.

---

## 🎯 Mission

**PRIMARY GOALS:**
1. Fix critical campaign completion bug (campaigns completing too early)
2. Restructure campaigns into 3 distinct types with proper separation
3. Implement proper workflow scheduling (batch-based, all leads same day)
4. Add scheduled_emails table for reliable email tracking
5. Update UI to support 3 campaign tabs

---

## 🏗️ Part 1: Database Schema Updates

### **Step 1.1: Update `campaigns` Table**

Add these fields to existing `campaigns` table:

```typescript
// packages/database/src/schema/index.ts

export const campaigns = pgTable('campaigns', {
  // ... existing fields ...
  
  // NEW FIELDS:
  
  // Campaign Type Classification
  campaignType: varchar('campaign_type', { length: 50 }).notNull().default('outreach'),
  // Values: 'lead_generation' | 'outreach' | 'fully_automated'
  
  // Lead Generation Config (for lead_generation & fully_automated types)
  leadSources: json('lead_sources').$type<string[]>(), 
  // Example: ['apollo', 'google_places', 'hunter']
  maxResultsPerRun: integer('max_results_per_run'),
  
  // Outreach Config (for outreach & fully_automated types)
  batchIds: json('batch_ids').$type<string[]>(), 
  // Links to leadBatches - one or multiple batches
  useWorkflow: boolean('use_workflow').default(false),
  
  // Automation Config (for fully_automated type)
  isRecurring: boolean('is_recurring').default(false),
  recurringInterval: varchar('recurring_interval', { length: 50 }),
  // Values: 'daily' | 'every_2_days' | 'every_3_days' | 'weekly' | 'monthly'
  nextRunAt: timestamp('next_run_at'),
  endDate: timestamp('end_date'),
  outreachDelayDays: integer('outreach_delay_days').default(0),
  // Days to wait after lead generation before starting outreach (0 = immediate)
  
  // Enhanced Status Management
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  // Values: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed'
  startType: varchar('start_type', { length: 20 }).default('manual'),
  // Values: 'manual' | 'scheduled'
  scheduledStartAt: timestamp('scheduled_start_at'),
  actualStartedAt: timestamp('actual_started_at'),
  pausedAt: timestamp('paused_at'),
  resumedAt: timestamp('resumed_at'),
  completedAt: timestamp('completed_at'),
  failedAt: timestamp('failed_at'),
  failureReason: text('failure_reason'),
  
  // Enhanced Metrics
  totalLeadsTargeted: integer('total_leads_targeted').default(0),
  emailsSentCount: integer('emails_sent_count').default(0),
  emailsScheduledCount: integer('emails_scheduled_count').default(0),
  emailsFailedCount: integer('emails_failed_count').default(0),
  currentWorkflowStep: integer('current_workflow_step').default(1),
  
  // ... existing fields continue ...
});
```

**Migration SQL:**
```sql
-- Migration: Add campaign type and enhanced fields

ALTER TABLE campaigns ADD COLUMN campaign_type VARCHAR(50) NOT NULL DEFAULT 'outreach';
ALTER TABLE campaigns ADD COLUMN lead_sources JSONB;
ALTER TABLE campaigns ADD COLUMN max_results_per_run INTEGER;
ALTER TABLE campaigns ADD COLUMN batch_ids JSONB;
ALTER TABLE campaigns ADD COLUMN use_workflow BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN recurring_interval VARCHAR(50);
ALTER TABLE campaigns ADD COLUMN next_run_at TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN end_date TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN outreach_delay_days INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN start_type VARCHAR(20) DEFAULT 'manual';
ALTER TABLE campaigns ADD COLUMN scheduled_start_at TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN actual_started_at TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN paused_at TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN resumed_at TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN failed_at TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN failure_reason TEXT;
ALTER TABLE campaigns ADD COLUMN total_leads_targeted INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN emails_sent_count INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN emails_scheduled_count INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN emails_failed_count INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN current_workflow_step INTEGER DEFAULT 1;

-- Update existing campaigns to be 'outreach' type
UPDATE campaigns SET campaign_type = 'outreach' WHERE campaign_type IS NULL;

-- Add index for campaign type filtering
CREATE INDEX idx_campaigns_type ON campaigns(campaign_type);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_next_run ON campaigns(next_run_at) WHERE next_run_at IS NOT NULL;
```

---

### **Step 1.2: Create `scheduled_emails` Table**

This is the KEY to fixing the premature completion bug. All future emails are scheduled here, and campaigns only complete when this table shows all emails sent.

```typescript
// packages/database/src/schema/index.ts

export const scheduledEmails = pgTable('scheduled_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // References
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  leadId: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').notNull().references(() => emailTemplates.id),
  workflowId: uuid('workflow_id').references(() => workflows.id),
  workflowStepNumber: integer('workflow_step_number').default(1),
  
  // Scheduling
  scheduledFor: timestamp('scheduled_for').notNull(),
  // When this email should be sent
  
  // Execution
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  // Values: 'pending' | 'sent' | 'failed' | 'skipped' | 'cancelled'
  sentAt: timestamp('sent_at'),
  failedAt: timestamp('failed_at'),
  failureReason: text('failure_reason'),
  retryCount: integer('retry_count').default(0),
  
  // Result tracking (links to emails table after sent)
  emailId: uuid('email_id').references(() => emails.id),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Indexes for performance
export const scheduledEmailsIndexes = {
  campaignIdx: index('idx_scheduled_emails_campaign').on(scheduledEmails.campaignId),
  leadIdx: index('idx_scheduled_emails_lead').on(scheduledEmails.leadId),
  statusIdx: index('idx_scheduled_emails_status').on(scheduledEmails.status),
  scheduledForIdx: index('idx_scheduled_emails_scheduled_for').on(scheduledEmails.scheduledFor),
  // Composite index for finding due emails
  dueEmailsIdx: index('idx_scheduled_emails_due').on(
    scheduledEmails.status, 
    scheduledEmails.scheduledFor
  ),
};
```

**Migration SQL:**
```sql
-- Create scheduled_emails table

CREATE TABLE scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES email_templates(id),
  workflow_id UUID REFERENCES workflows(id),
  workflow_step_number INTEGER DEFAULT 1,
  
  scheduled_for TIMESTAMP NOT NULL,
  
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP,
  failed_at TIMESTAMP,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  
  email_id UUID REFERENCES emails(id),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scheduled_emails_campaign ON scheduled_emails(campaign_id);
CREATE INDEX idx_scheduled_emails_lead ON scheduled_emails(lead_id);
CREATE INDEX idx_scheduled_emails_status ON scheduled_emails(status);
CREATE INDEX idx_scheduled_emails_scheduled_for ON scheduled_emails(scheduled_for);
CREATE INDEX idx_scheduled_emails_due ON scheduled_emails(status, scheduled_for);

-- Trigger for updated_at
CREATE TRIGGER update_scheduled_emails_updated_at
  BEFORE UPDATE ON scheduled_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### **Step 1.3: Update `leadBatches` Table**

Add tracking for batch usage in campaigns to prevent simultaneous use.

```typescript
// Add to existing leadBatches table

export const leadBatches = pgTable('lead_batches', {
  // ... existing fields ...
  
  // NEW FIELDS:
  activeCampaignId: uuid('active_campaign_id').references(() => campaigns.id),
  // If not null, this batch is currently being used by this campaign
  // Prevents multiple campaigns from using same batch simultaneously
  
  campaignHistory: json('campaign_history').$type<Array<{
    campaignId: string;
    campaignName: string;
    startedAt: string;
    completedAt: string;
  }>>(),
  // Track all campaigns that have used this batch
  
  // ... existing fields continue ...
});
```

**Migration SQL:**
```sql
ALTER TABLE lead_batches ADD COLUMN active_campaign_id UUID REFERENCES campaigns(id);
ALTER TABLE lead_batches ADD COLUMN campaign_history JSONB;

CREATE INDEX idx_lead_batches_active_campaign ON lead_batches(active_campaign_id);
```

---

## 🔧 Part 2: Fix Critical Campaign Completion Bug

### **Step 2.1: Create Campaign Email Scheduler Service**

This service handles ALL email scheduling logic and is KEY to fixing the bug.

```typescript
// apps/api/src/services/campaigns/campaign-email-scheduler.service.ts

import { db } from '@leadnex/database';
import { campaigns, scheduledEmails, leads, workflows, workflowSteps, emailTemplates } from '@leadnex/database/schema';
import { eq, and, lte, isNull, inArray } from 'drizzle-orm';
import { logger } from '../../utils/logger';

class CampaignEmailSchedulerService {
  
  /**
   * Schedule all emails for an outreach campaign
   * This is called when campaign starts (manual or scheduled)
   * 
   * CRITICAL: All emails are scheduled upfront, not sent immediately
   * This prevents premature "completed" status
   */
  async scheduleEmailsForCampaign(campaignId: string): Promise<{
    success: boolean;
    emailsScheduled: number;
    error?: string;
  }> {
    try {
      logger.info(`[CampaignScheduler] Scheduling emails for campaign ${campaignId}`);
      
      // 1. Get campaign details
      const campaign = await db.query.campaigns.findFirst({
        where: eq(campaigns.id, campaignId),
        with: {
          workflow: {
            with: {
              steps: true
            }
          },
          emailTemplate: true
        }
      });
      
      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }
      
      // 2. Get target leads
      const targetLeads = await this.getTargetLeads(campaign);
      
      if (targetLeads.length === 0) {
        logger.warn(`[CampaignScheduler] No leads found for campaign ${campaignId}`);
        return { success: false, emailsScheduled: 0, error: 'No leads found' };
      }
      
      logger.info(`[CampaignScheduler] Found ${targetLeads.length} leads for campaign ${campaignId}`);
      
      // 3. Schedule emails based on campaign type
      let scheduledCount = 0;
      
      if (campaign.useWorkflow && campaign.workflow) {
        // WORKFLOW CAMPAIGN: Schedule all steps for all leads
        scheduledCount = await this.scheduleWorkflowEmails(campaign, targetLeads);
      } else if (campaign.emailTemplateId) {
        // SINGLE EMAIL CAMPAIGN: Schedule one email per lead
        scheduledCount = await this.scheduleSingleEmails(campaign, targetLeads);
      } else {
        throw new Error('Campaign must have either workflow or template');
      }
      
      // 4. Update campaign metrics
      await db.update(campaigns)
        .set({
          totalLeadsTargeted: targetLeads.length,
          emailsScheduledCount: scheduledCount,
          status: 'running',
          actualStartedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(campaigns.id, campaignId));
      
      logger.info(`[CampaignScheduler] Scheduled ${scheduledCount} emails for campaign ${campaignId}`);
      
      return { success: true, emailsScheduled: scheduledCount };
      
    } catch (error) {
      logger.error(`[CampaignScheduler] Error scheduling emails for campaign ${campaignId}:`, error);
      
      // Mark campaign as failed
      await db.update(campaigns)
        .set({
          status: 'failed',
          failedAt: new Date(),
          failureReason: error.message,
          updatedAt: new Date()
        })
        .where(eq(campaigns.id, campaignId));
      
      return { success: false, emailsScheduled: 0, error: error.message };
    }
  }
  
  /**
   * Schedule workflow emails (multiple steps)
   * BATCH SCHEDULING: All leads get email 1 on same day, email 2 on same day, etc.
   */
  private async scheduleWorkflowEmails(
    campaign: any, 
    targetLeads: any[]
  ): Promise<number> {
    const workflow = campaign.workflow;
    const steps = workflow.steps.sort((a, b) => a.stepNumber - b.stepNumber);
    
    // Calculate send dates for each step
    const startDate = campaign.actualStartedAt || new Date();
    const scheduledEmailsData: any[] = [];
    
    // For each workflow step
    let cumulativeDays = 0;
    for (const step of steps) {
      // Calculate when this step should send
      if (step.stepNumber > 1) {
        cumulativeDays += step.daysAfterPrevious;
      }
      
      const sendDate = new Date(startDate);
      sendDate.setDate(sendDate.getDate() + cumulativeDays);
      
      // Schedule this step for ALL leads (batch scheduling)
      for (const lead of targetLeads) {
        // Safety check: Don't send if lead is not interested or converted
        if (lead.status === 'not_interested' || lead.status === 'converted') {
          continue;
        }
        
        scheduledEmailsData.push({
          campaignId: campaign.id,
          leadId: lead.id,
          templateId: step.emailTemplateId,
          workflowId: workflow.id,
          workflowStepNumber: step.stepNumber,
          scheduledFor: sendDate,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      logger.info(
        `[CampaignScheduler] Step ${step.stepNumber}: Scheduled for ${sendDate.toISOString()} ` +
        `(${cumulativeDays} days from start) for ${targetLeads.length} leads`
      );
    }
    
    // Bulk insert all scheduled emails
    if (scheduledEmailsData.length > 0) {
      await db.insert(scheduledEmails).values(scheduledEmailsData);
    }
    
    return scheduledEmailsData.length;
  }
  
  /**
   * Schedule single template emails
   */
  private async scheduleSingleEmails(
    campaign: any, 
    targetLeads: any[]
  ): Promise<number> {
    const sendDate = campaign.actualStartedAt || new Date();
    
    const scheduledEmailsData = targetLeads
      .filter(lead => lead.status !== 'not_interested' && lead.status !== 'converted')
      .map(lead => ({
        campaignId: campaign.id,
        leadId: lead.id,
        templateId: campaign.emailTemplateId,
        workflowId: null,
        workflowStepNumber: 1,
        scheduledFor: sendDate,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    
    if (scheduledEmailsData.length > 0) {
      await db.insert(scheduledEmails).values(scheduledEmailsData);
    }
    
    return scheduledEmailsData.length;
  }
  
  /**
   * Get target leads for campaign based on batch IDs or filters
   */
  private async getTargetLeads(campaign: any): Promise<any[]> {
    if (campaign.batchIds && campaign.batchIds.length > 0) {
      // Get leads from specified batches
      return await db.query.leads.findMany({
        where: inArray(leads.batchId, campaign.batchIds)
      });
    } else if (campaign.leadIds && campaign.leadIds.length > 0) {
      // Get specific leads
      return await db.query.leads.findMany({
        where: inArray(leads.id, campaign.leadIds)
      });
    } else {
      throw new Error('Campaign must have batchIds or leadIds');
    }
  }
  
  /**
   * Get next batch of emails that are due to be sent
   * Called by cron job every minute
   */
  async getDueEmails(limit: number = 100): Promise<any[]> {
    const now = new Date();
    
    return await db.query.scheduledEmails.findMany({
      where: and(
        eq(scheduledEmails.status, 'pending'),
        lte(scheduledEmails.scheduledFor, now)
      ),
      limit,
      with: {
        campaign: true,
        lead: true,
        template: true
      }
    });
  }
  
  /**
   * Mark scheduled email as sent
   */
  async markEmailSent(scheduledEmailId: string, emailId: string): Promise<void> {
    await db.update(scheduledEmails)
      .set({
        status: 'sent',
        sentAt: new Date(),
        emailId,
        updatedAt: new Date()
      })
      .where(eq(scheduledEmails.id, scheduledEmailId));
    
    // Update campaign email count
    await this.updateCampaignEmailCount(scheduledEmailId);
  }
  
  /**
   * Mark scheduled email as failed
   */
  async markEmailFailed(
    scheduledEmailId: string, 
    reason: string, 
    shouldRetry: boolean = true
  ): Promise<void> {
    const scheduled = await db.query.scheduledEmails.findFirst({
      where: eq(scheduledEmails.id, scheduledEmailId)
    });
    
    if (!scheduled) return;
    
    // Retry logic: max 3 attempts
    if (shouldRetry && scheduled.retryCount < 3) {
      // Reschedule for 1 hour later
      const newScheduledFor = new Date();
      newScheduledFor.setHours(newScheduledFor.getHours() + 1);
      
      await db.update(scheduledEmails)
        .set({
          retryCount: scheduled.retryCount + 1,
          scheduledFor: newScheduledFor,
          updatedAt: new Date()
        })
        .where(eq(scheduledEmails.id, scheduledEmailId));
      
      logger.info(`[CampaignScheduler] Rescheduled email ${scheduledEmailId} for retry (attempt ${scheduled.retryCount + 1}/3)`);
    } else {
      // Max retries reached or retry disabled, mark as failed
      await db.update(scheduledEmails)
        .set({
          status: 'failed',
          failedAt: new Date(),
          failureReason: reason,
          updatedAt: new Date()
        })
        .where(eq(scheduledEmails.id, scheduledEmailId));
      
      // Update campaign failed count
      await this.updateCampaignFailedCount(scheduledEmailId);
      
      logger.error(`[CampaignScheduler] Email ${scheduledEmailId} failed permanently: ${reason}`);
    }
  }
  
  /**
   * Update campaign email sent count
   */
  private async updateCampaignEmailCount(scheduledEmailId: string): Promise<void> {
    const scheduled = await db.query.scheduledEmails.findFirst({
      where: eq(scheduledEmails.id, scheduledEmailId)
    });
    
    if (!scheduled) return;
    
    await db.update(campaigns)
      .set({
        emailsSentCount: db.raw('emails_sent_count + 1'),
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, scheduled.campaignId));
    
    // Check if campaign is complete
    await this.checkCampaignCompletion(scheduled.campaignId);
  }
  
  /**
   * Update campaign failed email count
   */
  private async updateCampaignFailedCount(scheduledEmailId: string): Promise<void> {
    const scheduled = await db.query.scheduledEmails.findFirst({
      where: eq(scheduledEmails.id, scheduledEmailId)
    });
    
    if (!scheduled) return;
    
    await db.update(campaigns)
      .set({
        emailsFailedCount: db.raw('emails_failed_count + 1'),
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, scheduled.campaignId));
    
    // Check if campaign should be marked failed (too many failures)
    await this.checkCampaignHealth(scheduled.campaignId);
  }
  
  /**
   * CRITICAL: Check if campaign is complete
   * Campaign only completes when ALL scheduled emails are sent or failed
   */
  async checkCampaignCompletion(campaignId: string): Promise<void> {
    // Get counts of scheduled emails by status
    const emailStats = await db
      .select({
        status: scheduledEmails.status,
        count: db.raw('COUNT(*)::int')
      })
      .from(scheduledEmails)
      .where(eq(scheduledEmails.campaignId, campaignId))
      .groupBy(scheduledEmails.status);
    
    const stats = {
      pending: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      cancelled: 0
    };
    
    emailStats.forEach(stat => {
      stats[stat.status] = stat.count;
    });
    
    const totalScheduled = Object.values(stats).reduce((a, b) => a + b, 0);
    const completed = stats.sent + stats.failed + stats.skipped + stats.cancelled;
    
    logger.info(
      `[CampaignScheduler] Campaign ${campaignId} progress: ` +
      `${completed}/${totalScheduled} emails processed ` +
      `(sent: ${stats.sent}, failed: ${stats.failed}, pending: ${stats.pending})`
    );
    
    // Campaign is complete when all emails are processed (no pending emails)
    if (stats.pending === 0 && totalScheduled > 0) {
      await db.update(campaigns)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(campaigns.id, campaignId));
      
      logger.info(`[CampaignScheduler] ✅ Campaign ${campaignId} marked as COMPLETED`);
      
      // Release batch if campaign used one
      await this.releaseBatch(campaignId);
    }
  }
  
  /**
   * Check campaign health (mark as failed if too many email failures)
   */
  private async checkCampaignHealth(campaignId: string): Promise<void> {
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId)
    });
    
    if (!campaign) return;
    
    // If more than 50% of emails failed, mark campaign as failed
    const failureRate = campaign.emailsFailedCount / campaign.emailsScheduledCount;
    
    if (failureRate > 0.5 && campaign.emailsScheduledCount > 10) {
      await db.update(campaigns)
        .set({
          status: 'failed',
          failedAt: new Date(),
          failureReason: `High failure rate: ${Math.round(failureRate * 100)}% of emails failed`,
          updatedAt: new Date()
        })
        .where(eq(campaigns.id, campaignId));
      
      logger.error(`[CampaignScheduler] Campaign ${campaignId} marked as FAILED due to high failure rate`);
    }
  }
  
  /**
   * Pause campaign - cancel all pending scheduled emails
   */
  async pauseCampaign(campaignId: string): Promise<void> {
    // Don't actually delete, just mark as cancelled
    await db.update(scheduledEmails)
      .set({
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(and(
        eq(scheduledEmails.campaignId, campaignId),
        eq(scheduledEmails.status, 'pending')
      ));
    
    await db.update(campaigns)
      .set({
        status: 'paused',
        pausedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, campaignId));
    
    logger.info(`[CampaignScheduler] Campaign ${campaignId} paused, pending emails cancelled`);
  }
  
  /**
   * Resume campaign - recreate cancelled scheduled emails
   */
  async resumeCampaign(campaignId: string): Promise<void> {
    // Get cancelled emails
    const cancelled = await db.query.scheduledEmails.findMany({
      where: and(
        eq(scheduledEmails.campaignId, campaignId),
        eq(scheduledEmails.status, 'cancelled')
      )
    });
    
    if (cancelled.length === 0) {
      logger.warn(`[CampaignScheduler] No cancelled emails to resume for campaign ${campaignId}`);
      return;
    }
    
    // Reschedule all cancelled emails for immediate sending
    const now = new Date();
    
    for (const email of cancelled) {
      await db.update(scheduledEmails)
        .set({
          status: 'pending',
          scheduledFor: now,
          updatedAt: new Date()
        })
        .where(eq(scheduledEmails.id, email.id));
    }
    
    await db.update(campaigns)
      .set({
        status: 'running',
        resumedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, campaignId));
    
    logger.info(`[CampaignScheduler] Campaign ${campaignId} resumed, ${cancelled.length} emails rescheduled`);
  }
  
  /**
   * Release batch when campaign completes
   */
  private async releaseBatch(campaignId: string): Promise<void> {
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId)
    });
    
    if (!campaign || !campaign.batchIds) return;
    
    // Update batch to remove active campaign
    for (const batchId of campaign.batchIds) {
      const batch = await db.query.leadBatches.findFirst({
        where: eq(leadBatches.id, batchId)
      });
      
      if (batch && batch.activeCampaignId === campaignId) {
        // Add to history
        const history = batch.campaignHistory || [];
        history.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          startedAt: campaign.actualStartedAt?.toISOString(),
          completedAt: campaign.completedAt?.toISOString()
        });
        
        await db.update(leadBatches)
          .set({
            activeCampaignId: null,
            campaignHistory: history,
            updatedAt: new Date()
          })
          .where(eq(leadBatches.id, batchId));
        
        logger.info(`[CampaignScheduler] Released batch ${batchId} from campaign ${campaignId}`);
      }
    }
  }
}

export const campaignEmailScheduler = new CampaignEmailSchedulerService();
```

---

### **Step 2.2: Create Email Sender Service**

This service ONLY sends emails that are already scheduled. It does NOT make completion decisions.

```typescript
// apps/api/src/services/campaigns/email-sender.service.ts

import { db } from '@leadnex/database';
import { scheduledEmails, emails, leads, campaigns } from '@leadnex/database/schema';
import { eq } from 'drizzle-orm';
import { emailService } from '../email/email.service';
import { campaignEmailScheduler } from './campaign-email-scheduler.service';
import { logger } from '../../utils/logger';

class EmailSenderService {
  
  /**
   * Process and send all due emails
   * Called by cron job every minute
   */
  async processDueEmails(): Promise<{
    processed: number;
    sent: number;
    failed: number;
  }> {
    try {
      // Get emails that are due (scheduled_for <= now AND status = 'pending')
      const dueEmails = await campaignEmailScheduler.getDueEmails(100);
      
      if (dueEmails.length === 0) {
        return { processed: 0, sent: 0, failed: 0 };
      }
      
      logger.info(`[EmailSender] Processing ${dueEmails.length} due emails`);
      
      let sent = 0;
      let failed = 0;
      
      for (const scheduledEmail of dueEmails) {
        try {
          // Safety checks
          if (!this.shouldSendEmail(scheduledEmail)) {
            await campaignEmailScheduler.markEmailFailed(
              scheduledEmail.id,
              'Email skipped due to safety checks',
              false // Don't retry
            );
            failed++;
            continue;
          }
          
          // Send the email
          const emailResult = await this.sendScheduledEmail(scheduledEmail);
          
          if (emailResult.success) {
            // Mark as sent
            await campaignEmailScheduler.markEmailSent(
              scheduledEmail.id,
              emailResult.emailId
            );
            
            // Update lead status
            await this.updateLeadStatus(scheduledEmail);
            
            sent++;
          } else {
            // Mark as failed (will retry)
            await campaignEmailScheduler.markEmailFailed(
              scheduledEmail.id,
              emailResult.error
            );
            failed++;
          }
          
        } catch (error) {
          logger.error(`[EmailSender] Error sending email ${scheduledEmail.id}:`, error);
          await campaignEmailScheduler.markEmailFailed(
            scheduledEmail.id,
            error.message
          );
          failed++;
        }
      }
      
      logger.info(`[EmailSender] Processed ${dueEmails.length} emails: ${sent} sent, ${failed} failed`);
      
      return { processed: dueEmails.length, sent, failed };
      
    } catch (error) {
      logger.error('[EmailSender] Error processing due emails:', error);
      return { processed: 0, sent: 0, failed: 0 };
    }
  }
  
  /**
   * Safety checks before sending
   */
  private shouldSendEmail(scheduledEmail: any): boolean {
    const { lead, campaign } = scheduledEmail;
    
    // Check 1: Campaign must be running
    if (campaign.status !== 'running') {
      logger.warn(`[EmailSender] Campaign ${campaign.id} is not running (status: ${campaign.status})`);
      return false;
    }
    
    // Check 2: Lead must not be in bad status
    if (['not_interested', 'converted', 'invalid'].includes(lead.status)) {
      logger.warn(`[EmailSender] Lead ${lead.id} has status ${lead.status}, skipping`);
      return false;
    }
    
    // Check 3: Lead must have valid email
    if (!lead.email || lead.email.trim() === '') {
      logger.warn(`[EmailSender] Lead ${lead.id} has no email`);
      return false;
    }
    
    // Check 4: Don't send if lead already received email today (anti-spam)
    const lastContacted = lead.lastContactedAt;
    if (lastContacted) {
      const hoursSinceLastContact = (Date.now() - new Date(lastContacted).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastContact < 24) {
        logger.warn(`[EmailSender] Lead ${lead.id} was contacted ${hoursSinceLastContact.toFixed(1)} hours ago, waiting`);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Send the actual email
   */
  private async sendScheduledEmail(scheduledEmail: any): Promise<{
    success: boolean;
    emailId?: string;
    error?: string;
  }> {
    try {
      const { lead, template, campaign } = scheduledEmail;
      
      // Prepare email content with variable substitution
      const subject = this.replaceVariables(template.subject, lead, campaign);
      const body = this.replaceVariables(template.bodyText, lead, campaign);
      
      // Send via email service
      const result = await emailService.sendEmail({
        to: lead.email,
        toName: lead.contactName,
        subject,
        body,
        templateId: template.id,
        leadId: lead.id,
        campaignId: campaign.id
      });
      
      if (result.success) {
        logger.info(`[EmailSender] ✅ Sent email to ${lead.email} (campaign: ${campaign.name})`);
        return { success: true, emailId: result.emailId };
      } else {
        logger.error(`[EmailSender] ❌ Failed to send email to ${lead.email}: ${result.error}`);
        return { success: false, error: result.error };
      }
      
    } catch (error) {
      logger.error('[EmailSender] Error in sendScheduledEmail:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Replace variables in email content
   */
  private replaceVariables(text: string, lead: any, campaign: any): string {
    let result = text;
    
    // Lead variables
    const variables = {
      '{{company_name}}': lead.companyName || '',
      '{{contact_name}}': lead.contactName || 'there',
      '{{first_name}}': lead.contactName?.split(' ')[0] || 'there',
      '{{email}}': lead.email || '',
      '{{phone}}': lead.phone || '',
      '{{industry}}': lead.industry || '',
      '{{city}}': lead.city || '',
      '{{country}}': lead.country || '',
      '{{website}}': lead.website || '',
      '{{campaign_name}}': campaign.name || '',
    };
    
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(key, 'g'), value);
    }
    
    return result;
  }
  
  /**
   * Update lead status after email sent
   */
  private async updateLeadStatus(scheduledEmail: any): Promise<void> {
    const { lead, workflowStepNumber } = scheduledEmail;
    
    let newStatus = lead.status;
    
    // Auto-update status based on workflow step
    if (workflowStepNumber === 1) {
      // First email sent
      newStatus = 'contacted';
    } else if (workflowStepNumber === 2) {
      // First follow-up sent
      newStatus = 'follow_up_1';
    } else if (workflowStepNumber === 3) {
      // Second follow-up sent
      newStatus = 'follow_up_2';
    }
    
    // Update lead
    await db.update(leads)
      .set({
        status: newStatus,
        lastContactedAt: new Date(),
        emailsSent: db.raw('emails_sent + 1'),
        updatedAt: new Date()
      })
      .where(eq(leads.id, lead.id));
  }
}

export const emailSender = new EmailSenderService();
```

---

### **Step 2.3: Update Cron Jobs**

Replace the current email sending cron job with the new one.

```typescript
// apps/api/src/jobs/send-campaign-emails.job.ts

import cron from 'node-cron';
import { emailSender } from '../services/campaigns/email-sender.service';
import { logger } from '../utils/logger';

/**
 * CRON JOB: Send due campaign emails
 * Runs every minute to check for emails that are due
 * 
 * This job:
 * 1. Fetches all scheduled_emails where status='pending' AND scheduled_for <= now
 * 2. Sends them via emailSender service
 * 3. Updates their status to 'sent' or 'failed'
 * 4. Checks if campaigns should be marked complete
 */
export function startCampaignEmailSenderJob() {
  // Run every minute
  const job = cron.schedule('* * * * *', async () => {
    try {
      logger.info('[CronJob] Running campaign email sender...');
      
      const result = await emailSender.processDueEmails();
      
      if (result.processed > 0) {
        logger.info(
          `[CronJob] Campaign email sender completed: ` +
          `${result.processed} processed, ${result.sent} sent, ${result.failed} failed`
        );
      }
      
    } catch (error) {
      logger.error('[CronJob] Error in campaign email sender:', error);
    }
  });
  
  logger.info('[CronJob] Campaign email sender job started (runs every minute)');
  
  return job;
}
```

---

## 🎯 Part 3: Update Campaign Controllers & Routes

### **Step 3.1: Update Campaign Controller - Start Campaign**

This is where the bug fix is applied. When campaign starts, schedule emails but DON'T mark as completed.

```typescript
// apps/api/src/controllers/campaigns.controller.ts

import { Request, Response } from 'express';
import { db } from '@leadnex/database';
import { campaigns, leadBatches } from '@leadnex/database/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { campaignEmailScheduler } from '../services/campaigns/campaign-email-scheduler.service';
import { logger } from '../utils/logger';

class CampaignController {
  
  /**
   * Start a campaign (manual or scheduled)
   * 
   * CRITICAL FIX: This now schedules all emails upfront using scheduled_emails table
   * Campaign does NOT complete until all scheduled emails are sent
   */
  async startCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // 1. Get campaign
      const campaign = await db.query.campaigns.findFirst({
        where: eq(campaigns.id, id)
      });
      
      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
      }
      
      // 2. Validate campaign can be started
      if (!['draft', 'scheduled', 'paused'].includes(campaign.status)) {
        return res.status(400).json({
          success: false,
          error: `Campaign cannot be started from status: ${campaign.status}`
        });
      }
      
      // 3. For outreach campaigns: Check if batches are available
      if (campaign.campaignType === 'outreach' && campaign.batchIds) {
        const unavailableBatches = await this.checkBatchAvailability(campaign.batchIds, campaign.id);
        
        if (unavailableBatches.length > 0) {
          return res.status(400).json({
            success: false,
            error: `Batches ${unavailableBatches.join(', ')} are currently in use by another campaign`
          });
        }
        
        // Mark batches as in-use
        await this.lockBatches(campaign.batchIds, campaign.id);
      }
      
      // 4. Schedule all emails for this campaign
      logger.info(`[CampaignController] Starting campaign ${id}, scheduling emails...`);
      
      const schedulingResult = await campaignEmailScheduler.scheduleEmailsForCampaign(id);
      
      if (!schedulingResult.success) {
        return res.status(500).json({
          success: false,
          error: `Failed to schedule emails: ${schedulingResult.error}`
        });
      }
      
      logger.info(
        `[CampaignController] ✅ Campaign ${id} started successfully. ` +
        `Scheduled ${schedulingResult.emailsScheduled} emails.`
      );
      
      // 5. Return updated campaign
      const updatedCampaign = await db.query.campaigns.findFirst({
        where: eq(campaigns.id, id),
        with: {
          workflow: true,
          emailTemplate: true
        }
      });
      
      return res.json({
        success: true,
        data: updatedCampaign,
        message: `Campaign started. ${schedulingResult.emailsScheduled} emails scheduled.`
      });
      
    } catch (error) {
      logger.error('[CampaignController] Error starting campaign:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Pause campaign
   */
  async pauseCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await campaignEmailScheduler.pauseCampaign(id);
      
      const campaign = await db.query.campaigns.findFirst({
        where: eq(campaigns.id, id)
      });
      
      return res.json({
        success: true,
        data: campaign,
        message: 'Campaign paused successfully'
      });
      
    } catch (error) {
      logger.error('[CampaignController] Error pausing campaign:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Resume campaign
   */
  async resumeCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await campaignEmailScheduler.resumeCampaign(id);
      
      const campaign = await db.query.campaigns.findFirst({
        where: eq(campaigns.id, id)
      });
      
      return res.json({
        success: true,
        data: campaign,
        message: 'Campaign resumed successfully'
      });
      
    } catch (error) {
      logger.error('[CampaignController] Error resuming campaign:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Check if batches are available for campaign
   */
  private async checkBatchAvailability(
    batchIds: string[], 
    currentCampaignId: string
  ): Promise<string[]> {
    const unavailable: string[] = [];
    
    for (const batchId of batchIds) {
      const batch = await db.query.leadBatches.findFirst({
        where: eq(leadBatches.id, batchId)
      });
      
      if (batch && batch.activeCampaignId && batch.activeCampaignId !== currentCampaignId) {
        unavailable.push(batchId);
      }
    }
    
    return unavailable;
  }
  
  /**
   * Lock batches for campaign
   */
  private async lockBatches(batchIds: string[], campaignId: string): Promise<void> {
    for (const batchId of batchIds) {
      await db.update(leadBatches)
        .set({
          activeCampaignId: campaignId,
          updatedAt: new Date()
        })
        .where(eq(leadBatches.id, batchId));
    }
  }
  
  // ... other campaign methods ...
}

export const campaignController = new CampaignController();
```

---

## ✅ Part 4: Testing & Validation

### **Step 4.1: Test the Bug Fix**

Create a test campaign with the EXACT configuration that failed:

```typescript
// Test case for campaign a3b8bae3-4e31-48d1-b25f-97aaa3ef9c72

const testCampaign = {
  name: 'Bug Fix Test Campaign',
  campaignType: 'outreach',
  useWorkflow: true,
  workflowId: '...', // 3-step workflow, 1 day between emails
  batchIds: ['test-batch-id'],
  startType: 'manual'
};

// Expected behavior:
// 1. Campaign starts
// 2. All 3 emails scheduled for all leads in scheduled_emails table
// 3. First email sends immediately
// 4. Campaign status remains 'running'
// 5. After 1 day, second email sends
// 6. Campaign status still 'running'
// 7. After 2 days total, third email sends
// 8. Only NOW campaign status changes to 'completed'

// Testing steps:
// 1. Create campaign
// 2. Start campaign
// 3. Query scheduled_emails table - should see 3 * lead_count rows with status 'pending'
// 4. Query campaigns table - status should be 'running', NOT 'completed'
// 5. Wait for cron job to run (or manually trigger processDueEmails())
// 6. Verify first batch of emails sent
// 7. Query campaigns table - status should STILL be 'running'
// 8. Verify scheduled_emails has some 'sent' and some 'pending'
// 9. Campaign should only complete when scheduled_emails has zero 'pending' emails
```

### **Step 4.2: Validation Queries**

Use these SQL queries to debug and validate:

```sql
-- Check campaign status
SELECT id, name, status, emails_sent_count, emails_scheduled_count, 
       total_leads_targeted, completed_at
FROM campaigns 
WHERE id = 'a3b8bae3-4e31-48d1-b25f-97aaa3ef9c72';

-- Check scheduled emails for campaign
SELECT 
  status, 
  workflow_step_number,
  COUNT(*) as count,
  MIN(scheduled_for) as earliest,
  MAX(scheduled_for) as latest
FROM scheduled_emails
WHERE campaign_id = 'a3b8bae3-4e31-48d1-b25f-97aaa3ef9c72'
GROUP BY status, workflow_step_number
ORDER BY workflow_step_number, status;

-- Check individual scheduled emails (detailed)
SELECT 
  se.id,
  l.company_name,
  l.email,
  se.workflow_step_number,
  se.scheduled_for,
  se.status,
  se.sent_at,
  se.failure_reason
FROM scheduled_emails se
JOIN leads l ON l.id = se.lead_id
WHERE se.campaign_id = 'a3b8bae3-4e31-48d1-b25f-97aaa3ef9c72'
ORDER BY se.workflow_step_number, l.company_name;

-- Check if campaign should be complete
-- (This query shows if all emails are processed)
SELECT 
  'Total scheduled' as metric, COUNT(*) as count FROM scheduled_emails 
  WHERE campaign_id = 'a3b8bae3-4e31-48d1-b25f-97aaa3ef9c72'
UNION ALL
SELECT 
  'Pending' as metric, COUNT(*) as count FROM scheduled_emails 
  WHERE campaign_id = 'a3b8bae3-4e31-48d1-b25f-97aaa3ef9c72' 
  AND status = 'pending'
UNION ALL
SELECT 
  'Sent' as metric, COUNT(*) as count FROM scheduled_emails 
  WHERE campaign_id = 'a3b8bae3-4e31-48d1-b25f-97aaa3ef9c72' 
  AND status = 'sent'
UNION ALL
SELECT 
  'Failed' as metric, COUNT(*) as count FROM scheduled_emails 
  WHERE campaign_id = 'a3b8bae3-4e31-48d1-b25f-97aaa3ef9c72' 
  AND status = 'failed';
```

---

## 🎯 Success Criteria

**The bug is FIXED when:**

1. ✅ Campaign with 3-step workflow and 10 leads schedules 30 total emails
2. ✅ Campaign status is 'running' after first email batch sends
3. ✅ Campaign status remains 'running' after second email batch sends  
4. ✅ Campaign status changes to 'completed' ONLY after all 30 emails are sent or failed
5. ✅ Pause/Resume works correctly without losing scheduled emails
6. ✅ `scheduled_emails` table is the source of truth for completion status
7. ✅ No premature "completed" status changes

---

## 📝 Implementation Checklist

- [ ] Add new fields to `campaigns` table (migration)
- [ ] Create `scheduled_emails` table (migration)
- [ ] Update `leadBatches` table with active campaign tracking
- [ ] Create `campaign-email-scheduler.service.ts`
- [ ] Create `email-sender.service.ts`
- [ ] Update cron job `send-campaign-emails.job.ts`
- [ ] Update `campaigns.controller.ts` - startCampaign, pauseCampaign, resumeCampaign
- [ ] Test with example campaign `a3b8bae3-4e31-48d1-b25f-97aaa3ef9c72`
- [ ] Validate with SQL queries
- [ ] Confirm campaign completes only when all emails sent

---

## 🚨 Critical Notes

1. **DO NOT mark campaign as completed when first emails are sent**
2. **ONLY mark campaign as completed when scheduled_emails has zero pending emails**
3. **Use batch scheduling - all leads get email 1 on same day, email 2 on same day, etc.**
4. **Respect workflow step delays - calculate from campaign start date**
5. **Implement safety checks - don't spam leads, respect daily limits**
6. **Implement retry logic - max 3 attempts for failed emails**
7. **Log everything - debugging depends on good logs**

---

**END OF PROMPT 1**

This prompt fixes the critical bug and establishes the foundation for the 3-campaign-type architecture. The next prompt will implement the UI for the 3 tabs and the manual workflow builder.
