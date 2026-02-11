import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { apolloService } from '../services/lead-generation/apollo.service';
import { googlePlacesService } from '../services/lead-generation/google-places.service';
import { peopleDataLabsService } from '../services/lead-generation/peopledatalabs.service';
import { enrichmentPipelineService } from '../services/crm/enrichment-pipeline.service';
import { db, leads } from '@leadnex/database';

export class ScrapingController {
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
      const { industry, country, city, maxResults = 50 } = req.body;

      logger.info('[ScrapingController] Generating leads from Apollo', {
        industry,
        country,
        city,
        maxResults,
      });

      // Fetch leads from Apollo
      const apolloLeads = await apolloService.searchLeads({
        industry,
        country,
        city,
        maxResults,
      });

      logger.info(`[ScrapingController] Fetched ${apolloLeads.length} leads from Apollo`);

      // Enrich leads through pipeline (automatically saves to DB)
      const enrichmentResults = await enrichmentPipelineService.enrichBatch(apolloLeads);
      
      const successful = enrichmentResults.filter(r => r.success).length;
      const duplicates = enrichmentResults.filter(r => r.isDuplicate).length;

      logger.info(`[ScrapingController] Enrichment complete: ${successful} saved, ${duplicates} duplicates`);

      res.json({
        success: true,
        message: `Generated ${successful} leads from Apollo (${duplicates} duplicates skipped)`,
        data: {
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
      const { industry, country, city, maxResults = 50 } = req.body;

      logger.info('[ScrapingController] Generating leads from Google Places', {
        industry,
        country,
        city,
        maxResults,
      });

      // Fetch leads from Google Places
      const placesLeads = await googlePlacesService.searchLeads({
        industry,
        country,
        city,
        maxResults,
      });

      logger.info(`[ScrapingController] Fetched ${placesLeads.length} leads from Google Places`);

      // Enrich leads through pipeline (automatically saves to DB)
      const enrichmentResults = await enrichmentPipelineService.enrichBatch(placesLeads);
      
      const successful = enrichmentResults.filter(r => r.success).length;
      const duplicates = enrichmentResults.filter(r => r.isDuplicate).length;

      logger.info(`[ScrapingController] Enrichment complete: ${successful} saved, ${duplicates} duplicates`);

      res.json({
        success: true,
        message: `Generated ${successful} leads from Google Places (${duplicates} duplicates skipped)`,
        data: {
          total: placesLeads.length,
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
      const { emails = [] } = req.body;

      logger.info('[ScrapingController] Enriching leads with People Data Labs', {
        count: emails.length,
      });

      if (!Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Please provide an array of email addresses to enrich.' },
        });
      }

      // Enrich each email with PDL
      const leadsToEnrich = [];
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
          });
        }
      }

      logger.info(`[ScrapingController] Found ${leadsToEnrich.length} enrichable leads from PDL`);

      // Run through enrichment pipeline (automatically saves to DB)
      const enrichmentResults = await enrichmentPipelineService.enrichBatch(leadsToEnrich);
      
      const successful = enrichmentResults.filter(r => r.success).length;
      const duplicates = enrichmentResults.filter(r => r.isDuplicate).length;

      logger.info(`[ScrapingController] Enrichment complete: ${successful} saved, ${duplicates} duplicates`);

      res.json({
        success: true,
        message: `Enriched ${successful} leads from People Data Labs (${duplicates} duplicates skipped)`,
        data: {
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
  async importFromLinkedIn(req: Request, res: Response) {
    try {
      const { csvData } = req.body;

      logger.info('[ScrapingController] Importing leads from LinkedIn CSV');

      if (!csvData || !Array.isArray(csvData)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid CSV data. Expected array of lead objects.' },
        });
      }

      // Transform CSV data to lead format
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
      }));

      logger.info(`[ScrapingController] Processing ${linkedInLeads.length} LinkedIn leads`);

      // Enrich leads through pipeline (automatically saves to DB)
      const enrichmentResults = await enrichmentPipelineService.enrichBatch(linkedInLeads);
      
      const successful = enrichmentResults.filter(r => r.success).length;
      const duplicates = enrichmentResults.filter(r => r.isDuplicate).length;

      logger.info(`[ScrapingController] Enrichment complete: ${successful} saved, ${duplicates} duplicates`);

      res.json({
        success: true,
        message: `Imported ${successful} leads from LinkedIn (${duplicates} duplicates skipped)`,
        data: {
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
