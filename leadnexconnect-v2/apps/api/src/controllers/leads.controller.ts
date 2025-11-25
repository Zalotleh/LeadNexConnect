import { Request, Response } from 'express';
import { db } from '@leadnex/database';
import { leads } from '@leadnex/database';
import { eq, and, gte, lte, ilike, desc } from 'drizzle-orm';
import { apolloService } from '../services/lead-generation/apollo.service';
import { googlePlacesService } from '../services/lead-generation/google-places.service';
import { hunterService } from '../services/lead-generation/hunter.service';
import { linkedInImportService } from '../services/lead-generation/linkedin-import.service';
import { leadScoringService } from '../services/crm/lead-scoring.service';
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

      // Deduplicate and score leads
      const deduped = await this.deduplicateLeads(allLeads);
      const scored = deduped.map(lead => ({
        ...lead,
        qualityScore: leadScoringService.calculateScore(lead),
      }));

      // Save to database
      const saved = [];
      for (const lead of scored) {
        const result = await db.insert(leads).values(lead).returning();
        saved.push(result[0]);
      }

      res.json({
        success: true,
        data: {
          leads: saved,
          summary: {
            total: allLeads.length,
            newLeads: saved.length,
            duplicatesSkipped: allLeads.length - saved.length,
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
}

export const leadsController = new LeadsController();
