import { db, leads } from '@leadnex/database';
import { eq } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { deduplicationService } from './deduplication.service';
import { emailVerificationService } from '../lead-generation/email-verification.service';
import { peopleDataLabsService } from '../lead-generation/peopledatalabs.service';
import { emailFinderService } from '../enrichment/email-finder.service';
import { leadScoringService } from './lead-scoring.service';
import type { Lead } from '@leadnex/shared';

export interface EnrichmentResult {
  success: boolean;
  leadId?: string;
  isDuplicate?: boolean;
  duplicateOf?: string;
  errors?: string[];
}

export class EnrichmentPipelineService {
  /**
   * Full enrichment pipeline for a single lead
   * 1. Check for duplicates
   * 2. Enrich with People Data Labs (if needed)
   * 3. Verify email with Hunter.io
   * 4. Calculate quality score
   * 5. Save to database
   */
  async enrichLead(lead: Partial<Lead>): Promise<EnrichmentResult> {
    const errors: string[] = [];

    try {
      logger.info('[EnrichmentPipeline] Starting enrichment', {
        company: lead.companyName,
        email: lead.email,
      });

      // Step 1: Check for duplicates
      const dupeCheck = await deduplicationService.checkDuplicate({
        email: lead.email,
        companyName: lead.companyName!,
        industry: lead.industry!,
        website: lead.website,
      });

      if (dupeCheck.isDuplicate) {
        logger.info('[EnrichmentPipeline] Duplicate found, merging data', {
          existingId: dupeCheck.existingLeadId,
          matchType: dupeCheck.matchType,
        });

        // Merge new data into existing lead
        await deduplicationService.mergeLeadData(
          dupeCheck.existingLeadId!,
          lead as any
        );

        return {
          success: true,
          isDuplicate: true,
          duplicateOf: dupeCheck.existingLeadId,
          leadId: dupeCheck.existingLeadId,
        };
      }

      // Step 2: Find email using multi-method email finder (if missing)
      if (!lead.email && lead.website) {
        logger.info('[EnrichmentPipeline] Email missing, attempting email finder');

        try {
          const emailResult = await emailFinderService.findEmail({
            website: lead.website || undefined,
            domain: undefined,
            companyName: lead.companyName || undefined,
          });

          if (emailResult.email && emailFinderService.validateEmail(emailResult.email)) {
            lead.email = emailResult.email;
            lead.customFields = {
              ...(lead.customFields as any || {}),
              emailSource: emailResult.source,
              emailConfidence: emailResult.confidence,
              emailMethod: emailResult.method,
            };
            logger.info('[EnrichmentPipeline] Email found via email finder', {
              email: emailResult.email,
              source: emailResult.source,
              confidence: emailResult.confidence,
              method: emailResult.method,
            });
          }
        } catch (error: any) {
          logger.error('[EnrichmentPipeline] Email finder error', {
            error: error.message,
            companyName: lead.companyName,
          });
        }
      }

      // Step 3: Enrich with People Data Labs (if email still missing)
      if (!lead.email && lead.website) {
        logger.info('[EnrichmentPipeline] Email still missing, attempting PDL enrichment');

        const domain = this.extractDomain(lead.website);
        if (domain && lead.contactName) {
          const [firstName, ...lastNameParts] = lead.contactName.split(' ');
          const lastName = lastNameParts.join(' ');

          if (firstName && lastName) {
            const pdlResult = await peopleDataLabsService.findEmail({
              firstName,
              lastName,
              domain,
            });

            if (pdlResult.found && pdlResult.email) {
              lead.email = pdlResult.email;
              logger.info('[EnrichmentPipeline] Email found via PDL', {
                email: pdlResult.email,
              });
            }
          }
        }
      }

      // Step 4: Verify email with Hunter.io (if we have one)
      if (lead.email) {
        logger.info('[EnrichmentPipeline] Verifying email');

        const verification = await emailVerificationService.verifyEmail(
          lead.email
        );

        if (verification.isValid) {
          lead.verificationStatus = 'email_verified';
          logger.info('[EnrichmentPipeline] Email verified', {
            score: verification.score,
          });
        } else {
          lead.verificationStatus = 'unverified';
          logger.warn('[EnrichmentPipeline] Email verification failed', {
            status: verification.status,
          });
        }

        // Store verification details in customFields
        lead.customFields = {
          ...(lead.customFields as any || {}),
          emailVerificationScore: verification.score,
          emailVerificationStatus: verification.status,
          emailVerificationDetails: verification.details,
        };
      }

      // Step 5: Enrich contact info from PDL (if we have email)
      if (lead.email) {
        logger.info('[EnrichmentPipeline] Enriching contact info');

        const pdlEnrich = await peopleDataLabsService.enrichContact({
          email: lead.email,
        });

        if (pdlEnrich.found) {
          // Enhance lead with PDL data
          if (!lead.phone && pdlEnrich.phone) {
            lead.phone = pdlEnrich.phone;
          }
          if (!lead.linkedinUrl && pdlEnrich.linkedin) {
            lead.linkedinUrl = pdlEnrich.linkedin;
          }
          if (!lead.jobTitle && pdlEnrich.jobTitle) {
            lead.jobTitle = pdlEnrich.jobTitle;
          }

          // Store enrichment data
          lead.customFields = {
            ...(lead.customFields as any || {}),
            pdlEnrichment: {
              seniority: pdlEnrich.seniority,
              companyIndustry: pdlEnrich.companyIndustry,
            },
          };

          logger.info('[EnrichmentPipeline] Contact enriched from PDL');
        }
      }

      // Step 6: Calculate quality score
      logger.info('[EnrichmentPipeline] Calculating quality score');
      const qualityScore = leadScoringService.calculateScore(lead as Lead);
      lead.qualityScore = qualityScore;

      logger.info('[EnrichmentPipeline] Quality score calculated', {
        score: qualityScore,
      });

      // Step 7: Save to database (only if quality score is acceptable)
      if (qualityScore < 40) {
        logger.warn('[EnrichmentPipeline] Quality score too low, skipping save', {
          score: qualityScore,
          company: lead.companyName,
        });

        return {
          success: false,
          errors: ['Quality score too low (minimum 40 required)'],
        };
      }

      logger.info('[EnrichmentPipeline] Saving lead to database');

      const [savedLead] = await db.insert(leads).values({
        ...lead,
        id: undefined, // Let database generate UUID
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any).returning();

      logger.info('[EnrichmentPipeline] Lead saved successfully', {
        leadId: savedLead.id,
        score: savedLead.qualityScore,
      });

      return {
        success: true,
        leadId: savedLead.id,
        isDuplicate: false,
      };
    } catch (error: any) {
      logger.error('[EnrichmentPipeline] Error in enrichment pipeline', {
        error: error.message,
        company: lead.companyName,
      });

      errors.push(error.message);

      return {
        success: false,
        errors,
      };
    }
  }

  /**
   * Batch enrich multiple leads
   */
  async enrichBatch(leadsToEnrich: Partial<Lead>[]): Promise<EnrichmentResult[]> {
    logger.info('[EnrichmentPipeline] Starting batch enrichment', {
      count: leadsToEnrich.length,
    });

    const results: EnrichmentResult[] = [];

    for (const lead of leadsToEnrich) {
      const result = await this.enrichLead(lead);
      results.push(result);

      // Add small delay to avoid overwhelming APIs
      await this.delay(100);
    }

    const successful = results.filter((r) => r.success).length;
    const duplicates = results.filter((r) => r.isDuplicate).length;
    const failed = results.filter((r) => !r.success).length;

    logger.info('[EnrichmentPipeline] Batch enrichment complete', {
      total: leadsToEnrich.length,
      successful,
      duplicates,
      failed,
    });

    return results;
  }

  /**
   * Enrich existing lead in database
   */
  async enrichExistingLead(leadId: string): Promise<boolean> {
    try {
      logger.info('[EnrichmentPipeline] Enriching existing lead', { leadId });

      // Get lead from database
      const existingLeads = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadId))
        .limit(1);

      if (!existingLeads || existingLeads.length === 0) {
        logger.warn('[EnrichmentPipeline] Lead not found', { leadId });
        return false;
      }

      const lead = existingLeads[0];

      // Re-run enrichment
      const result = await this.enrichLead(lead as any);

      return result.success;
    } catch (error: any) {
      logger.error('[EnrichmentPipeline] Error enriching existing lead', {
        leadId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Extract domain from website URL
   */
  private extractDomain(website: string): string | null {
    try {
      const url = website.startsWith('http') ? website : `https://${website}`;
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get enrichment statistics
   */
  async getEnrichmentStats(startDate: Date, endDate: Date): Promise<{
    totalEnriched: number;
    emailsFound: number;
    phonesFound: number;
    averageScore: number;
    duplicatesFound: number;
  }> {
    try {
      // This would query the database for stats
      // Placeholder implementation
      return {
        totalEnriched: 0,
        emailsFound: 0,
        phonesFound: 0,
        averageScore: 0,
        duplicatesFound: 0,
      };
    } catch (error: any) {
      logger.error('[EnrichmentPipeline] Error getting stats', {
        error: error.message,
      });
      throw error;
    }
  }
}

export const enrichmentPipelineService = new EnrichmentPipelineService();
