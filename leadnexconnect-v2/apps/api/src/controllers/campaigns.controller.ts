import { Request, Response } from 'express';
import { db } from '@leadnex/database';
import { campaigns, leads, emails, emailTemplates, campaignLeads } from '@leadnex/database';
import { eq, desc, and, gte } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { apolloService } from '../services/lead-generation/apollo.service';
import { googlePlacesService } from '../services/lead-generation/google-places.service';
import { enrichmentPipelineService } from '../services/crm/enrichment-pipeline.service';
import { emailGeneratorService } from '../services/outreach/email-generator.service';
import { emailQueueService } from '../services/outreach/email-queue.service';

export class CampaignsController {
  /**
   * GET /api/campaigns - Get all campaigns
   */
  async getCampaigns(req: Request, res: Response) {
    try {
      logger.info('[CampaignsController] Getting campaigns');

      const allCampaigns = await db
        .select()
        .from(campaigns)
        .orderBy(desc(campaigns.createdAt));

      res.json({
        success: true,
        data: allCampaigns,
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

      // Get campaign leads via emails table
      const campaignEmails = await db
        .select()
        .from(leads)
        .innerJoin(emails, eq(emails.leadId, leads.id))
        .where(eq(emails.campaignId, id));

      res.json({
        success: true,
        data: {
          ...campaign[0],
          leads: campaignEmails.map(e => e.leads),
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
        usesLinkedin,
        usesApollo,
        usesPeopleDL,
        usesGooglePlaces,
        usesWebScraping,
        emailTemplateId,
        emailSubject,
        emailBody,
        followUpEnabled,
        followUp1DelayDays,
        followUp2DelayDays,
        leadIds,
        scheduleType,
        scheduleTime,
        scheduledAt,
        status,
      } = req.body;

      logger.info('[CampaignsController] Creating campaign', { 
        name,
        campaignType: campaignType || 'automated',
        usesApollo, 
        usesGooglePlaces,
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
        usesLinkedin: usesLinkedin || false,
        usesApollo: usesApollo || false,
        usesPeopleDL: usesPeopleDL || false,
        usesGooglePlaces: usesGooglePlaces || false,
        usesWebScraping: usesWebScraping || false,
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

      // Note: Lead-campaign association can be tracked via campaignId in emails table
      // if (leadIds && leadIds.length > 0) {
      //   // Update leads with campaign reference if needed
      // }

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

      // Update campaign status to active
      await db
        .update(campaigns)
        .set({ status: 'active', startDate: new Date(), lastRunAt: new Date() })
        .where(eq(campaigns.id, id));

      logger.info('[CampaignsController] Campaign started', { id, name: campaign.name });

      // Start lead generation and outreach in background
      this.executeCampaign(id, campaign).catch(error => {
        logger.error('[CampaignsController] Error executing campaign', {
          campaignId: id,
          error: error.message,
        });
      });

      res.json({
        success: true,
        data: {
          ...campaign,
          status: 'active',
          startDate: new Date(),
        },
        message: 'Campaign started successfully. Lead generation and outreach running in background.',
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

      // Check if this is a manual campaign with pre-selected leads
      if (campaign.campaignType === 'manual') {
        await this.executeManualCampaign(campaignId, campaign);
        return;
      }

      // Otherwise, execute automated campaign (generate new leads)
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

      // Send emails to each lead
      for (const lead of campaignLeadsList) {
        try {
          if (!lead.email) {
            logger.warn('[CampaignsController] Lead has no email', { leadId: lead.id });
            continue;
          }

          // Replace template variables with lead data
          const subject = this.replaceTemplateVariables(template.subject, lead);
          const bodyText = this.replaceTemplateVariables(template.bodyText, lead);
          const bodyHtml = template.bodyHtml 
            ? this.replaceTemplateVariables(template.bodyHtml, lead)
            : bodyText;

          // Queue email for sending
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

          emailsQueued++;
          logger.info('[CampaignsController] Email queued for lead', { 
            leadId: lead.id, 
            email: lead.email 
          });

          // Small delay to avoid overwhelming the queue
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error: any) {
          logger.error('[CampaignsController] Error queuing email for lead', {
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
          lastRunAt: new Date(),
        })
        .where(eq(campaigns.id, campaignId));

      logger.info('[CampaignsController] Manual campaign execution completed', {
        campaignId,
        emailsQueued,
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
   * Replace template variables with lead data
   */
  private replaceTemplateVariables(text: string, lead: any): string {
    return text
      .replace(/\{\{companyName\}\}/g, lead.companyName || 'your company')
      .replace(/\{\{contactName\}\}/g, lead.contactName || 'there')
      .replace(/\{\{website\}\}/g, lead.website || '')
      .replace(/\{\{industry\}\}/g, lead.industry || '')
      .replace(/\{\{city\}\}/g, lead.city || '')
      .replace(/\{\{country\}\}/g, lead.country || '');
  }

  /**
   * Execute automated campaign: Generate new leads and send emails
   */
  private async executeAutomatedCampaign(campaignId: string, campaign: any) {
    try {
      const rawLeads: any[] = [];
      const leadsPerSource = Math.ceil((campaign.leadsPerDay || 50) / this.countActiveSources(campaign));

      logger.info('[CampaignsController] Lead generation config', {
        leadsPerDay: campaign.leadsPerDay || 50,
        activeSources: this.countActiveSources(campaign),
        leadsPerSource,
      });

      // 1. Generate leads from enabled sources
      if (campaign.usesApollo) {
        try {
          logger.info('[CampaignsController] Fetching leads from Apollo.io');
          const apolloLeads = await apolloService.searchLeads({
            industry: campaign.industry,
            country: campaign.targetCountries?.[0] || 'United States',
            maxResults: Math.min(leadsPerSource, 100), // Apollo has daily limits
          });
          rawLeads.push(...apolloLeads.map(lead => ({ ...lead, source: 'apollo' })));
          logger.info(`[CampaignsController] Fetched ${apolloLeads.length} leads from Apollo`);
        } catch (error: any) {
          logger.error('[CampaignsController] Error fetching from Apollo', { error: error.message });
        }
      }

      if (campaign.usesGooglePlaces) {
        try {
          logger.info('[CampaignsController] Fetching leads from Google Places');
          const placesLeads = await googlePlacesService.searchLeads({
            industry: campaign.industry,
            city: campaign.targetCities?.[0] || campaign.targetCountries?.[0] || 'United States',
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

      // 2. Enrich leads through pipeline
      logger.info(`[CampaignsController] Enriching ${rawLeads.length} leads`);
      const enrichmentResults = await enrichmentPipelineService.enrichBatch(rawLeads);
      
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

      // 4. Generate and queue emails for qualified leads
      let emailsQueued = 0;
      
      for (const lead of allQualifiedLeads) {
        try {
          // Skip if no email
          if (!lead.email) {
            logger.warn('[CampaignsController] Lead has no email', { leadId: lead.id });
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
            campaignId: campaignId,
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

      // 5. Update campaign metrics
      await db
        .update(campaigns)
        .set({
          leadsGenerated: (campaign.leadsGenerated || 0) + allQualifiedLeads.length,
          emailsSent: (campaign.emailsSent || 0) + emailsQueued,
          lastRunAt: new Date(),
        })
        .where(eq(campaigns.id, campaignId));

      logger.info('[CampaignsController] Campaign execution completed', {
        campaignId,
        leadsGenerated: allQualifiedLeads.length,
        emailsQueued,
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
   * POST /api/campaigns/:id/pause - Pause campaign
   */
  async pauseCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const updated = await db
        .update(campaigns)
        .set({ status: 'paused' })
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
