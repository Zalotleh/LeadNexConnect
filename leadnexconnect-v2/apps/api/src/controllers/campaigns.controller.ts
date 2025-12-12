import { Request, Response } from 'express';
import { db } from '@leadnex/database';
import { campaigns, leads, emails, emailTemplates, campaignLeads, leadBatches } from '@leadnex/database';
import { eq, desc, and, gte, count, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { apolloService } from '../services/lead-generation/apollo.service';
import { googlePlacesService } from '../services/lead-generation/google-places.service';
import { enrichmentPipelineService } from '../services/crm/enrichment-pipeline.service';
import { emailGeneratorService } from '../services/outreach/email-generator.service';
import { emailQueueService } from '../services/outreach/email-queue.service';
import { campaignEmailSchedulerService } from '../services/campaign/campaign-email-scheduler.service';
import { campaignEmailSenderService } from '../services/campaign/campaign-email-sender.service';

export class CampaignsController {
  // In-memory lock to prevent duplicate campaign executions
  private static executingCampaigns: Set<string> = new Set();
  
  /**
   * GET /api/campaigns - Get all campaigns
   * Query params:
   * - type: 'lead_generation' | 'outreach' | 'fully_automated' (optional - filter by campaign type)
   */
  async getCampaigns(req: Request, res: Response) {
    try {
      const { type } = req.query;
      
      logger.info('[CampaignsController] Getting campaigns', { type });

      // Build query with optional type filter
      const allCampaigns = type && typeof type === 'string'
        ? await db.select().from(campaigns)
            .where(eq(campaigns.campaignType, type as any))
            .orderBy(desc(campaigns.createdAt))
        : await db.select().from(campaigns)
            .orderBy(desc(campaigns.createdAt));

      // Enrich each campaign with actual counts
      const enrichedCampaigns = await Promise.all(
        allCampaigns.map(async (campaign) => {
          // Get actual lead count
          let leadsCount = 0;
          if (campaign.campaignType === 'lead_generation') {
            // For lead_generation, count leads in batches created by this campaign
            // Check both active_campaign_id and import_settings->campaignId
            const batchIds = await db
              .select({ id: leadBatches.id })
              .from(leadBatches)
              .where(
                sql`${leadBatches.activeCampaignId} = ${campaign.id} OR ${leadBatches.importSettings}->>'campaignId' = ${campaign.id}`
              );
            
            if (batchIds.length > 0) {
              const leadsResult = await db
                .select({ count: count() })
                .from(leads)
                .where(
                  sql`${leads.batchId} IN (${sql.join(batchIds.map(b => sql`${b.id}`), sql`, `)})`
                );
              leadsCount = Number(leadsResult[0]?.count || 0);
            }
          } else if (campaign.campaignType === 'fully_automated') {
            // For fully_automated, count leads from BOTH batches AND enrolled leads
            // Count from batches (generated leads)
            const batchIds = await db
              .select({ id: leadBatches.id })
              .from(leadBatches)
              .where(
                sql`${leadBatches.activeCampaignId} = ${campaign.id} OR ${leadBatches.importSettings}->>'campaignId' = ${campaign.id}`
              );
            
            let batchLeadsCount = 0;
            if (batchIds.length > 0) {
              const leadsResult = await db
                .select({ count: count() })
                .from(leads)
                .where(
                  sql`${leads.batchId} IN (${sql.join(batchIds.map(b => sql`${b.id}`), sql`, `)})`
                );
              batchLeadsCount = Number(leadsResult[0]?.count || 0);
            }

            // Count from campaign_leads (enrolled leads)
            const enrolledResult = await db
              .select({ count: count() })
              .from(campaignLeads)
              .where(eq(campaignLeads.campaignId, campaign.id));
            const enrolledCount = Number(enrolledResult[0]?.count || 0);

            // Use the maximum of both counts (in case leads are in both)
            leadsCount = Math.max(batchLeadsCount, enrolledCount);
          } else {
            // For outreach and manual campaign types, use campaignLeads junction table
            const result = await db
              .select({ count: count() })
              .from(campaignLeads)
              .where(eq(campaignLeads.campaignId, campaign.id));
            leadsCount = Number(result[0]?.count || 0);
          }

          // Get actual batch count (for lead_generation and fully_automated campaigns)
          let batchCount = 0;
          if (campaign.campaignType === 'lead_generation' || campaign.campaignType === 'fully_automated') {
            const batchesResult = await db
              .select({ count: count() })
              .from(leadBatches)
              .where(
                sql`${leadBatches.activeCampaignId} = ${campaign.id} OR ${leadBatches.importSettings}->>'campaignId' = ${campaign.id}`
              );
            batchCount = Number(batchesResult[0]?.count || 0);
          }

          return {
            ...campaign,
            leadsGenerated: leadsCount,
            batchesCreated: batchCount,
          };
        })
      );

      res.json({
        success: true,
        data: enrichedCampaigns,
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error getting campaigns', { error: error.message });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * GET /api/campaigns/:id - Get single campaign
   */
  async getCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const campaign = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, id))
        .limit(1);

      if (!campaign[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found' },
        });
      }

      const campaignData = campaign[0];

      // Get workflow data if campaign has workflowId
      let workflowData = null;
      if (campaignData.workflowId) {
        const { workflows, workflowSteps } = await import('@leadnex/database');
        
        const workflowResults = await db
          .select()
          .from(workflows)
          .where(eq(workflows.id, campaignData.workflowId))
          .limit(1);

        if (workflowResults.length > 0) {
          const steps = await db
            .select()
            .from(workflowSteps)
            .where(eq(workflowSteps.workflowId, campaignData.workflowId))
            .orderBy(workflowSteps.stepNumber);

          workflowData = {
            ...workflowResults[0],
            steps,
          };
        }
      }

      // Get email template data if campaign has emailTemplateId
      let emailTemplateData = null;
      if (campaignData.emailTemplateId) {
        const emailTemplateResults = await db
          .select()
          .from(emailTemplates)
          .where(eq(emailTemplates.id, campaignData.emailTemplateId))
          .limit(1);

        if (emailTemplateResults.length > 0) {
          emailTemplateData = emailTemplateResults[0];
        }
      }

      // Get actual batch count (for lead_generation and fully_automated campaigns)
      let batchCount = 0;
      if (campaignData.campaignType === 'lead_generation' || campaignData.campaignType === 'fully_automated') {
        const batchesResult = await db
          .select({ count: count() })
          .from(leadBatches)
          .where(
            sql`${leadBatches.activeCampaignId} = ${campaignData.id} OR ${leadBatches.importSettings}->>'campaignId' = ${campaignData.id}`
          );
        batchCount = Number(batchesResult[0]?.count || 0);
      }

      // Get actual lead count
      let leadsCount = 0;
      if (campaignData.campaignType === 'lead_generation') {
        // For lead_generation, count leads in batches created by this campaign
        const batchIds = await db
          .select({ id: leadBatches.id })
          .from(leadBatches)
          .where(
            sql`${leadBatches.activeCampaignId} = ${campaignData.id} OR ${leadBatches.importSettings}->>'campaignId' = ${campaignData.id}`
          );
        
        if (batchIds.length > 0) {
          const leadsResult = await db
            .select({ count: count() })
            .from(leads)
            .where(
              sql`${leads.batchId} IN (${sql.join(batchIds.map(b => sql`${b.id}`), sql`, `)})`
            );
          leadsCount = Number(leadsResult[0]?.count || 0);
        }
      } else if (campaignData.campaignType === 'fully_automated') {
        // For fully_automated, count leads from BOTH batches AND enrolled leads
        // Count from batches (generated leads)
        const batchIds = await db
          .select({ id: leadBatches.id })
          .from(leadBatches)
          .where(
            sql`${leadBatches.activeCampaignId} = ${campaignData.id} OR ${leadBatches.importSettings}->>'campaignId' = ${campaignData.id}`
          );
        
        let batchLeadsCount = 0;
        if (batchIds.length > 0) {
          const leadsResult = await db
            .select({ count: count() })
            .from(leads)
            .where(
              sql`${leads.batchId} IN (${sql.join(batchIds.map(b => sql`${b.id}`), sql`, `)})`
            );
          batchLeadsCount = Number(leadsResult[0]?.count || 0);
        }

        // Count from campaign_leads (enrolled leads)
        const enrolledResult = await db
          .select({ count: count() })
          .from(campaignLeads)
          .where(eq(campaignLeads.campaignId, campaignData.id));
        const enrolledCount = Number(enrolledResult[0]?.count || 0);

        // Use the maximum of both counts (in case leads are in both)
        leadsCount = Math.max(batchLeadsCount, enrolledCount);
      } else {
        // For outreach and manual campaign types, use campaignLeads junction table
        const result = await db
          .select({ count: count() })
          .from(campaignLeads)
          .where(eq(campaignLeads.campaignId, campaignData.id));
        leadsCount = Number(result[0]?.count || 0);
      }

      // Get actual emails sent count - count unique leads that received at least one email
      const uniqueLeadsWithEmails = await db
        .selectDistinct({ leadId: emails.leadId })
        .from(emails)
        .where(eq(emails.campaignId, id));
      const emailsSentCount = uniqueLeadsWithEmails.length;

      res.json({
        success: true,
        data: {
          ...campaignData,
          workflow: workflowData,
          emailTemplate: emailTemplateData,
          batchesCreated: batchCount,
          leadsGenerated: leadsCount,
          emailsSent: emailsSentCount,
        },
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error getting campaign', { error: error.message });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * GET /api/campaigns/:id/leads - Get enrolled leads for a campaign
   */
  async getCampaignLeads(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Get leads enrolled in this campaign via campaignLeads table
      const campaignLeadRecords = await db
        .select()
        .from(campaignLeads)
        .where(eq(campaignLeads.campaignId, id));

      const leadIds = campaignLeadRecords.map(cl => cl.leadId);
      
      if (leadIds.length === 0) {
        return res.json({
          success: true,
          data: [],
        });
      }

      // Fetch lead details
      const enrolledLeads = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadIds[0]));

      // Fetch all leads (need to query each separately or use IN clause)
      const allLeads = [];
      for (const leadId of leadIds) {
        const leadResults = await db
          .select()
          .from(leads)
          .where(eq(leads.id, leadId))
          .limit(1);
        
        if (leadResults.length > 0) {
          allLeads.push(leadResults[0]);
        }
      }

      res.json({
        success: true,
        data: allLeads,
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error getting campaign leads', { error: error.message });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * GET /api/campaigns/:id/leads-with-activity - Get enrolled leads with email activity aggregated
   */
  async getCampaignLeadsWithActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;

      logger.info('[CampaignsController] Getting campaign leads with activity', { campaignId: id });

      // Get campaign to check if it uses workflow
      const campaignResult = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, id))
        .limit(1);

      if (!campaignResult[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found' },
        });
      }

      const campaign = campaignResult[0];

      // Get leads enrolled in this campaign
      const campaignLeadRecords = await db
        .select({
          leadId: campaignLeads.leadId,
          addedAt: campaignLeads.addedAt,
          processed: campaignLeads.processed,
        })
        .from(campaignLeads)
        .where(eq(campaignLeads.campaignId, id));

      if (campaignLeadRecords.length === 0) {
        return res.json({
          success: true,
          data: [],
        });
      }

      const leadIds = campaignLeadRecords.map(cl => cl.leadId);

      // Fetch lead details - using sql IN operator for efficiency
      const leadsData = await db
        .select()
        .from(leads)
        .where(sql`${leads.id} IN (${sql.join(leadIds.map(lid => sql`${lid}`), sql`, `)})`);

      // Get all emails for these leads in this campaign
      const emailsData = await db
        .select({
          id: emails.id,
          leadId: emails.leadId,
          subject: emails.subject,
          status: emails.status,
          followUpStage: emails.followUpStage,
          sentAt: emails.sentAt,
          deliveredAt: emails.deliveredAt,
          openedAt: emails.openedAt,
          clickedAt: emails.clickedAt,
          openCount: emails.openCount,
          clickCount: emails.clickCount,
          createdAt: emails.createdAt,
        })
        .from(emails)
        .where(
          sql`${emails.campaignId} = ${id} AND ${emails.leadId} IN (${sql.join(leadIds.map(lid => sql`${lid}`), sql`, `)})`
        )
        .orderBy(emails.createdAt);

      // Group emails by leadId
      const emailsByLead: { [key: string]: any[] } = {};
      emailsData.forEach(email => {
        if (!emailsByLead[email.leadId]) {
          emailsByLead[email.leadId] = [];
        }
        emailsByLead[email.leadId].push(email);
      });

      // Build enriched lead data with email statistics
      const enrichedLeads = leadsData.map(lead => {
        const leadEmails = emailsByLead[lead.id] || [];
        const campaignLeadRecord = campaignLeadRecords.find(cl => cl.leadId === lead.id);

        // Calculate email statistics for this lead
        const totalEmails = leadEmails.length;
        const emailsSent = leadEmails.filter(e => e.sentAt !== null).length;
        const emailsDelivered = leadEmails.filter(e => e.deliveredAt !== null).length;
        const emailsOpened = leadEmails.filter(e => e.openedAt !== null).length;
        const emailsClicked = leadEmails.filter(e => e.clickedAt !== null).length;
        const emailsFailed = leadEmails.filter(e => e.status === 'failed' || e.status === 'bounced').length;
        const emailsQueued = leadEmails.filter(e => e.status === 'queued').length;

        // Get latest email status
        const latestEmail = leadEmails.length > 0 ? leadEmails[leadEmails.length - 1] : null;
        let overallStatus = 'not_sent';
        if (emailsClicked > 0) overallStatus = 'clicked';
        else if (emailsOpened > 0) overallStatus = 'opened';
        else if (emailsDelivered > 0) overallStatus = 'delivered';
        else if (emailsSent > 0) overallStatus = 'sent';
        else if (emailsQueued > 0) overallStatus = 'queued';
        else if (emailsFailed > 0) overallStatus = 'failed';

        // Get first and last email dates
        const firstEmailDate = leadEmails.length > 0 ? leadEmails[0].createdAt : null;
        const lastEmailDate = latestEmail ? latestEmail.sentAt || latestEmail.createdAt : null;

        return {
          ...lead,
          enrolledAt: campaignLeadRecord?.addedAt,
          processed: campaignLeadRecord?.processed,
          emailActivity: {
            totalEmails,
            emailsSent,
            emailsDelivered,
            emailsOpened,
            emailsClicked,
            emailsFailed,
            emailsQueued,
            overallStatus,
            firstEmailDate,
            lastEmailDate,
            latestEmailStatus: latestEmail?.status || null,
            latestEmailSubject: latestEmail?.subject || null,
            // Include detailed email list for expansion if needed
            emails: leadEmails.map(e => ({
              id: e.id,
              subject: e.subject,
              status: e.status,
              followUpStage: e.followUpStage || 'initial',
              sentAt: e.sentAt,
              deliveredAt: e.deliveredAt,
              openedAt: e.openedAt,
              clickedAt: e.clickedAt,
              openCount: e.openCount || 0,
              clickCount: e.clickCount || 0,
              createdAt: e.createdAt,
            })),
          },
        };
      });

      res.json({
        success: true,
        data: enrichedLeads,
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error getting campaign leads with activity', { 
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/campaigns - Create new campaign
   */
  async createCampaign(req: Request, res: Response) {
    try {
      const {
        name,
        description,
        campaignType,
        industry,
        targetCountry,
        targetCountries,
        targetCity,
        targetCities,
        companySize,
        leadsPerDay,
        leadSources, // Array of source IDs
        usesLinkedin,
        usesApollo,
        usesPeopleDL,
        usesGooglePlaces,
        usesWebScraping,
        workflowId,
        emailTemplateId,
        emailSubject,
        emailBody,
        followUpEnabled,
        followUp1DelayDays,
        followUp2DelayDays,
        leadIds,
        batchIds,
        scheduleType,
        scheduleTime,
        scheduledAt,
        status,
        startType,
        scheduledStartAt,
        useWorkflow,
        // Lead generation specific fields
        isRecurring,
        recurringInterval,
        endDate,
        maxResultsPerRun,
      } = req.body;

      // Convert leadSources array to individual boolean flags if provided
      let finalUsesApollo = usesApollo || false;
      let finalUsesGooglePlaces = usesGooglePlaces || false;
      let finalUsesLinkedin = usesLinkedin || false;
      let finalUsesPeopleDL = usesPeopleDL || false;
      let finalUsesWebScraping = usesWebScraping || false;

      if (leadSources && Array.isArray(leadSources)) {
        finalUsesApollo = leadSources.includes('apollo');
        finalUsesGooglePlaces = leadSources.includes('google_places');
        finalUsesLinkedin = leadSources.includes('linkedin');
        finalUsesPeopleDL = leadSources.includes('peopledatalabs');
        finalUsesWebScraping = leadSources.includes('web_scraping');
      }

      logger.info('[CampaignsController] Creating campaign', { 
        name,
        campaignType: campaignType || 'automated',
        leadSources,
        usesApollo: finalUsesApollo, 
        usesGooglePlaces: finalUsesGooglePlaces,
        industry,
        targetCountries: targetCountries || [targetCountry],
      });

      // If manual campaign with email subject/body, create email template
      let finalEmailTemplateId = emailTemplateId;
      if (campaignType === 'manual' && emailSubject && emailBody) {
        const emailTemplate = await db
          .insert(emailTemplates)
          .values({
            name: `${name} Template`,
            description: `Email template for ${name} campaign`,
            subject: emailSubject,
            bodyText: emailBody,
            industry: industry || null,
            followUpStage: 'initial',
            isActive: true,
          })
          .returning();
        
        finalEmailTemplateId = emailTemplate[0].id;
        logger.info('[CampaignsController] Created email template', { templateId: finalEmailTemplateId });
      }

      // Prepare campaign data - only include emailTemplateId if it's a valid UUID
      const campaignData: any = {
        name,
        description,
        campaignType: campaignType || 'automated',
        industry,
        targetCountries: targetCountries || (targetCountry ? [targetCountry] : []),
        targetCities: targetCities || (targetCity ? [targetCity] : []),
        companySize,
        leadsPerDay: leadsPerDay || 50,
        usesLinkedin: finalUsesLinkedin,
        usesApollo: finalUsesApollo,
        usesPeopleDL: finalUsesPeopleDL,
        usesGooglePlaces: finalUsesGooglePlaces,
        usesWebScraping: finalUsesWebScraping,
        workflowId: workflowId || null,
        followUpEnabled: followUpEnabled !== undefined ? followUpEnabled : true,
        followUp1DelayDays: followUp1DelayDays || 3,
        followUp2DelayDays: followUp2DelayDays || 5,
        status: status || (scheduleType === 'immediate' ? 'active' : 'draft'),
        scheduleType: scheduleType || 'manual',
        scheduleTime,
        startDate: scheduledAt ? new Date(scheduledAt) : undefined,
        leadsGenerated: leadIds?.length || 0,
        emailsSent: 0,
        emailsOpened: 0,
        emailsClicked: 0,
        responsesReceived: 0,
      };

      // Only add emailTemplateId if it's provided and not empty
      if (finalEmailTemplateId && finalEmailTemplateId.trim() !== '') {
        campaignData.emailTemplateId = finalEmailTemplateId;
      }

      // Create campaign
      const newCampaign = await db
        .insert(campaigns)
        .values(campaignData)
        .returning();

      const campaignId = newCampaign[0].id;

      // For outreach campaigns, enroll leads from selected batches or individual leads
      if (campaignType === 'outreach') {
        let leadsToEnroll: string[] = [];

        // If batches are selected, get all leads from those batches
        if (batchIds && batchIds.length > 0) {
          logger.info('[CampaignsController] Enrolling leads from batches', { 
            campaignId, 
            batchCount: batchIds.length 
          });

          const batchLeads = await db
            .select({ id: leads.id })
            .from(leads)
            .where(sql`${leads.batchId} IN (${sql.join(batchIds.map((bid: string) => sql`${bid}`), sql`, `)})`);
          
          leadsToEnroll = batchLeads.map(l => l.id);
          logger.info('[CampaignsController] Found leads from batches', { 
            leadCount: leadsToEnroll.length 
          });
        }
        
        // If individual leads are selected
        if (leadIds && leadIds.length > 0) {
          leadsToEnroll = [...leadsToEnroll, ...leadIds];
        }

        // Enroll leads in campaign_leads table
        if (leadsToEnroll.length > 0) {
          const enrollmentData = leadsToEnroll.map(leadId => ({
            campaignId,
            leadId,
          }));

          await db.insert(campaignLeads).values(enrollmentData);
          
          logger.info('[CampaignsController] Enrolled leads in campaign', {
            campaignId,
            enrolledCount: leadsToEnroll.length,
          });
        } else {
          logger.warn('[CampaignsController] No leads to enroll for outreach campaign', {
            campaignId,
          });
        }
      }

      res.json({
        success: true,
        data: newCampaign[0],
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error creating campaign', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/campaigns/from-batch - Create campaign from a batch
   */
  async createCampaignFromBatch(req: Request, res: Response) {
    try {
      const {
        name,
        description,
        batchId,
        workflowId,
        emailTemplateId,
        startImmediately = false,
      } = req.body;

      if (!batchId) {
        return res.status(400).json({
          success: false,
          error: { message: 'batchId is required' },
        });
      }

      logger.info('[CampaignsController] Creating campaign from batch', {
        batchId,
        startImmediately,
      });

      // Get batch details
      const batch = await db
        .select()
        .from(leadBatches)
        .where(eq(leadBatches.id, batchId))
        .limit(1);

      if (batch.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Batch not found' },
        });
      }

      const batchData = batch[0];

      // Get leads from this batch
      const batchLeads = await db
        .select()
        .from(leads)
        .where(eq(leads.batchId, batchId));

      if (batchLeads.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'No leads found in this batch' },
        });
      }

      logger.info(`[CampaignsController] Found ${batchLeads.length} leads in batch ${batchId}`);

      // Extract industry and location from batch settings or leads
      const importSettings = batchData.importSettings as any;
      const industry = importSettings?.industry || batchLeads[0].industry;
      const targetCountries = importSettings?.countries || [batchLeads[0].country].filter(Boolean);
      const targetCities = importSettings?.cities || [batchLeads[0].city].filter(Boolean);

      // Create campaign
      const campaignData: any = {
        name: name || `Campaign - ${batchData.name}`,
        description: description || `Campaign created from batch: ${batchData.name}`,
        campaignType: 'manual', // Batch campaigns are manual since leads are pre-generated
        batchId: batchId, // Link to the batch
        industry: industry,
        targetCountries: targetCountries.length > 0 ? targetCountries : null,
        targetCities: targetCities.length > 0 ? targetCities : null,
        status: startImmediately ? 'active' : 'draft',
        scheduleType: 'manual',
        leadsGenerated: batchLeads.length,
        emailsSent: 0,
        emailsOpened: 0,
        emailsClicked: 0,
        responsesReceived: 0,
      };

      if (workflowId) {
        campaignData.workflowId = workflowId;
      }

      if (emailTemplateId) {
        campaignData.emailTemplateId = emailTemplateId;
      }

      const newCampaign = await db
        .insert(campaigns)
        .values(campaignData)
        .returning();

      const campaignId = newCampaign[0].id;

      // Link all batch leads to the campaign
      const campaignLeadRecords = batchLeads.map(lead => ({
        campaignId,
        leadId: lead.id,
      }));

      await db.insert(campaignLeads).values(campaignLeadRecords);

      logger.info(`[CampaignsController] Campaign created from batch`, {
        campaignId,
        batchId,
        leadsLinked: batchLeads.length,
      });

      // If starting immediately, execute the campaign
      if (startImmediately) {
        // Execute in background
        this.executeCampaign(campaignId, newCampaign[0]).catch(error => {
          logger.error('[CampaignsController] Error executing campaign after creation', {
            campaignId,
            error: error.message,
          });
        });
      }

      res.json({
        success: true,
        data: {
          campaign: newCampaign[0],
          leadsLinked: batchLeads.length,
        },
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error creating campaign from batch', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/campaigns/:id/leads - Link leads to a manual campaign
   */
  async addLeadsToCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { leadIds } = req.body;

      if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'leadIds array is required' },
        });
      }

      logger.info('[CampaignsController] Adding leads to campaign', {
        campaignId: id,
        leadCount: leadIds.length,
      });

      // Import campaignLeads from database
      const { campaignLeads } = await import('@leadnex/database');

      // Insert campaign-lead relationships
      const relationships = leadIds.map(leadId => ({
        campaignId: id,
        leadId,
      }));

      await db.insert(campaignLeads).values(relationships);

      // Update campaign leads count
      await db
        .update(campaigns)
        .set({
          leadsGenerated: leadIds.length,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, id));

      res.json({
        success: true,
        message: `${leadIds.length} leads linked to campaign`,
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error adding leads to campaign', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/campaigns/:id/execute - Manually execute a campaign
   */
  async executeCampaignEndpoint(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Get campaign
      const campaignResults = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, id))
        .limit(1);

      if (!campaignResults[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found' },
        });
      }

      const campaign = campaignResults[0];

      // Update campaign status to active BEFORE executing
      // (so email queue can process jobs immediately)
      await db
        .update(campaigns)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(campaigns.id, id));

      // Small delay to ensure database transaction commits
      // before email queue starts processing jobs
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Execute campaign
      await this.executeCampaign(id, campaign);

      res.json({
        success: true,
        message: 'Campaign execution started',
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error executing campaign endpoint', { 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * PUT /api/campaigns/:id - Update campaign
   */
  async updateCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const updated = await db
        .update(campaigns)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(campaigns.id, id))
        .returning();

      if (!updated[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found' },
        });
      }

      res.json({
        success: true,
        data: updated[0],
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error updating campaign', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/campaigns/:id/start - Start campaign
   */
  async startCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Get campaign details
      const campaignResult = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, id))
        .limit(1);

      if (!campaignResult[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found' },
        });
      }

      const campaign = campaignResult[0];

      // Prevent starting if already active or running
      if (campaign.status === 'active' || campaign.status === 'running') {
        logger.warn('[CampaignsController] Campaign already active/running, skipping duplicate start', { id });
        return res.status(400).json({
          success: false,
          error: { message: 'Campaign is already active or running' },
        });
      }

      // Update campaign status to running
      const updateData: any = {
        status: 'running',
        actualStartedAt: new Date(),
        updatedAt: new Date(),
      };

      await db
        .update(campaigns)
        .set(updateData)
        .where(eq(campaigns.id, id));

      logger.info('[CampaignsController] Campaign starting', {
        id,
        name: campaign.name,
      });

      // Schedule all emails for this campaign using the NEW service
      const scheduleResult = await campaignEmailSchedulerService.scheduleEmailsForCampaign(id);

      if (!scheduleResult.success) {
        logger.error('[CampaignsController] Failed to schedule emails', {
          campaignId: id,
          error: scheduleResult.error,
        });

        // Revert campaign status to draft
        await db
          .update(campaigns)
          .set({
            status: 'draft',
            failedAt: new Date(),
            failureReason: scheduleResult.error || 'Failed to schedule emails',
            updatedAt: new Date(),
          })
          .where(eq(campaigns.id, id));

        return res.status(500).json({
          success: false,
          error: { message: `Failed to schedule emails: ${scheduleResult.error}` },
        });
      }

      logger.info('[CampaignsController] Campaign started successfully', {
        campaignId: id,
        scheduledEmailsCount: scheduleResult.scheduledCount,
      });

      res.json({
        success: true,
        data: {
          ...campaign,
          status: 'running',
          actualStartedAt: new Date(),
          emailsScheduledCount: scheduleResult.scheduledCount,
        },
        message: `Campaign started successfully. ${scheduleResult.scheduledCount} emails scheduled.`,
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error starting campaign', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * Execute campaign: Generate leads and send emails
   */
  private async executeCampaign(campaignId: string, campaign: any) {
    // Check if campaign is already executing
    if (CampaignsController.executingCampaigns.has(campaignId)) {
      logger.warn('[CampaignsController] Campaign already executing, skipping duplicate', {
        campaignId,
      });
      return;
    }

    // Add to executing set
    CampaignsController.executingCampaigns.add(campaignId);

    try {
      logger.info('[CampaignsController] Executing campaign', {
        campaignId,
        name: campaign.name,
        campaignType: campaign.campaignType,
        usesApollo: campaign.usesApollo,
        usesGooglePlaces: campaign.usesGooglePlaces,
        industry: campaign.industry,
        targetCountries: campaign.targetCountries,
        targetCities: campaign.targetCities,
      });

      // Check if this is an outreach or manual campaign with pre-selected leads
      if (campaign.campaignType === 'manual' || campaign.campaignType === 'outreach') {
        await this.executeManualCampaign(campaignId, campaign);
        return;
      }

      // Check if this is a lead_generation campaign (only generates leads, no emails)
      if (campaign.campaignType === 'lead_generation') {
        await this.executeAutomatedCampaign(campaignId, campaign);
        return;
      }

      // Otherwise, execute as fully_automated (generates leads AND sends emails)
      await this.executeAutomatedCampaign(campaignId, campaign);
    } catch (error: any) {
      logger.error('[CampaignsController] Fatal error executing campaign', {
        campaignId,
        error: error.message,
        stack: error.stack,
      });
      
      // Update campaign status to error
      await db
        .update(campaigns)
        .set({ status: 'paused' })
        .where(eq(campaigns.id, campaignId));
    } finally {
      // Always remove the campaign from the executing set
      CampaignsController.executingCampaigns.delete(campaignId);
      logger.info('[CampaignsController] Removed campaign from executing set', { campaignId });
    }
  }

  /**
   * Execute manual campaign: Send emails to pre-selected leads
   */
  private async executeManualCampaign(campaignId: string, campaign: any) {
    try {
      logger.info('[CampaignsController] Executing manual campaign', { campaignId });

      // Get leads enrolled in this campaign
      const campaignLeadRecords = await db
        .select()
        .from(campaignLeads)
        .where(eq(campaignLeads.campaignId, campaignId));

      if (campaignLeadRecords.length === 0) {
        logger.warn('[CampaignsController] No leads enrolled in manual campaign');
        return;
      }

      logger.info(`[CampaignsController] Found ${campaignLeadRecords.length} leads in campaign`);

      // Fetch lead details
      const leadIds = campaignLeadRecords.map(cl => cl.leadId);
      const campaignLeadsList = [];
      
      for (const leadId of leadIds) {
        const leadResults = await db
          .select()
          .from(leads)
          .where(eq(leads.id, leadId))
          .limit(1);
        
        if (leadResults.length > 0) {
          campaignLeadsList.push(leadResults[0]);
        }
      }

      logger.info(`[CampaignsController] Fetched ${campaignLeadsList.length} lead details`);

      // Check if campaign uses workflow or single template
      if (campaign.workflowId) {
        // Execute workflow sequence
        await this.executeWorkflowSequence(campaignId, campaign, campaignLeadsList);
      } else {
        // Execute single email template
        await this.executeSingleTemplate(campaignId, campaign, campaignLeadsList);
      }

      logger.info('[CampaignsController] Manual campaign execution completed', {
        campaignId,
        leadsProcessed: campaignLeadsList.length,
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error executing manual campaign', {
        campaignId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Execute workflow sequence for campaign leads
   */
  private async executeWorkflowSequence(campaignId: string, campaign: any, campaignLeadsList: any[]) {
    const { workflowSteps } = await import('@leadnex/database');
    
    logger.info('[CampaignsController] Executing workflow sequence', { 
      workflowId: campaign.workflowId 
    });

    // Get workflow steps
    const steps = await db
      .select()
      .from(workflowSteps)
      .where(eq(workflowSteps.workflowId, campaign.workflowId))
      .orderBy(workflowSteps.stepNumber);

    if (steps.length === 0) {
      logger.error('[CampaignsController] No steps found for workflow', {
        workflowId: campaign.workflowId
      });
      return;
    }

    logger.info(`[CampaignsController] Found ${steps.length} workflow steps`);

    // Determine the base time for scheduling
    // If campaign has a startDate, use it; otherwise use current time
    const baseTime = campaign.startDate ? new Date(campaign.startDate).getTime() : Date.now();
    logger.info('[CampaignsController] Using base time for scheduling', {
      baseTime: new Date(baseTime).toISOString(),
      campaignStartDate: campaign.startDate,
    });

    let totalEmailsQueued = 0;

    // Process each lead
    for (const lead of campaignLeadsList) {
      if (!lead.email) {
        logger.warn('[CampaignsController] Lead has no email', { leadId: lead.id });
        continue;
      }

      // Calculate cumulative delays for each step
      let cumulativeDelayMinutes = 0;

      // Queue all steps for this lead with appropriate delays
      for (const step of steps) {
        try {
          // Determine the follow-up stage for this step
          const followUpStage = step.stepNumber === 1 ? 'initial' : `follow_up_${step.stepNumber - 1}`;
          
          // Check if email already exists for this combination (prevent duplicates)
          const existingEmails = await db
            .select()
            .from(emails)
            .where(
              and(
                eq(emails.campaignId, campaignId),
                eq(emails.leadId, lead.id),
                eq(emails.followUpStage, followUpStage)
              )
            )
            .limit(1);

          if (existingEmails.length > 0) {
            logger.info('[CampaignsController] Email already queued for this lead+step, skipping duplicate', {
              leadId: lead.id,
              stepNumber: step.stepNumber,
              followUpStage,
              existingEmailId: existingEmails[0].id,
              existingEmailStatus: existingEmails[0].status,
            });
            continue;
          }

          // Replace template variables
          const subject = this.replaceTemplateVariables(step.subject || '', lead);
          const bodyText = this.replaceTemplateVariables(step.body || '', lead);

          // Calculate cumulative delay from campaign start
          // First step sends immediately (cumulativeDelayMinutes = 0)
          // Subsequent steps add their daysAfterPrevious to the cumulative total
          if (step.stepNumber > 1) {
            cumulativeDelayMinutes += (step.daysAfterPrevious || 0) * 24 * 60;
          }

          // Queue email - let email sender service handle HTML conversion
          if (cumulativeDelayMinutes > 0) {
            // Schedule for later based on cumulative delay from base time
            const sendAt = new Date(baseTime + cumulativeDelayMinutes * 60 * 1000);
            await emailQueueService.scheduleEmail({
              leadId: lead.id,
              campaignId: campaignId,
              to: lead.email,
              subject,
              bodyText,
              bodyHtml: undefined, // Let email sender convert to HTML
              followUpStage: step.stepNumber === 1 ? 'initial' : `follow_up_${step.stepNumber - 1}`,
              metadata: {
                companyName: lead.companyName,
                industry: lead.industry,
                workflowStepNumber: step.stepNumber,
                workflowStepId: step.id,
              },
            }, sendAt);
            
            logger.info('[CampaignsController] Workflow step scheduled', { 
              leadId: lead.id,
              stepNumber: step.stepNumber,
              delayDays: step.daysAfterPrevious,
              cumulativeDelayMinutes,
              sendAt: sendAt.toISOString(),
            });
          } else {
            // First step - check if it should be scheduled or sent immediately
            const now = Date.now();
            
            if (baseTime > now) {
              // Campaign is scheduled for future, schedule the first email
              const sendAt = new Date(baseTime);
              await emailQueueService.scheduleEmail({
                leadId: lead.id,
                campaignId: campaignId,
                to: lead.email,
                subject,
                bodyText,
                bodyHtml: undefined,
                followUpStage: 'initial',
                metadata: {
                  companyName: lead.companyName,
                  industry: lead.industry,
                  workflowStepNumber: step.stepNumber,
                  workflowStepId: step.id,
                },
              }, sendAt);
              
              logger.info('[CampaignsController] Workflow first step scheduled for campaign start time', { 
                leadId: lead.id,
                stepNumber: step.stepNumber,
                sendAt: sendAt.toISOString(),
              });
            } else {
              // Send immediately (campaign already started or starting now)
              await emailQueueService.addEmail({
                leadId: lead.id,
                campaignId: campaignId,
                to: lead.email,
                subject,
                bodyText,
                bodyHtml: undefined,
                followUpStage: 'initial',
                metadata: {
                  companyName: lead.companyName,
                  industry: lead.industry,
                  workflowStepNumber: step.stepNumber,
                  workflowStepId: step.id,
                },
              });
              
              logger.info('[CampaignsController] Workflow step queued immediately', { 
                leadId: lead.id,
                stepNumber: step.stepNumber,
              });
            }
          }

          totalEmailsQueued++;

        } catch (error: any) {
          logger.error('[CampaignsController] Error queuing workflow step', {
            leadId: lead.id,
            stepNumber: step.stepNumber,
            error: error.message,
          });
        }
      }

      // Small delay between leads
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update campaign last run time
    // Note: emailsSent counter will be updated by email queue service when emails are actually sent
    await db
      .update(campaigns)
      .set({
        lastRunAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId));

    logger.info('[CampaignsController] Workflow execution complete', {
      campaignId,
      totalEmailsScheduled: totalEmailsQueued,
      leadsProcessed: campaignLeadsList.length,
      stepsPerLead: steps.length,
    });
  }

  /**
   * Execute single email template for campaign leads
   */
  private async executeSingleTemplate(campaignId: string, campaign: any, campaignLeadsList: any[]) {
    logger.info('[CampaignsController] Executing single email template');

    // Get email template for the campaign
    const templateResults = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, campaign.emailTemplateId))
      .limit(1);

    if (!templateResults[0]) {
      logger.error('[CampaignsController] Email template not found for manual campaign');
      return;
    }

    const template = templateResults[0];
    let emailsQueued = 0;

    // Determine the base time for scheduling
    const baseTime = campaign.startDate ? new Date(campaign.startDate).getTime() : Date.now();
    const now = Date.now();
    const shouldSchedule = baseTime > now;

    logger.info('[CampaignsController] Using base time for single template', {
      baseTime: new Date(baseTime).toISOString(),
      shouldSchedule,
      campaignStartDate: campaign.startDate,
    });

    // Send emails to each lead
    for (const lead of campaignLeadsList) {
      try {
        if (!lead.email) {
          logger.warn('[CampaignsController] Lead has no email', { leadId: lead.id });
          continue;
        }

        // Check if email already exists for this lead (prevent duplicates)
        const existingEmails = await db
          .select()
          .from(emails)
          .where(
            and(
              eq(emails.campaignId, campaignId),
              eq(emails.leadId, lead.id),
              eq(emails.followUpStage, 'initial')
            )
          )
          .limit(1);

        if (existingEmails.length > 0) {
          logger.info('[CampaignsController] Email already queued for this lead, skipping duplicate', {
            leadId: lead.id,
            existingEmailId: existingEmails[0].id,
            existingEmailStatus: existingEmails[0].status,
          });
          continue;
        }

        // Replace template variables with lead data
        const subject = this.replaceTemplateVariables(template.subject, lead);
        const bodyText = this.replaceTemplateVariables(template.bodyText, lead);
        // Let email sender service handle HTML conversion
        const bodyHtml = template.bodyHtml 
          ? this.replaceTemplateVariables(template.bodyHtml, lead)
          : undefined;

        // Queue email for sending - schedule if campaign has future start date
        if (shouldSchedule) {
          await emailQueueService.scheduleEmail({
            leadId: lead.id,
            campaignId: campaignId,
            to: lead.email,
            subject,
            bodyText,
            bodyHtml,
            followUpStage: 'initial',
            metadata: {
              companyName: lead.companyName,
              industry: lead.industry,
            },
          }, new Date(baseTime));
          
          logger.info('[CampaignsController] Email scheduled for lead', { 
            leadId: lead.id, 
            email: lead.email,
            sendAt: new Date(baseTime).toISOString(),
          });
        } else {
          await emailQueueService.addEmail({
            leadId: lead.id,
            campaignId: campaignId,
            to: lead.email,
            subject,
            bodyText,
            bodyHtml,
            followUpStage: 'initial',
            metadata: {
              companyName: lead.companyName,
              industry: lead.industry,
            },
          });
          
          logger.info('[CampaignsController] Email queued immediately for lead', { 
            leadId: lead.id, 
            email: lead.email 
          });
        }

        emailsQueued++;

        // Small delay to avoid overwhelming the queue
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        logger.error('[CampaignsController] Error queuing email for lead', {
          leadId: lead.id,
          error: error.message,
        });
      }
    }

    // Update campaign last run time
    // Note: emailsSent counter will be updated by email sender service when emails are actually sent
    await db
      .update(campaigns)
      .set({
        lastRunAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId));

    logger.info('[CampaignsController] Single template execution complete', {
      campaignId,
      emailsScheduled: emailsQueued,
    });
  }

  /**
   * Replace template variables with lead data
   */
  private replaceTemplateVariables(text: string, lead: any): string {
    // BookNex signature HTML with logo and professional design
    const signature = `
<div style="margin: 0; padding: 0; margin-top: 20px;">
<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; border-collapse: collapse;">
  <tr>
    <td style="padding-right: 15px; vertical-align: top; border-right: 2px solid #2563eb;">
      <img src="https://booknexsolutions.com/wp-content/uploads/2025/08/Logo-Png-Clean-1.png" alt="BookNex Solutions" width="120" style="display: block; margin: 0; padding: 0;">
    </td>
    <td style="padding-left: 15px; vertical-align: top;">
      <strong style="font-size: 16px; color: #1e293b;">BookNex Solutions</strong><br>
      <span style="font-size: 12px; color: #64748b;">Smart Booking Management</span><br><br>
      <a href="https://www.booknexsolutions.com" style="color: #2563eb; text-decoration: none; font-size: 13px;">🌐 www.booknexsolutions.com</a><br>
      <a href="mailto:support@booknexsolutions.com" style="color: #2563eb; text-decoration: none; font-size: 13px;">✉️ support@booknexsolutions.com</a><br>
      <a href="https://www.linkedin.com/company/booknex-solutions/" style="color: #2563eb; text-decoration: none; font-size: 13px;">💼 Connect on LinkedIn</a>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="padding-top: 12px;">
      <span style="font-size: 11px; color: #94a3b8;">Streamline your bookings • Reduce no-shows • Grow your business</span>
    </td>
  </tr>
</table>
</div>
    `.trim();

    return text
      // Lead variables
      .replace(/\{\{companyName\}\}/g, lead.companyName || 'your company')
      .replace(/\{\{contactName\}\}/g, lead.contactName || 'there')
      .replace(/\{\{email\}\}/g, lead.email || '')
      .replace(/\{\{website\}\}/g, lead.website || '')
      .replace(/\{\{industry\}\}/g, lead.industry || '')
      .replace(/\{\{city\}\}/g, lead.city || '')
      .replace(/\{\{country\}\}/g, lead.country || '')
      .replace(/\{\{jobTitle\}\}/g, lead.jobTitle || '')
      .replace(/\{\{companySize\}\}/g, lead.companySize || '')
      // BookNex company info
      .replace(/\{\{BookNex\}\}/g, '<a href="https://www.booknexsolutions.com" style="color: #2563eb; text-decoration: none;">www.booknexsolutions.com</a>')
      .replace(/\{\{ourCompanyName\}\}/g, 'BookNex Solutions')
      .replace(/\{\{ourEmail\}\}/g, '<a href="mailto:support@booknexsolutions.com" style="color: #2563eb; text-decoration: none;">support@booknexsolutions.com</a>')
      // BookNex links (as clickable text)
      .replace(/\{\{featuresLink\}\}/g, '<a href="https://booknexsolutions.com/features/" style="color: #2563eb; text-decoration: underline;">View Our Features</a>')
      .replace(/\{\{howToStartLink\}\}/g, '<a href="https://booknexsolutions.com/how-to-start/" style="color: #2563eb; text-decoration: underline;">How To Get Started</a>')
      .replace(/\{\{pricingLink\}\}/g, '<a href="https://booknexsolutions.com/pricing/" style="color: #2563eb; text-decoration: underline;">View Pricing Plans</a>')
      .replace(/\{\{signUpLink\}\}/g, '<a href="https://booknexsolutions.com/sign-up/" style="color: #2563eb; text-decoration: underline;">Sign Up Now</a>')
      // Signature
      .replace(/\{\{signature\}\}/g, signature);
  }

  /**
   * Execute automated campaign: Generate new leads and send emails
   */
  private async executeAutomatedCampaign(campaignId: string, campaign: any) {
    try {
      // Create batch record first with unique timestamp
      const timestamp = new Date();
      const dateStr = timestamp.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const timeStr = timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const batchName = `${campaign.name} - ${dateStr} ${timeStr}`;
      const batch = await db.insert(leadBatches).values({
        name: batchName,
        uploadedBy: 'system',
        totalLeads: 0,
        successfulImports: 0,
        failedImports: 0,
        duplicatesSkipped: 0,
        importSettings: {
          campaignId: campaignId,
          industry: campaign.industry,
          countries: campaign.targetCountries,
          cities: campaign.targetCities,
          sources: this.getActiveSources(campaign),
        }
      }).returning();

      const batchId = batch[0].id;
      logger.info(`[CampaignsController] Created batch: ${batchId} - ${batchName}`);

      const rawLeads: any[] = [];
      const leadsPerSource = Math.ceil((campaign.leadsPerDay || 50) / this.countActiveSources(campaign));

      logger.info('[CampaignsController] Lead generation config', {
        batchId,
        leadsPerDay: campaign.leadsPerDay || 50,
        activeSources: this.countActiveSources(campaign),
        leadsPerSource,
      });

      // Add variation to search parameters to get different leads each run
      // Use day of year as a seed to rotate through countries and cities
      const now = new Date();
      const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);

      // 1. Generate leads from enabled sources
      if (campaign.usesApollo) {
        try {
          // Rotate through target countries to get variety
          const targetCountries = campaign.targetCountries && campaign.targetCountries.length > 0
            ? campaign.targetCountries
            : ['United States'];
          const countryIndex = dayOfYear % targetCountries.length;
          const selectedCountry = targetCountries[countryIndex];

          // Calculate page number for pagination (cycles through pages 1-10)
          // This ensures different results even when targeting the same location
          const pageNumber = (dayOfYear % 10) + 1;

          logger.info('[CampaignsController] Fetching leads from Apollo.io', {
            country: selectedCountry,
            dayOfYear,
            countryIndex,
            pageNumber,
          });

          const apolloLeads = await apolloService.searchLeads({
            industry: campaign.industry,
            country: selectedCountry,
            maxResults: Math.min(leadsPerSource, 100), // Apollo has daily limits
            page: pageNumber, // Add pagination for variety
          });
          rawLeads.push(...apolloLeads.map(lead => ({ ...lead, source: 'apollo' })));
          logger.info(`[CampaignsController] Fetched ${apolloLeads.length} leads from Apollo (page ${pageNumber})`);
        } catch (error: any) {
          logger.error('[CampaignsController] Error fetching from Apollo', { error: error.message });
        }
      }

      if (campaign.usesGooglePlaces) {
        try {
          // Rotate through target cities to get variety
          const targetCities = campaign.targetCities && campaign.targetCities.length > 0
            ? campaign.targetCities
            : campaign.targetCountries && campaign.targetCountries.length > 0
              ? campaign.targetCountries
              : ['United States'];
          const cityIndex = dayOfYear % targetCities.length;
          const selectedCity = targetCities[cityIndex];

          logger.info('[CampaignsController] Fetching leads from Google Places', {
            city: selectedCity,
            dayOfYear,
            cityIndex,
          });

          const placesLeads = await googlePlacesService.searchLeads({
            industry: campaign.industry,
            city: selectedCity,
            maxResults: leadsPerSource,
          });
          rawLeads.push(...placesLeads.map(lead => ({ ...lead, source: 'google_places' })));
          logger.info(`[CampaignsController] Fetched ${placesLeads.length} leads from Google Places`);
        } catch (error: any) {
          logger.error('[CampaignsController] Error fetching from Google Places', { error: error.message });
        }
      }

      if (rawLeads.length === 0) {
        logger.warn('[CampaignsController] No leads generated from any source');
        return;
      }

      // Assign batchId to all raw leads
      const leadsWithBatch = rawLeads.map(lead => ({ ...lead, batchId }));

      // 2. Enrich leads through pipeline
      logger.info(`[CampaignsController] Enriching ${leadsWithBatch.length} leads`);
      const enrichmentResults = await enrichmentPipelineService.enrichBatch(leadsWithBatch);
      
      // Extract successfully enriched lead IDs
      const successfulLeadIds = enrichmentResults
        .filter(result => result.success && result.leadId && !result.isDuplicate)
        .map(result => result.leadId!);
      
      logger.info(`[CampaignsController] ${successfulLeadIds.length} leads enriched successfully`);

      if (successfulLeadIds.length === 0) {
        logger.warn('[CampaignsController] No leads passed enrichment pipeline');
        return;
      }

      // 3. Fetch the enriched leads from database
      const qualifiedLeads = await db
        .select()
        .from(leads)
        .where(and(
          eq(leads.id, successfulLeadIds[0]),
          gte(leads.qualityScore, 40)
        ));
      
      // Fetch all qualified leads (workaround for 'in' operator)
      const allQualifiedLeads = [];
      for (const leadId of successfulLeadIds) {
        const leadResults = await db
          .select()
          .from(leads)
          .where(and(
            eq(leads.id, leadId),
            gte(leads.qualityScore, 40)
          ));
        if (leadResults.length > 0) {
          allQualifiedLeads.push(leadResults[0]);
        }
      }

      logger.info(`[CampaignsController] ${allQualifiedLeads.length} qualified leads (score >= 40)`);

      if (allQualifiedLeads.length === 0) {
        logger.warn('[CampaignsController] No qualified leads after filtering');
        await db
          .update(campaigns)
          .set({ leadsGenerated: (campaign.leadsGenerated || 0) + successfulLeadIds.length })
          .where(eq(campaigns.id, campaignId));
        return;
      }

      // For fully_automated campaigns: enroll leads AND send emails immediately
      if (campaign.campaignType === 'fully_automated') {
        logger.info('[CampaignsController] Fully automated campaign - enrolling leads and queueing emails', {
          campaignId,
          qualifiedLeads: allQualifiedLeads.length,
        });

        // Enroll all qualified leads in campaign_leads table
        const leadsToEnroll = allQualifiedLeads.map(lead => ({
          campaignId: campaignId,
          leadId: lead.id,
        }));

        await db.insert(campaignLeads).values(leadsToEnroll);
        
        logger.info('[CampaignsController] Enrolled leads in fully_automated campaign', {
          campaignId,
          enrolledCount: leadsToEnroll.length,
        });

        // Now execute the email sending logic (workflow or template)
        if (campaign.workflowId) {
          await this.executeWorkflowSequence(campaignId, campaign, allQualifiedLeads);
        } else if (campaign.emailTemplateId) {
          await this.executeSingleTemplate(campaignId, campaign, allQualifiedLeads);
        } else {
          logger.warn('[CampaignsController] Fully automated campaign has no workflow or template configured', {
            campaignId,
          });
        }
      } else {
        // For lead_generation campaigns, we ONLY generate and store leads
        // We do NOT automatically send emails or enroll them
        // Users must manually create an outreach campaign to send emails to these leads
        logger.info('[CampaignsController] Lead generation completed - leads stored for manual outreach', {
          campaignId,
          qualifiedLeads: allQualifiedLeads.length,
        });
      }

      // Update batch metrics
      const duplicateCount = enrichmentResults.filter(r => r.isDuplicate).length;
      const failedCount = enrichmentResults.filter(r => !r.success && !r.isDuplicate).length;

      await db
        .update(leadBatches)
        .set({
          totalLeads: rawLeads.length,
          successfulImports: successfulLeadIds.length,
          failedImports: failedCount,
          duplicatesSkipped: duplicateCount,
        })
        .where(eq(leadBatches.id, batchId));

      // Update campaign metrics and link to batch
      const updateData: any = {
        leadsGenerated: (campaign.leadsGenerated || 0) + allQualifiedLeads.length,
        lastRunAt: new Date(),
        batchId, // Link campaign to the batch used
      };

      // If this is a recurring campaign, calculate nextRunAt
      if (campaign.isRecurring && campaign.recurringInterval && campaign.endDate) {
        const now = new Date();
        const endDate = new Date(campaign.endDate);
        
        // Only set nextRunAt if we haven't reached the end date
        if (now < endDate) {
          let nextRun = new Date(now);
          
          switch (campaign.recurringInterval) {
            case 'daily':
              nextRun.setDate(nextRun.getDate() + 1);
              break;
            case 'every_2_days':
              nextRun.setDate(nextRun.getDate() + 2);
              break;
            case 'every_3_days':
              nextRun.setDate(nextRun.getDate() + 3);
              break;
            case 'weekly':
              nextRun.setDate(nextRun.getDate() + 7);
              break;
            default:
              nextRun.setDate(nextRun.getDate() + 1); // Default to daily
          }
          
          // Only set nextRunAt if it's before the end date
          if (nextRun <= endDate) {
            updateData.nextRunAt = nextRun;
            logger.info('[CampaignsController] Set next run for recurring campaign', {
              campaignId,
              nextRunAt: nextRun.toISOString(),
              interval: campaign.recurringInterval,
            });
          } else {
            // Campaign has completed all runs, set status to completed
            updateData.status = 'completed';
            updateData.nextRunAt = null;
            logger.info('[CampaignsController] Recurring campaign completed (reached end date)', {
              campaignId,
              endDate: endDate.toISOString(),
            });
          }
        } else {
          // Campaign has already passed end date
          updateData.status = 'completed';
          updateData.nextRunAt = null;
          logger.info('[CampaignsController] Recurring campaign completed (past end date)', {
            campaignId,
            endDate: endDate.toISOString(),
          });
        }
      }

      await db
        .update(campaigns)
        .set(updateData)
        .where(eq(campaigns.id, campaignId));

      logger.info('[CampaignsController] Lead generation campaign execution completed', {
        campaignId,
        batchId,
        batchName,
        leadsGenerated: allQualifiedLeads.length,
        duplicates: duplicateCount,
        failed: failedCount,
        note: 'Leads stored for manual outreach - no emails automatically sent',
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error executing automated campaign', {
        campaignId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Count active lead sources for a campaign
   */
  private countActiveSources(campaign: any): number {
    let count = 0;
    if (campaign.usesApollo) count++;
    if (campaign.usesGooglePlaces) count++;
    if (campaign.usesPeopleDL) count++;
    if (campaign.usesLinkedin) count++;
    return Math.max(count, 1); // At least 1 to avoid division by zero
  }

  /**
   * Get list of active lead sources for a campaign
   */
  private getActiveSources(campaign: any): string[] {
    const sources: string[] = [];
    if (campaign.usesApollo) sources.push('apollo');
    if (campaign.usesGooglePlaces) sources.push('google_places');
    if (campaign.usesPeopleDL) sources.push('peopledatalabs');
    if (campaign.usesLinkedin) sources.push('linkedin');
    return sources;
  }

  /**
   * POST /api/campaigns/:id/pause - Pause campaign
   */
  async pauseCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Update campaign status to paused
      const updated = await db
        .update(campaigns)
        .set({
          status: 'paused',
          pausedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, id))
        .returning();

      if (!updated[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found' },
        });
      }

      // Cancel all scheduled emails using the NEW service
      const cancelResult = await campaignEmailSchedulerService.cancelScheduledEmails(id);

      if (cancelResult.success) {
        logger.info('[CampaignsController] Campaign paused and emails cancelled', {
          campaignId: id,
          cancelledCount: cancelResult.cancelledCount,
        });
      } else {
        logger.error('[CampaignsController] Error cancelling scheduled emails', {
          campaignId: id,
          error: cancelResult.error,
        });
      }

      res.json({
        success: true,
        data: updated[0],
        message: `Campaign paused. ${cancelResult.cancelledCount} scheduled emails cancelled.`,
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error pausing campaign', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/campaigns/:id/resume - Resume paused campaign
   */
  async resumeCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Get campaign details
      const campaignResult = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, id))
        .limit(1);

      if (!campaignResult[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found' },
        });
      }

      const campaign = campaignResult[0];

      if (campaign.status !== 'paused') {
        return res.status(400).json({
          success: false,
          error: { message: 'Campaign is not paused' },
        });
      }

      // Update campaign status to running
      const updated = await db
        .update(campaigns)
        .set({
          status: 'running',
          resumedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, id))
        .returning();

      // Resume scheduled emails using the NEW service
      const resumeResult = await campaignEmailSchedulerService.resumeScheduledEmails(id);

      if (resumeResult.success) {
        logger.info('[CampaignsController] Campaign resumed and emails re-scheduled', {
          campaignId: id,
          resumedCount: resumeResult.resumedCount,
        });
      } else {
        logger.error('[CampaignsController] Error resuming scheduled emails', {
          campaignId: id,
          error: resumeResult.error,
        });
      }

      res.json({
        success: true,
        data: updated[0],
        message: `Campaign resumed. ${resumeResult.resumedCount} emails re-scheduled.`,
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error resuming campaign', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * GET /api/campaigns/:id/email-schedule - Get detailed email schedule with actual send times
   */
  async getEmailSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;

      logger.info('[CampaignsController] Getting email schedule', { campaignId: id });

      // Get campaign
      const campaignResult = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, id))
        .limit(1);

      if (!campaignResult[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found' },
        });
      }

      const campaign = campaignResult[0];

      // Get workflow if exists
      let workflow = null;
      let steps: any[] = [];
      let schedule: any[] = [];

      if (campaign.workflowId) {
        const { workflows, workflowSteps } = await import('@leadnex/database');
        
        const workflowResult = await db
          .select()
          .from(workflows)
          .where(eq(workflows.id, campaign.workflowId))
          .limit(1);

        if (workflowResult[0]) {
          workflow = workflowResult[0];
          
          steps = await db
            .select()
            .from(workflowSteps)
            .where(eq(workflowSteps.workflowId, campaign.workflowId))
            .orderBy(workflowSteps.stepNumber);

          // Calculate planned schedule using stable base date
          let baseDate = campaign.startDate 
            ? new Date(campaign.startDate) 
            : campaign.actualStartedAt 
              ? new Date(campaign.actualStartedAt) 
              : campaign.createdAt
                ? new Date(campaign.createdAt)
                : new Date();
          let cumulativeDelayDays = 0;

          for (const step of steps) {
            cumulativeDelayDays += step.daysAfterPrevious || 0;

            const sendDate = new Date(baseDate);
            sendDate.setDate(sendDate.getDate() + cumulativeDelayDays);

            schedule.push({
              stepNumber: step.stepNumber,
              subject: step.subject,
              delayDays: step.daysAfterPrevious,
              cumulativeDelayDays,
              plannedDateTime: sendDate.toISOString(),
            });
          }
        }
      }

      // Get actual emails sent for this campaign
      const sentEmails = await db
        .select({
          id: emails.id,
          leadId: emails.leadId,
          subject: emails.subject,
          status: emails.status,
          followUpStage: emails.followUpStage,
          sentAt: emails.sentAt,
          deliveredAt: emails.deliveredAt,
          openedAt: emails.openedAt,
          clickedAt: emails.clickedAt,
          openCount: emails.openCount,
          clickCount: emails.clickCount,
          createdAt: emails.createdAt,
          leadCompanyName: leads.companyName,
          leadEmail: leads.email,
          leadContactName: leads.contactName,
        })
        .from(emails)
        .leftJoin(leads, eq(emails.leadId, leads.id))
        .where(eq(emails.campaignId, id))
        .orderBy(desc(emails.createdAt));

      // Group emails by step/stage
      const emailsByStep: { [key: string]: any[] } = {};
      sentEmails.forEach((email) => {
        const stage = email.followUpStage || 'initial';
        if (!emailsByStep[stage]) {
          emailsByStep[stage] = [];
        }
        emailsByStep[stage].push({
          id: email.id,
          leadId: email.leadId,
          leadCompanyName: email.leadCompanyName,
          leadEmail: email.leadEmail,
          leadContactName: email.leadContactName,
          subject: email.subject,
          status: email.status,
          sentAt: email.sentAt,
          deliveredAt: email.deliveredAt,
          openedAt: email.openedAt,
          clickedAt: email.clickedAt,
          openCount: email.openCount,
          clickCount: email.clickCount,
          createdAt: email.createdAt,
        });
      });

      // Calculate statistics
      const totalQueued = sentEmails.filter(e => e.status === 'queued').length;
      const totalSent = sentEmails.filter(e => e.status === 'sent' || e.status === 'delivered').length;
      const totalDelivered = sentEmails.filter(e => e.status === 'delivered').length;
      const totalOpened = sentEmails.filter(e => e.openedAt !== null).length;
      const totalClicked = sentEmails.filter(e => e.clickedAt !== null).length;
      const totalFailed = sentEmails.filter(e => e.status === 'failed' || e.status === 'bounced').length;

      res.json({
        success: true,
        data: {
          campaign: {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            createdAt: campaign.createdAt,
            startDate: campaign.startDate,
            updatedAt: campaign.updatedAt,
          },
          workflow: workflow ? {
            id: workflow.id,
            name: workflow.name,
            totalSteps: steps.length,
          } : null,
          schedule,
          emails: sentEmails,
          emailsByStep,
          statistics: {
            total: sentEmails.length,
            queued: totalQueued,
            sent: totalSent,
            delivered: totalDelivered,
            opened: totalOpened,
            clicked: totalClicked,
            failed: totalFailed,
            openRate: totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(2) : '0',
            clickRate: totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(2) : '0',
          },
        },
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error getting email schedule', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * DELETE /api/campaigns/:id - Delete campaign
   */
  async deleteCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Delete campaign (emails will cascade or be handled by FK constraints)
      await db.delete(campaigns).where(eq(campaigns.id, id));

      res.json({
        success: true,
        message: 'Campaign deleted successfully',
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error deleting campaign', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }
}

export const campaignsController = new CampaignsController();
