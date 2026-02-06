import { db } from '@leadnex/database';
import { leads } from '@leadnex/database';
import { eq, and, or, sql } from 'drizzle-orm';
import { logger } from '../../utils/logger';

interface LeadData {
  companyName: string;
  email?: string;
  website?: string;
  industry: string;
  phone?: string;
  contactName?: string;
}

interface DeduplicationResult {
  isDuplicate: boolean;
  existingLeadId?: string;
  matchType?: 'email' | 'company_industry' | 'domain' | 'phone';
  existingLead?: any;
}

export class DeduplicationService {
  /**
   * Check if lead is duplicate using 3-level matching
   * Level 1: Exact email match
   * Level 2: Company name + industry match
   * Level 3: Website domain match
   */
  async checkDuplicate(leadData: LeadData): Promise<DeduplicationResult> {
    try {
      logger.info('[Deduplication] Checking for duplicates', { 
        company: leadData.companyName,
        email: leadData.email 
      });

      // Level 1: Exact email match (highest priority)
      if (leadData.email) {
        const emailMatch = await this.checkEmailMatch(leadData.email);
        if (emailMatch) {
          logger.info('[Deduplication] Found email match', { leadId: emailMatch.id });
          return {
            isDuplicate: true,
            existingLeadId: emailMatch.id,
            matchType: 'email',
            existingLead: emailMatch
          };
        }
      }

      // Level 2: Company name + industry match
      const companyMatch = await this.checkCompanyMatch(
        leadData.companyName,
        leadData.industry
      );
      if (companyMatch) {
        logger.info('[Deduplication] Found company+industry match', { leadId: companyMatch.id });
        return {
          isDuplicate: true,
          existingLeadId: companyMatch.id,
          matchType: 'company_industry',
          existingLead: companyMatch
        };
      }

      // Level 3: Website domain match
      if (leadData.website) {
        const domainMatch = await this.checkDomainMatch(leadData.website);
        if (domainMatch) {
          logger.info('[Deduplication] Found domain match', { leadId: domainMatch.id });
          return {
            isDuplicate: true,
            existingLeadId: domainMatch.id,
            matchType: 'domain',
            existingLead: domainMatch
          };
        }
      }

      // Level 4: Phone number match (optional, lower priority)
      if (leadData.phone) {
        const phoneMatch = await this.checkPhoneMatch(leadData.phone);
        if (phoneMatch) {
          logger.info('[Deduplication] Found phone match', { leadId: phoneMatch.id });
          return {
            isDuplicate: true,
            existingLeadId: phoneMatch.id,
            matchType: 'phone',
            existingLead: phoneMatch
          };
        }
      }

      logger.info('[Deduplication] No duplicate found, lead is unique');
      return { isDuplicate: false };

    } catch (error: any) {
      logger.error('[Deduplication] Error checking duplicates', { error: error.message });
      // On error, allow lead through (fail-open strategy)
      return { isDuplicate: false };
    }
  }

  /**
   * Merge new lead data with existing lead (keep best information)
   */
  async mergeLeadData(existingLeadId: string, newData: LeadData): Promise<any> {
    try {
      logger.info('[Deduplication] Merging lead data', { existingLeadId });

      const existing = await db
        .select()
        .from(leads)
        .where(eq(leads.id, existingLeadId))
        .limit(1);

      if (!existing[0]) {
        throw new Error(`Lead ${existingLeadId} not found`);
      }

      const existingLead = existing[0];

      // Build update object with best available data
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Keep better email (verified > unverified)
      if (newData.email && !existingLead.email) {
        updateData.email = newData.email;
      }

      // Keep better phone
      if (newData.phone && !existingLead.phone) {
        updateData.phone = newData.phone;
      }

      // Keep better website
      if (newData.website && !existingLead.website) {
        updateData.website = newData.website;
      }

      // Keep better contact name
      if (newData.contactName && !existingLead.contactName) {
        updateData.contactName = newData.contactName;
      }

      // Update if we have new data
      if (Object.keys(updateData).length > 1) {
        await db
          .update(leads)
          .set(updateData)
          .where(eq(leads.id, existingLeadId));

        logger.info('[Deduplication] Updated existing lead with new data', { 
          existingLeadId,
          updatedFields: Object.keys(updateData) 
        });
      }

      return { ...existingLead, ...updateData };

    } catch (error: any) {
      logger.error('[Deduplication] Error merging lead data', { 
        error: error.message,
        existingLeadId 
      });
      throw error;
    }
  }

