import axios from 'axios';
import { db } from '@leadnex/database';
import { leads, apiUsage } from '@leadnex/database';
import { eq } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { settingsService } from '../settings.service';

const HUNTER_API_BASE = 'https://api.hunter.io/v2';

interface HunterVerifyResponse {
  data: {
    status: string; // 'valid', 'invalid', 'accept_all', 'webmail', 'disposable', 'unknown'
    result: string; // 'deliverable', 'undeliverable', 'risky', 'unknown'
    score: number; // 0-100
    email: string;
    regexp: boolean;
    gibberish: boolean;
    disposable: boolean;
    webmail: boolean;
    mx_records: boolean;
    smtp_server: boolean;
    smtp_check: boolean;
    accept_all: boolean;
    block: boolean;
  };
}

interface HunterEmailFinderResponse {
  data: {
    email: string;
    score: number;
    firstName: string;
    lastName: string;
    position: string;
    seniority: string;
    department: string;
    linkedin: string;
    twitter: string;
    phone_number: string;
    verification: {
      date: string;
      status: string;
    };
  };
}

export class EmailVerificationService {
  private async getApiKey(): Promise<string | null> {
    return await settingsService.get('hunterApiKey', process.env.HUNTER_API_KEY || '');
  }

  /**
   * Verify email address using Hunter.io
   */
  async verifyEmail(email: string): Promise<{
    isValid: boolean;
    status: string;
    score: number;
    details?: any;
  }> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        logger.warn('[EmailVerification] Hunter.io API key not configured');
        return { isValid: false, status: 'unknown', score: 0 };
      }

      logger.info('[EmailVerification] Verifying email', { email });

      // Track API usage
      await this.trackApiUsage('email_verification');

      const response = await axios.get<HunterVerifyResponse>(
        `${HUNTER_API_BASE}/email-verifier`,
        {
          params: {
            email,
            api_key: apiKey,
          },
          timeout: 10000,
        }
      );

      const { data } = response.data;

      const isValid =
        data.result === 'deliverable' ||
        (data.status === 'valid' && data.score >= 70);

      logger.info('[EmailVerification] Email verified', {
        email,
        status: data.status,
        result: data.result,
        score: data.score,
        isValid,
      });

      return {
        isValid,
        status: data.result,
        score: data.score,
        details: {
          disposable: data.disposable,
          webmail: data.webmail,
          mx_records: data.mx_records,
          smtp_check: data.smtp_check,
          accept_all: data.accept_all,
        },
      };
    } catch (error: any) {
      logger.error('[EmailVerification] Error verifying email', {
        email,
        error: error.message,
        status: error.response?.status,
      });

      // Check if we hit rate limit
      if (error.response?.status === 429) {
        logger.warn('[EmailVerification] Rate limit exceeded');
        return { isValid: false, status: 'rate_limit_exceeded', score: 0 };
      }

      return { isValid: false, status: 'error', score: 0 };
    }
  }

  /**
   * Find email for a person at a company
   */
  async findEmail(params: {
    firstName: string;
    lastName: string;
    domain: string;
  }): Promise<{
    email: string | null;
    score: number;
    linkedin?: string;
    position?: string;
  }> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        logger.warn('[EmailVerification] Hunter.io API key not configured');
        return { email: null, score: 0 };
      }

      logger.info('[EmailVerification] Finding email', { params });

      // Track API usage
      await this.trackApiUsage('email_finder');

      const response = await axios.get<HunterEmailFinderResponse>(
        `${HUNTER_API_BASE}/email-finder`,
        {
          params: {
            domain: params.domain,
            first_name: params.firstName,
            last_name: params.lastName,
            api_key: apiKey,
          },
          timeout: 10000,
        }
      );

      const { data } = response.data;

      logger.info('[EmailVerification] Email found', {
        email: data.email,
        score: data.score,
      });

      return {
        email: data.email,
        score: data.score,
        linkedin: data.linkedin,
        position: data.position,
      };
    } catch (error: any) {
      logger.error('[EmailVerification] Error finding email', {
        params,
        error: error.message,
        status: error.response?.status,
      });

      if (error.response?.status === 429) {
        logger.warn('[EmailVerification] Rate limit exceeded');
      }

      return { email: null, score: 0 };
    }
  }

  /**
   * Verify and update lead email status
   */
  async verifyLeadEmail(leadId: string): Promise<boolean> {
    try {
      // Get lead
      const leadResults = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadId))
        .limit(1);

      const lead = leadResults[0];
      if (!lead || !lead.email) {
        logger.warn('[EmailVerification] Lead not found or has no email', {
          leadId,
        });
        return false;
      }

      // Verify email
      const verification = await this.verifyEmail(lead.email);

      // Update lead - note: emailVerificationScore field doesn't exist in schema
      // We'll store it in customFields instead
      await db
        .update(leads)
        .set({
          verificationStatus: verification.isValid
            ? 'email_verified'
            : 'unverified',
          customFields: {
            ...(lead.customFields as any || {}),
            emailVerificationScore: verification.score,
            emailVerificationDetails: verification.details,
          },
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId));

      logger.info('[EmailVerification] Lead email updated', {
        leadId,
        isValid: verification.isValid,
        score: verification.score,
      });

      return verification.isValid;
    } catch (error: any) {
      logger.error('[EmailVerification] Error verifying lead email', {
        leadId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Batch verify multiple emails
   */
  async verifyBatch(
    emails: string[]
  ): Promise<Array<{ email: string; isValid: boolean; score: number }>> {
    const results = [];

    for (const email of emails) {
      // Add delay to respect rate limits (1 request per second)
      await this.delay(1000);

      const verification = await this.verifyEmail(email);
      results.push({
        email,
        isValid: verification.isValid,
        score: verification.score,
      });
    }

    return results;
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

      const response = await axios.get(`${HUNTER_API_BASE}/account`, {
        params: {
          api_key: apiKey,
        },
        timeout: 5000,
      });

      const remaining = response.data.data.requests.searches.available;
      logger.info('[EmailVerification] Remaining Hunter.io credits', {
        remaining,
      });

      return remaining;
    } catch (error: any) {
      logger.error('[EmailVerification] Error getting remaining credits', {
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Track API usage in database
   */
  private async trackApiUsage(endpoint: string): Promise<void> {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      await db.insert(apiUsage).values({
        service: `hunter_${endpoint}`,
        requestsMade: 1,
        periodStart: startOfDay,
        periodEnd: endOfDay,
        createdAt: new Date(),
      });
    } catch (error: any) {
      // Don't fail the main operation if tracking fails
      logger.error('[EmailVerification] Error tracking API usage', {
        error: error.message,
      });
    }
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const emailVerificationService = new EmailVerificationService();
