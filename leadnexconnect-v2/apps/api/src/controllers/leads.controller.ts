import { Request, Response } from 'express';
import { db } from '@leadnex/database';
import { leads, leadBatches, emails, campaigns } from '@leadnex/database';
import { eq, and, gte, lte, ilike, desc } from 'drizzle-orm';
import { apolloService } from '../services/lead-generation/apollo.service';
import { googlePlacesService } from '../services/lead-generation/google-places.service';
import { hunterService } from '../services/lead-generation/hunter.service';
import { linkedInImportService } from '../services/lead-generation/linkedin-import.service';
import { leadScoringService } from '../services/crm/lead-scoring.service';
import { leadScoringV2Service } from '../services/crm/lead-scoring-v2.service';
import { websiteAnalysisService } from '../services/analysis/website-analysis.service';
import { apiPerformanceService } from '../services/tracking/api-performance.service';
import { enrichmentPipelineService } from '../services/crm/enrichment-pipeline.service';
import { logger } from '../utils/logger';

export class LeadsController {
  /**
   * GET /api/leads - Get all leads with filters and pagination
   */
  async getLeads(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 50,
        industry,
        country,
        status,
        source,
        sourceType,
        minScore,
        search,
        batchId,
      } = req.query;

      logger.info('[LeadsController] Getting leads', { query: req.query });

      let query = db.select().from(leads);

      // Apply filters
      const filters = [];
      if (industry) filters.push(eq(leads.industry, industry as string));
      if (country) filters.push(eq(leads.country, country as string));
      if (status) filters.push(eq(leads.status, status as any));
      if (source) filters.push(eq(leads.source, source as string));
      if (sourceType) filters.push(eq(leads.sourceType, sourceType as string));
      if (minScore) filters.push(gte(leads.qualityScore, parseInt(minScore as string)));
      if (batchId) filters.push(eq(leads.batchId, batchId as string));
      
      // Search filter - search in company name, email, contact name
      if (search) {
        const searchTerm = `%${search}%`;
        filters.push(
          // Use OR logic for multiple fields
          ilike(leads.companyName, searchTerm)
        );
        // Note: Drizzle's OR operator would be more complex here,
        // so we're using a simple ilike on companyName for now
        // In production, consider using raw SQL or a more sophisticated search
      }

      if (filters.length > 0) {
        query = query.where(and(...filters)) as any;
      }

      // Pagination
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      query = query.limit(parseInt(limit as string)).offset(offset) as any;
      query = query.orderBy(desc(leads.createdAt)) as any;

      const results = await query;

      // Get total count
      const total = await db.select().from(leads);

