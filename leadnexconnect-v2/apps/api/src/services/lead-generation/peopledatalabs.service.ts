import axios from 'axios';
import { db, apiUsage } from '@leadnex/database';
import { logger } from '../../utils/logger';
import { settingsService } from '../settings.service';

const PDL_API_BASE = 'https://api.peopledatalabs.com/v5';

interface PDLEnrichParams {
  email?: string;
  companyName?: string;
  domain?: string;
  firstName?: string;
  lastName?: string;
}

interface PDLCompanyParams {
  name?: string;
  website?: string;
  domain?: string;
}

export class PeopleDataLabsService {
  private async getApiKey(): Promise<string | null> {
    return await settingsService.get('peopleDataLabsApiKey', process.env.PEOPLEDATALABS_API_KEY || '');
  }

  /**
   * Enrich contact information using People Data Labs
   */
  async enrichContact(params: PDLEnrichParams): Promise<{
    email?: string;
    phone?: string;
    linkedin?: string;
    jobTitle?: string;
    seniority?: string;
    companyName?: string;
    companyIndustry?: string;
    found: boolean;
  }> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        logger.warn('[PDL] API key not configured');
        return { found: false };
      }

      logger.info('[PDL] Enriching contact', { params });

      const queryParams: any = {
        api_key: apiKey,
        pretty: true,
      };

      if (params.email) {
        queryParams.email = params.email;
      } else if (params.firstName && params.lastName && params.companyName) {
        queryParams.first_name = params.firstName;
        queryParams.last_name = params.lastName;
        queryParams.company = params.companyName;
      } else {
        throw new Error('Either email or (firstName + lastName + company) required');
      }

      const response = await axios.get(`${PDL_API_BASE}/person/enrich`, {
        params: queryParams,
        timeout: 15000,
      });

      // Track API usage
      await this.trackApiUsage('person_enrich');

      if (!response.data || response.data.status !== 200) {
        logger.warn('[PDL] No data found for contact');
        return { found: false };
      }

      const person = response.data.data;

      logger.info('[PDL] Contact enriched successfully', {
        email: person.emails?.[0]?.address,
        company: person.job_company_name,
      });

      return {
        email: person.emails?.[0]?.address || person.work_email,
        phone: person.phone_numbers?.[0],
        linkedin: person.linkedin_url,
        jobTitle: person.job_title,
        seniority: person.job_title_levels?.[0],
        companyName: person.job_company_name,
        companyIndustry: person.job_company_industry,
        found: true,
      };
    } catch (error: any) {
      logger.error('[PDL] Error enriching contact', {
        error: error.message,
        status: error.response?.status,
      });

      if (error.response?.status === 429) {
        logger.warn('[PDL] Rate limit exceeded');
      }

      return { found: false };
    }
  }

  /**
   * Enrich company information
   */
  async enrichCompany(params: PDLCompanyParams): Promise<{
    name?: string;
    website?: string;
    industry?: string;
    size?: string;
    phone?: string;
    founded?: number;
    linkedin?: string;
    found: boolean;
  }> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        logger.warn('[PDL] API key not configured');
        return { found: false };
      }

      logger.info('[PDL] Enriching company', { params });

      const queryParams: any = {
        api_key: apiKey,
        pretty: true,
      };

      if (params.website || params.domain) {
        queryParams.website = params.website || params.domain;
      } else if (params.name) {
        queryParams.name = params.name;
      } else {
        throw new Error('Either name or website/domain is required');
      }

      const response = await axios.get(`${PDL_API_BASE}/company/enrich`, {
        params: queryParams,
        timeout: 15000,
      });

      // Track API usage
      await this.trackApiUsage('company_enrich');

      if (!response.data || response.data.status !== 200) {
        logger.warn('[PDL] No data found for company');
        return { found: false };
      }

      const company = response.data.data;

      logger.info('[PDL] Company enriched successfully', {
        name: company.name,
        industry: company.industry,
      });

      return {
        name: company.name,
        website: company.website,
        industry: company.industry,
        size: this.mapCompanySize(company.size),
        phone: company.phone,
        founded: company.founded,
        linkedin: company.linkedin_url,
        found: true,
      };
    } catch (error: any) {
      logger.error('[PDL] Error enriching company', {
        error: error.message,
        status: error.response?.status,
      });

      if (error.response?.status === 429) {
        logger.warn('[PDL] Rate limit exceeded');
      }

      return { found: false };
    }
  }

  /**
   * Search for email addresses
   */
  async findEmail(params: {
    firstName: string;
    lastName: string;
    companyName?: string;
    domain?: string;
  }): Promise<{
    email?: string;
    confidence?: number;
    found: boolean;
  }> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        logger.warn('[PDL] API key not configured');
        return { found: false };
      }

      logger.info('[PDL] Finding email', { params });

      const queryParams: any = {
        api_key: apiKey,
        first_name: params.firstName,
        last_name: params.lastName,
        pretty: true,
      };

      if (params.domain) {
        queryParams.company = params.domain;
      } else if (params.companyName) {
        queryParams.company = params.companyName;
      }

      const response = await axios.get(`${PDL_API_BASE}/person/enrich`, {
        params: queryParams,
        timeout: 15000,
      });

      // Track API usage
      await this.trackApiUsage('email_finder');

      if (!response.data || response.data.status !== 200) {
        logger.warn('[PDL] Email not found');
        return { found: false };
      }

      const person = response.data.data;
      const email = person.emails?.[0]?.address || person.work_email;

      if (!email) {
        return { found: false };
      }

      logger.info('[PDL] Email found', { email });

      return {
        email,
        confidence: person.likelihood || 0,
        found: true,
      };
    } catch (error: any) {
      logger.error('[PDL] Error finding email', {
        error: error.message,
        status: error.response?.status,
      });

      return { found: false };
    }
  }

  /**
   * Bulk enrich multiple contacts
   */
  async bulkEnrich(contacts: PDLEnrichParams[]): Promise<any[]> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        logger.warn('[PDL] API key not configured');
        return [];
      }

      logger.info('[PDL] Bulk enriching contacts', { count: contacts.length });

      const response = await axios.post(
        `${PDL_API_BASE}/person/bulk`,
        {
          requests: contacts.map((contact) => ({
            params: {
              email: contact.email,
              first_name: contact.firstName,
              last_name: contact.lastName,
              company: contact.companyName,
            },
          })),
        },
        {
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      // Track API usage
      await this.trackApiUsage('bulk_enrich', contacts.length);

      logger.info('[PDL] Bulk enrichment complete', {
        count: response.data.length,
      });

      return response.data;
    } catch (error: any) {
      logger.error('[PDL] Error in bulk enrichment', {
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Map company size to standard categories
   */
  private mapCompanySize(size?: string): string {
    if (!size) return '1-10';

    const sizeMap: Record<string, string> = {
      '1-10': '1-10',
      '11-50': '11-50',
      '51-200': '51-200',
      '201-500': '201-500',
      '501-1000': '501-1000',
      '1001-5000': '1000+',
      '5001-10000': '1000+',
      '10001+': '1000+',
    };

    return sizeMap[size] || '1-10';
  }

  /**
   * Track API usage in database
   */
  private async trackApiUsage(
    endpoint: string,
    count: number = 1
  ): Promise<void> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      await db.insert(apiUsage).values({
        service: `pdl_${endpoint}`,
        requestsMade: count,
        periodStart: startOfMonth,
        periodEnd: endOfMonth,
        createdAt: new Date(),
      });
    } catch (error: any) {
      logger.error('[PDL] Error tracking API usage', {
        error: error.message,
      });
    }
  }

  /**
   * Get remaining API credits
   */
  async getRemainingCredits(): Promise<number> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return 0;
      }

      // PDL doesn't provide a direct credits endpoint
      // You would need to track this locally or through their dashboard
      logger.info('[PDL] Check credits on PDL dashboard');
      return 1000; // Placeholder
    } catch (error: any) {
      logger.error('[PDL] Error getting credits', {
        error: error.message,
      });
      return 0;
    }
  }
}

export const peopleDataLabsService = new PeopleDataLabsService();
