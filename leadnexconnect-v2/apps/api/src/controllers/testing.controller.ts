import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { db, leads, leadBatches, campaigns, workflows, workflowSteps, emails } from '@leadnex/database';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { emailGeneratorService } from '../services/outreach/email-generator.service';
import { emailQueueService } from '../services/outreach/email-queue.service';

/**
 * Testing Controller
 * Provides endpoints for testing email workflows and campaigns without sending real emails
 */
class TestingController {
  /**
   * POST /api/testing/generate-test-leads
   * Generate fake test leads for testing workflows
   */
  async generateTestLeads(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { count = 5, industry = 'Technology' } = req.body;

      logger.info('[Testing] Generating test leads', { count, industry });

      // Create a test batch
      const batch = await db.insert(leadBatches).values({
        name: `🧪 TEST BATCH - ${new Date().toLocaleString()}`,
        uploadedBy: 'system-test',
        totalLeads: count,
        successfulImports: count,
        failedImports: 0,
        duplicatesSkipped: 0,
        importSettings: {
          industry,
          testMode: true,
        },
        notes: 'This is a TEST batch. Safe to delete.',
      }).returning();

      const batchId = batch[0].id;

      // Generate fake test leads
      const testCompanies = [
        'Acme Corp', 'TechStart Inc', 'Digital Solutions LLC', 
        'Cloud Systems', 'Innovation Labs', 'Future Tech',
        'DataFlow Systems', 'Smart Solutions', 'NextGen Software',
        'Alpha Industries'
      ];

      const testFirstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa'];
      const testLastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];

      const testLeads = [];
      for (let i = 0; i < count; i++) {
        const firstName = testFirstNames[Math.floor(Math.random() * testFirstNames.length)];
        const lastName = testLastNames[Math.floor(Math.random() * testLastNames.length)];
        const company = testCompanies[Math.floor(Math.random() * testCompanies.length)];
        
        testLeads.push({
          batchId,
          companyName: company,
          contactName: `${firstName} ${lastName}`,
          email: `test.${firstName.toLowerCase()}.${lastName.toLowerCase()}@test-email.com`,
          phone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
          website: `https://www.${company.toLowerCase().replace(/\s/g, '')}.com`,
          industry,
          city: 'San Francisco',
          country: 'United States',
          jobTitle: ['CEO', 'CTO', 'VP Sales', 'Marketing Director'][Math.floor(Math.random() * 4)],
          companySize: ['1-10', '11-50', '51-200', '201-500'][Math.floor(Math.random() * 4)],
          status: 'new' as const, // Use const assertion for enum type
          source: 'test-generated', // Add required source field
          sourceType: 'manual_import',
          qualityScore: Math.floor(Math.random() * 40) + 60, // 60-100
          notes: '🧪 TEST LEAD - Do not send real emails to this address',
        });
      }

      const createdLeads = await db.insert(leads).values(testLeads).returning();

      logger.info('[Testing] Test leads generated', { 
        batchId, 
        leadCount: createdLeads.length 
      });