      res.json({
        success: true,
        data: results,
        meta: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: total.length,
        },
      });
    } catch (error: any) {
      logger.error('[LeadsController] Error getting leads', { error: error.message });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/leads/generate - Generate new leads
   */
  async generateLeads(req: Request, res: Response) {
    try {
      const { batchName, industry, country, city, maxResults = 50, sources } = req.body;

      logger.info('[LeadsController] Generating leads', { body: req.body });

      // Create lead batch
      const batch = await db
        .insert(leadBatches)
        .values({
          name: batchName || `${industry} - ${new Date().toLocaleDateString()}`,
          uploadedBy: 'system',
          totalLeads: 0,
          successfulImports: 0,
          failedImports: 0,
          duplicatesSkipped: 0,
          importSettings: {
            sources,
            industry,
            country,
            city,
            maxResults,
          },
        })
        .returning();

      const batchId = batch[0].id;

      const allLeads: any[] = [];

      // Generate from each source
      if (sources.includes('apollo')) {
        const apolloLeads = await apolloService.searchLeads({
          industry,
          country,
          city,
          maxResults: Math.min(maxResults, 10),
        });
        allLeads.push(...apolloLeads);
      }

      if (sources.includes('google_places')) {
        const placesLeads = await googlePlacesService.searchLeads({
          industry,
          country,
          city,
          maxResults: Math.min(maxResults, 50),
        });
        allLeads.push(...placesLeads);
      }

      logger.info('[LeadsController] Processing leads with enhancements', { 
        total: allLeads.length 
      });

      // Deduplicate
      const deduped = await this.deduplicateLeads(allLeads);

      // Analyze websites for enhanced qualification
      for (const lead of deduped) {
        if (lead.website) {
          try {
            const analysis = await websiteAnalysisService.analyzeWebsite(lead.website);
            if (analysis) {
              lead.hasBookingKeywords = analysis.hasBookingKeywords;
              lead.bookingKeywordScore = analysis.bookingKeywordScore;
              lead.currentBookingTool = analysis.currentBookingTool;
              lead.hasAppointmentForm = analysis.hasAppointmentForm;
              lead.hasOnlineBooking = analysis.hasBookingKeywords || !!analysis.currentBookingTool;
              lead.hasMultiLocation = analysis.multiLocation;
              lead.servicesCount = analysis.servicesCount;
            }
          } catch (error: any) {
            logger.warn('[LeadsController] Website analysis failed', {
              website: lead.website,
              error: error.message,
            });
          }
        }
      }

      // Calculate enhanced scores using V2 scoring and add batch ID
      const scored = deduped.map(lead => {
        const qualityScore = leadScoringV2Service.calculateScore(lead);
        const digitalMaturityScore = leadScoringV2Service.calculateDigitalMaturity(lead);
        const bookingPotential = leadScoringV2Service.calculateBookingPotential(lead);
        
        return {
          ...lead,
          batchId, // Associate with batch
          qualityScore,
          digitalMaturityScore,
          bookingPotential,
        };
      });

      // Enrich leads through enrichment pipeline (includes email finder)
      const saved: any[] = [];
      for (const lead of scored) {
        try {
          // Use enrichment pipeline to find missing contact info
          const enrichmentResult = await enrichmentPipelineService.enrichLead(lead);
          
          if (enrichmentResult.success && enrichmentResult.leadId) {
            // Get the enriched lead from database
            const enrichedLead = await db
              .select()
              .from(leads)
              .where(eq(leads.id, enrichmentResult.leadId))
              .limit(1);
            
            if (enrichedLead[0]) {
              saved.push(enrichedLead[0]);
            }
          } else if (!enrichmentResult.isDuplicate) {
            // Fallback: save without enrichment if pipeline fails
            const result = await db.insert(leads).values(lead).returning();
            saved.push(result[0]);
          }
        } catch (error: any) {
          logger.warn('[LeadsController] Enrichment failed, saving lead without enrichment', {
            company: lead.companyName,
            error: error.message,
          });
          // Fallback: save without enrichment
          try {
            const result = await db.insert(leads).values(lead).returning();
            saved.push(result[0]);
          } catch (saveError: any) {
            logger.error('[LeadsController] Failed to save lead', {
              company: lead.companyName,
              error: saveError.message,
            });
          }
        }
      }

      // Track API performance
      const sourceMetrics: Record<string, { leads: number; calls: number }> = {};
      
      sources.forEach((source: string) => {
        const sourceLeads = saved.filter((l: any) => l.source === source);
        sourceMetrics[source] = {
          leads: sourceLeads.length,
          calls: source === 'apollo' ? Math.min(maxResults, 10) : 
                 source === 'google_places' ? Math.min(maxResults, 50) : 0,
        };
      });

      // Log usage for each source
      for (const [source, metrics] of Object.entries(sourceMetrics)) {
        if (metrics.leads > 0) {
          await apiPerformanceService.logAPIUsage({
            apiSource: source,
            leadsGenerated: metrics.leads,
            apiCallsUsed: metrics.calls,
          });
        }
      }

      // Classify by tier
      const hot = saved.filter((l: any) => l.qualityScore >= 80);
      const warm = saved.filter((l: any) => l.qualityScore >= 60 && l.qualityScore < 80);
      const cold = saved.filter((l: any) => l.qualityScore < 60);

      // Update batch with final counts
      await db
        .update(leadBatches)
        .set({
          totalLeads: allLeads.length,
          successfulImports: saved.length,
          duplicatesSkipped: allLeads.length - saved.length,
          completedAt: new Date(),
        })
        .where(eq(leadBatches.id, batchId));

      logger.info('[LeadsController] Lead generation complete', {
        batchId,
        batchName: batch[0].name,
        total: saved.length,
        hot: hot.length,
        warm: warm.length,
        cold: cold.length,
      });

      res.json({
        success: true,
        data: {
          batchId,
          batchName: batch[0].name,
          leads: saved,
          summary: {
            total: allLeads.length,
            newLeads: saved.length,
            duplicatesSkipped: allLeads.length - saved.length,
            byTier: {
              hot: hot.length,
              warm: warm.length,
              cold: cold.length,
            },
            bySource: this.countBySource(saved),
          },
        },
      });
    } catch (error: any) {
      logger.error('[LeadsController] Error generating leads', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * GET /api/leads/batches - Get all lead batches
   */
  async getBatches(req: Request, res: Response) {
    try {
      const { sourceType } = req.query;

      logger.info('[LeadsController] Getting lead batches');

      // Get all batches
      let query = db
        .select()
        .from(leadBatches)
        .orderBy(desc(leadBatches.createdAt));

      const batches = await query;

      // For each batch, get lead count and sample leads
      const batchesWithLeads = await Promise.all(
        batches.map(async (batch) => {
          const batchLeads = await db
            .select()
            .from(leads)
            .where(eq(leads.batchId, batch.id))
            .limit(5); // Get first 5 leads as sample

          const totalLeads = await db
            .select()
            .from(leads)
            .where(eq(leads.batchId, batch.id));

          return {
            ...batch,
            leadCount: totalLeads.length,
            sampleLeads: batchLeads,
          };
        })
      );

      res.json({
        success: true,
        data: batchesWithLeads,
      });
    } catch (error: any) {
      logger.error('[LeadsController] Error getting batches', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * GET /api/leads/batches/:id/analytics - Get batch performance analytics
   */
  async getBatchAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;

      logger.info('[LeadsController] Getting batch analytics', { batchId: id });

      // Get batch details
      const batch = await db
        .select()
        .from(leadBatches)
        .where(eq(leadBatches.id, id))
        .limit(1);

      if (batch.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Batch not found' },
        });
      }

      const batchData = batch[0];

      // Get all leads from this batch
      const batchLeads = await db
        .select()
        .from(leads)
        .where(eq(leads.batchId, id));

      // Get all emails sent to leads in this batch
      const leadIds = batchLeads.map(l => l.id);
      let allEmails: any[] = [];
      
      if (leadIds.length > 0) {
        // Query emails for each lead (workaround for IN operator)
        for (const leadId of leadIds) {
          const leadEmails = await db
            .select()
            .from(emails)
            .where(eq(emails.leadId, leadId));
          allEmails.push(...leadEmails);
        }
      }

      // Calculate metrics
      const totalLeads = batchLeads.length;
      const emailsSent = allEmails.filter(e => e.status === 'sent' || e.status === 'delivered' || e.status === 'opened').length;
      const emailsOpened = allEmails.filter(e => e.openedAt !== null).length;
      const emailsClicked = allEmails.filter(e => e.clickedAt !== null).length;
      const emailsBounced = allEmails.filter(e => e.status === 'bounced').length;
      
      // Calculate conversion rates
      const openRate = emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : 0;
      const clickRate = emailsSent > 0 ? (emailsClicked / emailsSent) * 100 : 0;
      const bounceRate = emailsSent > 0 ? (emailsBounced / emailsSent) * 100 : 0;
      const clickToOpenRate = emailsOpened > 0 ? (emailsClicked / emailsOpened) * 100 : 0;

      // Get campaigns using this batch
      const batchCampaigns = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.batchId, id));

      // Calculate lead quality breakdown
      const hotLeads = batchLeads.filter(l => (l.qualityScore || 0) >= 80).length;
      const warmLeads = batchLeads.filter(l => {
        const score = l.qualityScore || 0;
        return score >= 60 && score < 80;
      }).length;
      const coldLeads = batchLeads.filter(l => (l.qualityScore || 0) < 60).length;

      // Lead status breakdown
      const statusBreakdown: any = {};
      batchLeads.forEach(lead => {
        const status = lead.status || 'new';
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      });

      res.json({
        success: true,
        data: {
          batch: {
            id: batchData.id,
            name: batchData.name,
            createdAt: batchData.createdAt,
            uploadedBy: batchData.uploadedBy,
            importSettings: batchData.importSettings,
          },
          metrics: {
            totalLeads,
            successfulImports: batchData.successfulImports,
            failedImports: batchData.failedImports,
            duplicatesSkipped: batchData.duplicatesSkipped,
            emailsSent,
            emailsOpened,
            emailsClicked,
            emailsBounced,
            openRate: Math.round(openRate * 100) / 100,
            clickRate: Math.round(clickRate * 100) / 100,
            bounceRate: Math.round(bounceRate * 100) / 100,
            clickToOpenRate: Math.round(clickToOpenRate * 100) / 100,
          },
          leadQuality: {
            hot: hotLeads,
            warm: warmLeads,
            cold: coldLeads,
          },
          statusBreakdown,
          campaigns: batchCampaigns.map(c => ({
            id: c.id,
            name: c.name,
            status: c.status,
            emailsSent: c.emailsSent,
            emailsOpened: c.emailsOpened,
            emailsClicked: c.emailsClicked,
          })),
        },
      });
    } catch (error: any) {
      logger.error('[LeadsController] Error getting batch analytics', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/leads/import - Import LinkedIn CSV
   */
  async importLinkedIn(req: Request, res: Response) {
    try {
      const { csvData, industry, enrichEmail = true, batchName } = req.body;

      logger.info('[LeadsController] Importing LinkedIn CSV');

      const leadsData = await linkedInImportService.importCSV(csvData, industry);

      // Enrich emails if requested
      if (enrichEmail) {
        for (const lead of leadsData) {
          if (!lead.email && lead.website) {
            try {
              const domain = new URL(lead.website).hostname;
              const emailResult = await hunterService.findEmailByDomain(domain, 1);
              if (emailResult.emails.length > 0) {
                lead.email = emailResult.emails[0].value;
              }
            } catch (err) {
              logger.warn('[LeadsController] Failed to enrich email', { companyName: lead.companyName });
            }
          }
        }
      }

      // Create a batch for imported leads
      const currentDate = new Date().toISOString().split('T')[0];
      const finalBatchName = batchName || `CSV Import - ${currentDate}`;
      
      const [batch] = await db.insert(leadBatches).values({
        name: finalBatchName,
        description: `Imported ${leadsData.length} leads from CSV`,
        source: 'csv_import',
        totalLeads: leadsData.length,
        successfulImports: 0,
        failedImports: 0,
        duplicatesSkipped: 0,
        importSettings: {
          industry: industry || 'Other',
          enrichEmail,
        },
      }).returning();

      logger.info('[LeadsController] Created batch for CSV import', { batchId: batch.id });

      // Save leads to database with batch ID
      const saved = [];
      const duplicates = [];

      for (const leadData of leadsData) {
        try {
          // Check for duplicates (by email or company name)
          const existingLead = await db
            .select()
            .from(leads)
            .where(
              leadData.email 
                ? eq(leads.email, leadData.email)
                : eq(leads.companyName, leadData.companyName)
            )
            .limit(1);

          if (existingLead.length > 0) {
            duplicates.push(leadData);
            continue;
          }

          // Calculate quality score
          let qualityScore = 50;
          if (leadData.email) qualityScore += 30;
          if (leadData.phone) qualityScore += 10;
          if (leadData.website) qualityScore += 10;

          const [savedLead] = await db.insert(leads).values({
            companyName: leadData.companyName,
            contactName: leadData.contactName,
            email: leadData.email,
            phone: leadData.phone,
            website: leadData.website,
            industry: leadData.industry || industry || 'Other',
            city: leadData.city,
            country: leadData.country,
            jobTitle: leadData.jobTitle,
            companySize: leadData.companySize,
            source: 'csv_import',
            sourceType: 'manual_import',
            status: 'new',
            qualityScore,
            tier: qualityScore >= 80 ? 'hot' : qualityScore >= 60 ? 'warm' : 'cold',
            batchId: batch.id,
          }).returning();

          saved.push(savedLead);
        } catch (err: any) {
          logger.error('[LeadsController] Failed to save imported lead', {
            error: err.message,
            companyName: leadData.companyName,
          });
        }
      }

      // Update batch with final counts
      await db
        .update(leadBatches)
        .set({
          successfulImports: saved.length,
          duplicatesSkipped: duplicates.length,
          failedImports: leadsData.length - saved.length - duplicates.length,
          completedAt: new Date(),
        })
        .where(eq(leadBatches.id, batch.id));

      logger.info('[LeadsController] CSV import completed', {
        batchId: batch.id,
        total: leadsData.length,
        saved: saved.length,
        duplicates: duplicates.length,
      });

      res.json({
        success: true,
        data: { 
          leads: saved,
          batch: {
            id: batch.id,
            name: batch.name,
            totalLeads: leadsData.length,
            imported: saved.length,
            duplicates: duplicates.length,
          },
          count: saved.length,
          imported: saved.length,
        },
      });
    } catch (error: any) {
      logger.error('[LeadsController] Error importing LinkedIn', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * GET /api/leads/:id - Get single lead
   */
  async getLead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const lead = await db.select().from(leads).where(eq(leads.id, id)).limit(1);

      if (!lead[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Lead not found' },
        });
      }

      res.json({
        success: true,
        data: lead[0],
      });
    } catch (error: any) {
      logger.error('[LeadsController] Error getting lead', { error: error.message });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/leads - Create a new lead manually
   */
  async createLead(req: Request, res: Response) {
    try {
      const {
        companyName,
        contactName,
        email,
        phone,
        website,
        industry,
        city,
        country,
        jobTitle,
        companySize,
        source,
        status,
        qualityScore,
      } = req.body;

      logger.info('[LeadsController] Creating lead', { companyName, email });

      // Validate required fields
      if (!companyName) {
        return res.status(400).json({
          success: false,
          error: { message: 'Company name is required' },
        });
      }

      if (!email) {
        return res.status(400).json({
          success: false,
          error: { message: 'Email is required' },
        });
      }

      // Check if lead already exists by email
      const existingLead = await db
        .select()
        .from(leads)
        .where(eq(leads.email, email))
        .limit(1);

      if (existingLead.length > 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'A lead with this email already exists' },
        });
      }

      // Create the lead
      const newLead = await db
        .insert(leads)
        .values({
          companyName,
          contactName: contactName || null,
          email,
          phone: phone || null,
          website: website || null,
          industry: industry || 'Other',
          city: city || null,
          country: country || 'United States',
          jobTitle: jobTitle || null,
          companySize: companySize || null,
          source: source || 'manual_entry',
          sourceType: 'manual_import',
          status: status || 'new',
          qualityScore: qualityScore || 50,
          createdAt: new Date(),
        })
        .returning();

      logger.info('[LeadsController] Lead created successfully', { id: newLead[0].id });

      res.status(201).json({
        success: true,
        data: newLead[0],
        message: 'Lead created successfully',
      });
    } catch (error: any) {
      logger.error('[LeadsController] Error creating lead', { error: error.message });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * PUT /api/leads/:id - Update lead
   */
  async updateLead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const updated = await db
        .update(leads)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(leads.id, id))
        .returning();

      if (!updated[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Lead not found' },
        });
      }

      res.json({
        success: true,
        data: updated[0],
      });
    } catch (error: any) {
      logger.error('[LeadsController] Error updating lead', { error: error.message });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * DELETE /api/leads/:id - Delete lead
   */
  async deleteLead(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await db.delete(leads).where(eq(leads.id, id));

      res.json({
        success: true,
        message: 'Lead deleted successfully',
      });
    } catch (error: any) {
      logger.error('[LeadsController] Error deleting lead', { error: error.message });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  private async deduplicateLeads(leadsData: any[]): Promise<any[]> {
    const seen = new Set<string>();
    return leadsData.filter(lead => {
      const key = `${lead.email || lead.companyName}-${lead.industry}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private countBySource(leadsData: any[]): Record<string, number> {
    const counts: Record<string, number> = {};
    leadsData.forEach(lead => {
      counts[lead.source] = (counts[lead.source] || 0) + 1;
    });
    return counts;
  }

  /**
   * GET /api/leads/export - Export leads to CSV
   */
  async exportLeads(req: Request, res: Response) {
    try {
      const { status, industry, source, minScore, maxScore } = req.query;

      logger.info('[LeadsController] Exporting leads', { filters: req.query });

      // Build query
      let query = db.select().from(leads);

      // Apply filters
      const conditions: any[] = [];
      if (status && typeof status === 'string') {
        conditions.push(eq(leads.status, status as any));
      }
      if (industry) conditions.push(eq(leads.industry, industry as string));
      if (source) conditions.push(eq(leads.source, source as any));
      if (minScore) conditions.push(gte(leads.qualityScore, parseInt(minScore as string)));
      if (maxScore) conditions.push(lte(leads.qualityScore, parseInt(maxScore as string)));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const allLeads = await query;

      // Convert to CSV
      const csvRows: string[] = [];
      
      // CSV Header
      csvRows.push([
        'Company Name',
        'Contact Name',
        'Email',
        'Phone',
        'Job Title',
        'Industry',
        'City',
        'Country',
        'Website',
        'Quality Score',
        'Tier',
        'Status',
        'Source',
        'Created At'
      ].join(','));

      // CSV Data
      allLeads.forEach((lead: any) => {
        const tier = lead.qualityScore >= 80 ? 'HOT' : lead.qualityScore >= 60 ? 'WARM' : 'COLD';
        csvRows.push([
          `"${lead.companyName || ''}"`,
          `"${lead.contactName || ''}"`,
          `"${lead.email || ''}"`,
          `"${lead.phone || ''}"`,
          `"${lead.jobTitle || ''}"`,
          `"${lead.industry || ''}"`,
          `"${lead.city || ''}"`,
          `"${lead.country || ''}"`,
          `"${lead.website || ''}"`,
          lead.qualityScore || 0,
          tier,
          lead.status || '',
          lead.source || '',
          lead.createdAt ? new Date(lead.createdAt).toISOString() : ''
        ].join(','));
      });

      const csvContent = csvRows.join('\n');

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="leads-export-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);

      logger.info('[LeadsController] Exported leads', { count: allLeads.length });
    } catch (error: any) {
      logger.error('[LeadsController] Error exporting leads', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }
}

export const leadsController = new LeadsController();