  /**
   * Check for exact email match
   */
  private async checkEmailMatch(email: string): Promise<any> {
    const normalizedEmail = email.toLowerCase().trim();
    
    const results = await db
      .select()
      .from(leads)
      .where(sql`LOWER(${leads.email}) = ${normalizedEmail}`)
      .limit(1);

    return results[0] || null;
  }

  /**
   * Check for company name + industry match
   */
  private async checkCompanyMatch(companyName: string, industry: string): Promise<any> {
    const normalizedCompany = companyName.toLowerCase().trim();
    const normalizedIndustry = industry.toLowerCase().trim();

    const results = await db
      .select()
      .from(leads)
      .where(
        and(
          sql`LOWER(${leads.companyName}) = ${normalizedCompany}`,
          sql`LOWER(${leads.industry}) = ${normalizedIndustry}`
        )
      )
      .limit(1);

    return results[0] || null;
  }

  /**
   * Check for website domain match
   */
  private async checkDomainMatch(website: string): Promise<any> {
    try {
      const domain = this.extractDomain(website);
      
      if (!domain) return null;

      const results = await db
        .select()
        .from(leads)
        .where(sql`${leads.website} ILIKE ${'%' + domain + '%'}`)
        .limit(1);

      return results[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Check for phone number match
   */
  private async checkPhoneMatch(phone: string): Promise<any> {
    // Normalize phone (remove spaces, dashes, parentheses)
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');

    const results = await db
      .select()
      .from(leads)
      .where(sql`REPLACE(REPLACE(REPLACE(${leads.phone}, ' ', ''), '-', ''), '(', '') LIKE ${'%' + normalizedPhone + '%'}`)
      .limit(1);

    return results[0] || null;
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string | null {
    try {
      // Remove protocol
      let domain = url.replace(/^https?:\/\//, '');
      // Remove www
      domain = domain.replace(/^www\./, '');
      // Remove path
      domain = domain.split('/')[0];
      // Remove port
      domain = domain.split(':')[0];
      
      return domain;
    } catch {
      return null;
    }
  }

  /**
   * Get deduplication statistics
   */
  async getStats(): Promise<{
    totalLeads: number;
    duplicatesFound: number;
    uniqueCompanies: number;
    uniqueEmails: number;
  }> {
    try {
      const totalLeadsResult = await db.select({ count: sql<number>`COUNT(*)` }).from(leads);
      const totalLeads = Number(totalLeadsResult[0]?.count || 0);

      const uniqueEmailsResult = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${leads.email})` })
        .from(leads)
        .where(sql`${leads.email} IS NOT NULL`);
      const uniqueEmails = Number(uniqueEmailsResult[0]?.count || 0);

      const uniqueCompaniesResult = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${leads.companyName})` })
        .from(leads);
      const uniqueCompanies = Number(uniqueCompaniesResult[0]?.count || 0);

      return {
        totalLeads,
        duplicatesFound: totalLeads - uniqueCompanies,
        uniqueCompanies,
        uniqueEmails
      };
    } catch (error: any) {
      logger.error('[Deduplication] Error getting stats', { error: error.message });
      return {
        totalLeads: 0,
        duplicatesFound: 0,
        uniqueCompanies: 0,
        uniqueEmails: 0
      };
    }
  }
}

export const deduplicationService = new DeduplicationService();
