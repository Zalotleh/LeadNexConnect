import { Request, Response } from 'express';
import { db } from '@leadnex/database';
import { leads } from '@leadnex/database';
import { eq, and, gte, lte, ilike, desc } from 'drizzle-orm';
import { apolloService } from '../services/lead-generation/apollo.service';
import { googlePlacesService } from '../services/lead-generation/google-places.service';
import { hunterService } from '../services/lead-generation/hunter.service';
import { linkedInImportService } from '../services/lead-generation/linkedin-import.service';
import { leadScoringService } from '../services/crm/lead-scoring.service';
import { leadScoringV2Service } from '../services/crm/lead-scoring-v2.service';
import { websiteAnalysisService } from '../services/analysis/website-analysis.service';
import { apiPerformanceService } from '../services/tracking/api-performance.service';
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
        minScore,
      } = req.query;

      logger.info('[LeadsController] Getting leads', { query: req.query });

      let query = db.select().from(leads);

      // Apply filters
      const filters = [];
      if (industry) filters.push(eq(leads.industry, industry as string));
      if (country) filters.push(eq(leads.country, country as string));
      if (status) filters.push(eq(leads.status, status as any));
      if (source) filters.push(eq(leads.source, source as string));
      if (minScore) filters.push(gte(leads.qualityScore, parseInt(minScore as string)));

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
      const { industry, country, city, maxResults = 50, sources } = req.body;

      logger.info('[LeadsController] Generating leads', { body: req.body });

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

      // Calculate enhanced scores using V2 scoring
      const scored = deduped.map(lead => {
        const qualityScore = leadScoringV2Service.calculateScore(lead);
        const digitalMaturityScore = leadScoringV2Service.calculateDigitalMaturity(lead);
        const bookingPotential = leadScoringV2Service.calculateBookingPotential(lead);
        
        return {
          ...lead,
          qualityScore,
          digitalMaturityScore,
          bookingPotential,
        };
      });

      // Save to database
      const saved: any[] = [];
      for (const lead of scored) {
        const result = await db.insert(leads).values(lead).returning();
        saved.push(result[0]);
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

      logger.info('[LeadsController] Lead generation complete', {
        total: saved.length,
        hot: hot.length,
        warm: warm.length,
        cold: cold.length,
      });

      res.json({
        success: true,
        data: {
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
   * POST /api/leads/import - Import LinkedIn CSV
   */
  async importLinkedIn(req: Request, res: Response) {
    try {
      const { csvData, industry, enrichEmail = true } = req.body;

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

      res.json({
        success: true,
        data: { leads: leadsData, count: leadsData.length },
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
