import axios from 'axios';
import { logger } from '../../utils/logger';

const HUNTER_API_BASE = 'https://api.hunter.io/v2';
const HUNTER_API_KEY = process.env.HUNTER_API_KEY;

interface EmailVerificationResult {
  email: string;
  isValid: boolean;
  score: number;
  status: string; // valid, invalid, accept_all, webmail, disposable, unknown
}

interface DomainSearchResult {
  emails: Array<{
    value: string;
    type: string;
    confidence: number;
    firstName?: string;
    lastName?: string;
    position?: string;
  }>;
}

export class HunterService {
  private apiKey: string;

  constructor() {
    if (!HUNTER_API_KEY) {
      throw new Error('HUNTER_API_KEY is not set in environment variables');
    }
    this.apiKey = HUNTER_API_KEY;
  }

  /**
   * Verify if an email address is valid
   */
  async verifyEmail(email: string): Promise<EmailVerificationResult> {
    try {
      logger.info('[Hunter] Verifying email', { email });

      const response = await axios.get(`${HUNTER_API_BASE}/email-verifier`, {
        params: {
          email,
          api_key: this.apiKey,
        },
        timeout: 10000,
      });

      const data = response.data.data;

      return {
        email: data.email,
        isValid: data.status === 'valid',
        score: data.score,
        status: data.status,
      };
    } catch (error: any) {
      logger.error('[Hunter] Error verifying email', {
        email,
        error: error.message,
      });
      
      // Return unverified result on error
      return {
        email,
        isValid: false,
        score: 0,
        status: 'unknown',
      };
    }
  }

  /**
   * Find email addresses for a domain
   */
  async findEmailByDomain(domain: string, limit: number = 10): Promise<DomainSearchResult> {
    try {
      logger.info('[Hunter] Finding emails for domain', { domain, limit });

      const response = await axios.get(`${HUNTER_API_BASE}/domain-search`, {
        params: {
          domain,
          limit,
          api_key: this.apiKey,
        },
        timeout: 10000,
      });

      const emails = response.data.data.emails || [];

      return {
        emails: emails.map((e: any) => ({
          value: e.value,
          type: e.type,
          confidence: e.confidence,
          firstName: e.first_name,
          lastName: e.last_name,
          position: e.position,
        })),
      };
    } catch (error: any) {
      logger.error('[Hunter] Error finding emails', {
        domain,
        error: error.message,
      });
      
      return { emails: [] };
    }
  }

  /**
   * Find email for a specific person at a company
   */
  async findEmailByName(
    firstName: string,
    lastName: string,
    domain: string
  ): Promise<string | null> {
    try {
      logger.info('[Hunter] Finding email by name', { firstName, lastName, domain });

      const response = await axios.get(`${HUNTER_API_BASE}/email-finder`, {
        params: {
          first_name: firstName,
          last_name: lastName,
          domain,
          api_key: this.apiKey,
        },
        timeout: 10000,
      });

      return response.data.data.email || null;
    } catch (error: any) {
      logger.error('[Hunter] Error finding email by name', {
        firstName,
        lastName,
        domain,
        error: error.message,
      });
      
      return null;
    }
  }

  /**
   * Check remaining API credits
   */
  async checkApiUsage(): Promise<{ used: number; remaining: number; limit: number }> {
    try {
      const response = await axios.get(`${HUNTER_API_BASE}/account`, {
        params: {
          api_key: this.apiKey,
        },
      });

      const data = response.data.data;
      
      return {
        used: data.calls.used,
        remaining: data.calls.available,
        limit: data.calls.available + data.calls.used,
      };
    } catch (error: any) {
      logger.error('[Hunter] Error checking API usage', { error: error.message });
      throw error;
    }
  }
}

export const hunterService = new HunterService();