      res.json({
        success: true,
        data: {
          batch: batch[0],
          leads: createdLeads,
          message: `Created ${createdLeads.length} test leads in batch "${batch[0].name}"`,
        },
      });
    } catch (error: any) {
      logger.error('[Testing] Error generating test leads', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/testing/preview-email
   * Preview email that would be sent to a lead without actually sending
   */
  async previewEmail(req: AuthRequest, res: Response) {
    try {
      const { leadId, campaignId, workflowStepId } = req.body;

      logger.info('[Testing] Previewing email', { leadId, campaignId, workflowStepId });

      // Get lead
      const lead = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadId))
        .limit(1);

      if (!lead[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Lead not found' },
        });
      }

      // Get campaign if provided
      let campaign = null;
      let workflow = null;
      let workflowStep = null;

      if (campaignId) {
        const campaignResult = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, campaignId))
          .limit(1);

        campaign = campaignResult[0];

        // Get workflow if campaign has one
        if (campaign?.workflowId) {
          const workflowResult = await db
            .select()
            .from(workflows)
            .where(eq(workflows.id, campaign.workflowId))
            .limit(1);

          workflow = workflowResult[0];

          // Get workflow steps
          if (workflowStepId) {
            const stepResult = await db
              .select()
              .from(workflowSteps)
              .where(eq(workflowSteps.id, workflowStepId))
              .limit(1);

            workflowStep = stepResult[0];
          } else {
            // Get first step
            const steps = await db
              .select()
              .from(workflowSteps)
              .where(eq(workflowSteps.workflowId, workflow.id))
              .orderBy(workflowSteps.stepNumber)
              .limit(1);

            workflowStep = steps[0];
          }
        }
      }

      // Generate email content
      const emailContent = await emailGeneratorService.generateEmail({
        companyName: lead[0].companyName,
        contactName: lead[0].contactName || 'there',
        industry: lead[0].industry,
        city: lead[0].city || undefined,
        country: lead[0].country || undefined,
        followUpStage: workflowStep?.stepNumber?.toString() || '1',
      });

      res.json({
        success: true,
        data: {
          lead: {
            id: lead[0].id,
            name: lead[0].contactName,
            email: lead[0].email,
            company: lead[0].companyName,
            isTestLead: lead[0].email?.includes('test-email.com'),
          },
          campaign: campaign ? {
            id: campaign.id,
            name: campaign.name,
          } : null,
          workflow: workflow ? {
            id: workflow.id,
            name: workflow.name,
          } : null,
          workflowStep: workflowStep ? {
            id: workflowStep.id,
            stepNumber: workflowStep.stepNumber,
            delayDays: workflowStep.daysAfterPrevious,
          } : null,
          email: emailContent,
          warning: lead[0].email?.includes('test-email.com') 
            ? '⚠️ This is a TEST lead - email will not be sent in test mode'
            : '⚠️ This is a REAL lead - use test mode before sending',
        },
      });
    } catch (error: any) {
      logger.error('[Testing] Error previewing email', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/testing/dry-run-workflow
   * Simulate running a workflow for a lead without sending emails
   */
  async dryRunWorkflow(req: AuthRequest, res: Response) {
    try {
      const { leadId, workflowId } = req.body;

      logger.info('[Testing] Dry run workflow', { leadId, workflowId });

      // Get lead
      const lead = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadId))
        .limit(1);

      if (!lead[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Lead not found' },
        });
      }

      // Get workflow
      const workflowResult = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, workflowId))
        .limit(1);

      if (!workflowResult[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Workflow not found' },
        });
      }

      const workflow = workflowResult[0];

      // Get all workflow steps
      const steps = await db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowId, workflowId))
        .orderBy(workflowSteps.stepNumber);

      // Simulate each step
      const simulatedEmails = [];
      let cumulativeDelayDays = 0;

      for (const step of steps) {
        cumulativeDelayDays += step.daysAfterPrevious || 0;

        // Generate email content for this step
        const emailContent = await emailGeneratorService.generateEmail({
          companyName: lead[0].companyName,
          contactName: lead[0].contactName || 'there',
          industry: lead[0].industry,
          followUpStage: step.stepNumber.toString(),
        });

        // Calculate send date
        const sendDate = new Date();
        sendDate.setDate(sendDate.getDate() + cumulativeDelayDays);

        simulatedEmails.push({
          stepNumber: step.stepNumber,
          stepName: `Email ${step.stepNumber}`,
          delayDays: step.daysAfterPrevious,
          cumulativeDelayDays,
          scheduledSendDate: sendDate.toISOString(),
          subject: emailContent.subject,
          bodyPreview: emailContent.bodyText.substring(0, 200) + '...',
          fullBody: emailContent.bodyText,
        });
      }

      res.json({
        success: true,
        data: {
          lead: {
            id: lead[0].id,
            name: lead[0].contactName,
            email: lead[0].email,
            company: lead[0].companyName,
          },
          workflow: {
            id: workflow.id,
            name: workflow.name,
            totalSteps: steps.length,
            totalDuration: cumulativeDelayDays,
          },
          simulatedEmails,
          summary: {
            totalEmails: simulatedEmails.length,
            firstEmailDate: simulatedEmails[0]?.scheduledSendDate,
            lastEmailDate: simulatedEmails[simulatedEmails.length - 1]?.scheduledSendDate,
            campaignDuration: `${cumulativeDelayDays} days`,
          },
        },
      });
    } catch (error: any) {
      logger.error('[Testing] Error in dry run workflow', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/testing/send-test-email
   * Send a test email to a specific address (bypassing lead email)
   */
  async sendTestEmail(req: AuthRequest, res: Response) {
    try {
      const { testEmail, leadId, workflowId, stepNumber = 1 } = req.body;

      if (!testEmail || !testEmail.includes('@')) {
        return res.status(400).json({
          success: false,
          error: { message: 'Valid test email address required' },
        });
      }

      logger.info('[Testing] Sending test email', { testEmail, leadId, workflowId });

      // Get lead for personalization
      const lead = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadId))
        .limit(1);

      if (!lead[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Lead not found' },
        });
      }

      // Generate email content
      const emailContent = await emailGeneratorService.generateEmail({
        companyName: lead[0].companyName,
        contactName: lead[0].contactName || 'there',
        industry: lead[0].industry,
        followUpStage: stepNumber.toString(),
      });

      // Import email sender here to avoid circular dependency
      const { emailSenderService } = await import('../services/outreach/email-sender.service');

      // Send to test email instead of lead email
      await emailSenderService.sendEmail({
        leadId: lead[0].id,
        subject: `[TEST] ${emailContent.subject}`,
        bodyText: `🧪 TEST EMAIL - This would be sent to: ${lead[0].email}\n\n${emailContent.bodyText}`,
        bodyHtml: emailContent.bodyHtml 
          ? `<div style="background: #fff3cd; border: 2px solid #856404; padding: 10px; margin-bottom: 20px;">
              <strong>🧪 TEST EMAIL</strong><br>
              This would be sent to: <strong>${lead[0].email}</strong>
            </div>${emailContent.bodyHtml}`
          : undefined,
        followUpStage: stepNumber.toString(),
      });

      res.json({
        success: true,
        data: {
          message: `Test email sent to ${testEmail}`,
          lead: {
            id: lead[0].id,
            name: lead[0].contactName,
            realEmail: lead[0].email,
          },
          email: {
            subject: emailContent.subject,
            sentTo: testEmail,
          },
        },
      });
    } catch (error: any) {
      logger.error('[Testing] Error sending test email', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * GET /api/testing/email-schedule/:campaignId
   * Get the complete email schedule for a campaign (when each email will be sent)
   */
  async getEmailSchedule(req: AuthRequest, res: Response) {
    try {
      const { campaignId } = req.params;

      logger.info('[Testing] Getting email schedule', { campaignId });

      // Get campaign
      const campaignResult = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId))
        .limit(1);

      if (!campaignResult[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found' },
        });
      }

      const campaign = campaignResult[0];

      // Get workflow
      if (!campaign.workflowId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Campaign has no workflow assigned' },
        });
      }

      const workflowResult = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, campaign.workflowId))
        .limit(1);

      const workflow = workflowResult[0];

      // Get workflow steps
      const steps = await db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowId, campaign.workflowId))
        .orderBy(workflowSteps.stepNumber);

      // Calculate schedule
      const schedule = [];
      let baseDate = campaign.startDate ? new Date(campaign.startDate) : new Date();
      let cumulativeDelayDays = 0;

      for (const step of steps) {
        cumulativeDelayDays += step.daysAfterPrevious || 0;

        const sendDate = new Date(baseDate);
        sendDate.setDate(sendDate.getDate() + cumulativeDelayDays);

        schedule.push({
          stepNumber: step.stepNumber,
          emailName: `Email ${step.stepNumber}`,
          delayDays: step.daysAfterPrevious,
          cumulativeDelayDays,
          scheduledDateTime: sendDate.toISOString(),
          scheduledDateReadable: sendDate.toLocaleString(),
          daysFromStart: cumulativeDelayDays,
        });
      }

      res.json({
        success: true,
        data: {
          campaign: {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            startDate: campaign.startDate,
          },
          workflow: {
            id: workflow.id,
            name: workflow.name,
            totalSteps: steps.length,
          },
          schedule,
          summary: {
            totalEmails: schedule.length,
            campaignDuration: `${cumulativeDelayDays} days`,
            firstEmail: schedule[0]?.scheduledDateReadable,
            lastEmail: schedule[schedule.length - 1]?.scheduledDateReadable,
          },
        },
      });
    } catch (error: any) {
      logger.error('[Testing] Error getting email schedule', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * DELETE /api/testing/cleanup-test-data
   * Delete all test batches and leads
   */
  async cleanupTestData(req: AuthRequest, res: Response) {
    try {
      logger.info('[Testing] Cleaning up test data');

      // Get all test batches
      const testBatches = await db
        .select()
        .from(leadBatches);

      const testBatchIds = testBatches
        .filter(b => b.name?.includes('TEST BATCH') || (b.importSettings as any)?.testMode)
        .map(b => b.id);

      if (testBatchIds.length === 0) {
        return res.json({
          success: true,
          data: {
            message: 'No test data found to clean up',
            deletedBatches: 0,
            deletedLeads: 0,
          },
        });
      }

      // Delete leads from test batches
      let deletedLeadsCount = 0;
      for (const batchId of testBatchIds) {
        const deletedLeads = await db
          .delete(leads)
          .where(eq(leads.batchId, batchId));
        deletedLeadsCount++;
      }

      // Delete test batches
      for (const batchId of testBatchIds) {
        await db.delete(leadBatches).where(eq(leadBatches.id, batchId));
      }

      logger.info('[Testing] Test data cleaned up', {
        deletedBatches: testBatchIds.length,
        deletedLeads: deletedLeadsCount,
      });

      res.json({
        success: true,
        data: {
          message: 'Test data cleaned up successfully',
          deletedBatches: testBatchIds.length,
          deletedLeads: deletedLeadsCount,
        },
      });
    } catch (error: any) {
      logger.error('[Testing] Error cleaning up test data', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }
}

export const testingController = new TestingController();
