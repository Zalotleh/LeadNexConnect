import { Response } from 'express';
import { eq } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { apolloService } from '../services/lead-generation/apollo.service';
import { googlePlacesService } from '../services/lead-generation/google-places.service';
import { peopleDataLabsService } from '../services/lead-generation/peopledatalabs.service';
import { enrichmentPipelineService } from '../services/crm/enrichment-pipeline.service';
import { db, leadBatches } from '@leadnex/database';

export class ScrapingController {
  /** Create a lead batch record and return its id */
  private async _createBatch(
    userId: string,
    name: string,
    meta: Record<string, any>,
  ): Promise<string> {
    const [batch] = await db
      .insert(leadBatches)
      .values({
        userId,
        name,
        uploadedBy: 'system',
        totalLeads: 0,
        successfulImports: 0,
        failedImports: 0,
        duplicatesSkipped: 0,
        importSettings: meta,
      })
      .returning();
    return batch.id;
  }

  /** Update batch counts after enrichment completes */
  private async _finaliseBatch(
    batchId: string,
    total: number,
    saved: number,
  ): Promise<void> {
    await db
      .update(leadBatches)
      .set({
        totalLeads: total,
        successfulImports: saved,
        duplicatesSkipped: total - saved,
        completedAt: new Date(),
      })
      .where(eq(leadBatches.id, batchId));
  }

  /**
   * GET /api/scraping/status - Get scraping job status
   */
  async getStatus(req: AuthRequest, res: Response) {
    try {
      logger.info('[ScrapingController] Getting scraping status');

      res.json({
        success: true,
        data: {
          status: 'idle',
          message: 'Web scraping service is ready',
        },
      });
    } catch (error: any) {
      logger.error('[ScrapingController] Error getting status', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/scraping/start - Start scraping job
   */
  async startScraping(req: AuthRequest, res: Response) {
    try {
      const { source, industry, location } = req.body;

      logger.info('[ScrapingController] Starting scraping job', {
        source,
        industry,
        location,
      });

      res.json({
        success: true,
        message: 'Scraping job started',
        data: {
          jobId: `job-${Date.now()}`,
          source,
          industry,
          location,
        },
      });
    } catch (error: any) {
      logger.error('[ScrapingController] Error starting scraping', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/scraping/apollo - Generate leads from Apollo.io
   */
  async generateFromApollo(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { industry, country, city, maxResults = 50 } = req.body;

      logger.info('[ScrapingController] Generating leads from Apollo', {
        userId, industry, country, city, maxResults,
      });

      // Create batch so leads are trackable
      const batchId = await this._createBatch(
        userId,
        `Apollo – ${industry} – ${new Date().toLocaleDateString()}`,
        { source: 'apollo', industry, country, city, maxResults },
      );

      // Fetch leads from Apollo
      const apolloLeads = await apolloService.searchLeads({
        industry, country, city, maxResults,
      });

      logger.info(`[ScrapingController] Fetched ${apolloLeads.length} leads from Apollo`);

      // Stamp batchId + userId on every lead before enrichment
      const leadsWithBatch = apolloLeads.map(l => ({ ...l, batchId, userId }));

      // Enrich leads through pipeline (saves to DB)
      const enrichmentResults = await enrichmentPipelineService.enrichBatch(leadsWithBatch);
      
      const successful = enrichmentResults.filter(r => r.success).length;
      const duplicates = enrichmentResults.filter(r => r.isDuplicate).length;

      await this._finaliseBatch(batchId, apolloLeads.length, successful);

      logger.info(`[ScrapingController] Enrichment complete: ${successful} saved, ${duplicates} duplicates`, { batchId });

      res.json({
        success: true,
        message: `Generated ${successful} leads from Apollo (${duplicates} duplicates skipped)`,
        data: {
          batchId,
          total: apolloLeads.length,
          saved: successful,
          duplicates,
        },
      });
    } catch (error: any) {
      logger.error('[ScrapingController] Error generating from Apollo', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/scraping/google-places - Generate leads from Google Places
   */
  async generateFromGooglePlaces(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { industry, country, city, maxResults = 50 } = req.body;

      logger.info('[ScrapingController] Generating leads from Google Places', {
        userId, industry, country, city, maxResults,
      });

      // Create batch so leads are trackable
      const batchId = await this._createBatch(
        userId,
        `Google Places – ${industry} – ${new Date().toLocaleDateString()}`,
        { source: 'google_places', industry, country, city, maxResults },
      );

      // Best-effort loop: cycle through keyword variants until the target is met
      const totalVariants = googlePlacesService.getVariantCount(industry);
      const now = new Date();
      const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);

      const allPlacesLeads: any[] = [];

      for (let attempt = 0; attempt < totalVariants; attempt++) {
        const stillNeeded = maxResults - allPlacesLeads.length;
        if (stillNeeded <= 0) break;

        try {
          const placesLeads = await googlePlacesService.searchLeads({
            industry,
            country,
            city,
            maxResults: stillNeeded,
            queryVariantIndex: dayOfYear + attempt,
          });
          allPlacesLeads.push(...placesLeads);
          logger.info(`[ScrapingController] Google Places variant ${attempt + 1}/${totalVariants}: ${placesLeads.length} leads (total: ${allPlacesLeads.length}/${maxResults})`);
        } catch (variantError: any) {
          logger.warn(`[ScrapingController] Google Places variant ${attempt + 1} failed`, { error: variantError.message });
        }

        if (allPlacesLeads.length >= maxResults) break;
      }

      logger.info(`[ScrapingController] Fetched ${allPlacesLeads.length} leads from Google Places`);

      // Stamp batchId + userId on every lead before enrichment
      const leadsWithBatch = allPlacesLeads.map(l => ({ ...l, batchId, userId }));

      // Enrich leads through pipeline (saves to DB)
      const enrichmentResults = await enrichmentPipelineService.enrichBatch(leadsWithBatch);
      
      const successful = enrichmentResults.filter(r => r.success).length;
      const duplicates = enrichmentResults.filter(r => r.isDuplicate).length;

      await this._finaliseBatch(batchId, allPlacesLeads.length, successful);

      logger.info(`[ScrapingController] Enrichment complete: ${successful} saved, ${duplicates} duplicates`, { batchId });

      res.json({
        success: true,
        message: `Generated ${successful} leads from Google Places (${duplicates} duplicates skipped)`,
        data: {
          batchId,
          total: allPlacesLeads.length,
          saved: successful,
          duplicates,
        },
      });
    } catch (error: any) {
      logger.error('[ScrapingController] Error generating from Google Places', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/scraping/peopledatalabs - Enrich leads from People Data Labs
   * Note: PDL is used for enrichment, not lead generation
   */
  async generateFromPDL(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { emails = [] } = req.body;

      logger.info('[ScrapingController] Enriching leads with People Data Labs', {
        userId, count: emails.length,
      });

      if (!Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Please provide an array of email addresses to enrich.' },
        });
      }

      // Create batch so enriched leads are trackable
      const batchId = await this._createBatch(
        userId,
        `PDL Enrichment – ${new Date().toLocaleDateString()}`,
        { source: 'peopledatalabs', emailCount: emails.length },
      );

      // Enrich each email with PDL
      const leadsToEnrich: any[] = [];
      for (const email of emails) {
        const enrichedData = await peopleDataLabsService.enrichContact({ email });
        if (enrichedData.found) {
          leadsToEnrich.push({
            email,
            contactName: enrichedData.companyName || '',
            contactTitle: enrichedData.jobTitle || '',
            companyName: enrichedData.companyName || '',
            industry: enrichedData.companyIndustry || '',
            phone: enrichedData.phone || '',
            linkedinUrl: enrichedData.linkedin || '',
            source: 'peopledatalabs' as const,
            status: 'new' as const,
            batchId,
            userId,
          });
        }
      }

      logger.info(`[ScrapingController] Found ${leadsToEnrich.length} enrichable leads from PDL`);

      // Run through enrichment pipeline (saves to DB)
      const enrichmentResults = await enrichmentPipelineService.enrichBatch(leadsToEnrich);
      
      const successful = enrichmentResults.filter(r => r.success).length;
      const duplicates = enrichmentResults.filter(r => r.isDuplicate).length;

      await this._finaliseBatch(batchId, leadsToEnrich.length, successful);

      logger.info(`[ScrapingController] Enrichment complete: ${successful} saved, ${duplicates} duplicates`, { batchId });

      res.json({
        success: true,
        message: `Enriched ${successful} leads from People Data Labs (${duplicates} duplicates skipped)`,
        data: {
          batchId,
          total: emails.length,
          found: leadsToEnrich.length,
          saved: successful,
          duplicates,
        },
      });
    } catch (error: any) {
      logger.error('[ScrapingController] Error enriching with PDL', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/scraping/linkedin - Import leads from LinkedIn CSV
   */
  async importFromLinkedIn(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { csvData } = req.body;

      logger.info('[ScrapingController] Importing leads from LinkedIn CSV', { userId });

      if (!csvData || !Array.isArray(csvData)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid CSV data. Expected array of lead objects.' },
        });
      }

      // Create batch so imported leads are trackable
      const batchId = await this._createBatch(
        userId,
        `LinkedIn Import – ${new Date().toLocaleDateString()}`,
        { source: 'linkedin', rowCount: csvData.length },
      );

      // Transform CSV data to lead format and stamp batchId + userId
      const linkedInLeads = csvData.map((row: any) => ({
        companyName: row.company || row['Company Name'] || '',
        contactName: row.name || row['Full Name'] || '',
        contactTitle: row.title || row['Job Title'] || '',
        email: row.email || row['Email Address'] || '',
        phone: row.phone || row['Phone Number'] || '',
        linkedinUrl: row.linkedin || row['LinkedIn URL'] || '',
        industry: row.industry || row['Industry'] || '',
        companySize: row.size || row['Company Size'] || '',
        location: row.location || row['Location'] || '',
        source: 'linkedin' as const,
        status: 'new' as const,
        batchId,
        userId,
      }));

      logger.info(`[ScrapingController] Processing ${linkedInLeads.length} LinkedIn leads`);

      // Enrich leads through pipeline (saves to DB)
      const enrichmentResults = await enrichmentPipelineService.enrichBatch(linkedInLeads);
      
      const successful = enrichmentResults.filter(r => r.success).length;
      const duplicates = enrichmentResults.filter(r => r.isDuplicate).length;

      await this._finaliseBatch(batchId, csvData.length, successful);

      logger.info(`[ScrapingController] Enrichment complete: ${successful} saved, ${duplicates} duplicates`, { batchId });

      res.json({
        success: true,
        message: `Imported ${successful} leads from LinkedIn (${duplicates} duplicates skipped)`,
        data: {
          batchId,
          total: csvData.length,
          saved: successful,
          duplicates,
        },
      });
    } catch (error: any) {
      logger.error('[ScrapingController] Error importing from LinkedIn', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }
}

export const scrapingController = new ScrapingController();
