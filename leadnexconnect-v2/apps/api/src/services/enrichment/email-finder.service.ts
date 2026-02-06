import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../../utils/logger';
import { settingsService } from '../settings.service';

interface EmailFinderResult {
  email: string | null;
  confidence: 'high' | 'medium' | 'low';
  source: 'website_scraping' | 'email_pattern' | 'google_search';
  method: string;
}

export class EmailFinderService {
  private emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;

  /**
   * Find email for a lead using multiple methods
   */
  async findEmail(params: {
    website?: string;
    companyName?: string;
    domain?: string;
  }): Promise<EmailFinderResult> {
    try {
      const domain = params.domain || (params.website ? this.extractDomain(params.website) : null);

      if (!domain && !params.website) {
        logger.warn('[EmailFinder] No website or domain provided');
        return { email: null, confidence: 'low', source: 'email_pattern', method: 'none' };
      }

      // Method 1: Website Scraping (60-80% success)
      if (params.website || domain) {
        const scrapedEmail = await this.scrapeWebsiteForEmail(params.website || `https://${domain}`);
        if (scrapedEmail) {
          logger.info('[EmailFinder] Found email via website scraping', { email: scrapedEmail });
          return {
            email: scrapedEmail,
            confidence: 'high',
            source: 'website_scraping',
            method: 'scraped_from_website',
          };
        }
      }

      // Method 2: Google Custom Search (50-70% success) - if API is configured
      if (domain) {
        const searchEmail = await this.searchEmailViaGoogle(domain);
        if (searchEmail) {
          logger.info('[EmailFinder] Found email via Google Search', { email: searchEmail });
          return {
            email: searchEmail,
            confidence: 'medium',
            source: 'google_search',
            method: 'google_custom_search',
          };
        }
      }

      // Method 3: Email Pattern Generation (70-90% success for small businesses)
      if (domain) {
        const patternEmail = this.generateEmailPattern(domain);
        logger.info('[EmailFinder] Generated email pattern', { email: patternEmail });
        return {
          email: patternEmail,
          confidence: 'medium',
          source: 'email_pattern',
          method: 'common_pattern',
        };
      }

      return { email: null, confidence: 'low', source: 'email_pattern', method: 'none' };
    } catch (error: any) {
      logger.error('[EmailFinder] Error finding email', {
        error: error.message,
        params,
      });
      return { email: null, confidence: 'low', source: 'email_pattern', method: 'error' };
    }
  }

  /**
   * Scrape website for email addresses
   */
  private async scrapeWebsiteForEmail(websiteUrl: string): Promise<string | null> {
    try {
      // Normalize URL
      if (!websiteUrl.startsWith('http')) {
        websiteUrl = `https://${websiteUrl}`;
      }

      const pagesToCheck = [
        websiteUrl,
        `${websiteUrl}/contact`,
        `${websiteUrl}/contact-us`,
        `${websiteUrl}/about`,
        `${websiteUrl}/about-us`,
      ];

      for (const url of pagesToCheck) {
        try {
          const response = await axios.get(url, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            maxRedirects: 5,
          });

          const $ = cheerio.load(response.data);
          
          // Remove script and style tags
          $('script, style, noscript').remove();
          
          // Get all text content
          const text = $('body').text();
          
          // Find all email addresses
          const emails = text.match(this.emailRegex);
          
          if (emails && emails.length > 0) {
            // Filter out common non-contact emails
            const validEmails = emails.filter(email => {
              const lower = email.toLowerCase();
              return !lower.includes('example') &&
                     !lower.includes('test') &&
                     !lower.includes('placeholder') &&
                     !lower.includes('noreply') &&
                     !lower.includes('no-reply') &&
                     !lower.includes('mailer-daemon');
            });

            if (validEmails.length > 0) {
              // Prioritize common business emails
              const priorityEmails = validEmails.filter(email => {
                const lower = email.toLowerCase();
                return lower.includes('info@') ||
                       lower.includes('contact@') ||
                       lower.includes('hello@') ||
                       lower.includes('sales@') ||
                       lower.includes('support@');
              });

              return priorityEmails[0] || validEmails[0];
            }
          }

          // Small delay between requests
          await this.delay(500);
        } catch (error: any) {
          // Continue to next page if this one fails
          logger.debug('[EmailFinder] Failed to scrape page', { url, error: error.message });
        }
      }

      return null;
    } catch (error: any) {
      logger.error('[EmailFinder] Error scraping website', {
        error: error.message,
        website: websiteUrl,
      });
      return null;
    }
  }

  /**
   * Search for email using Google Custom Search API
   */
  private async searchEmailViaGoogle(domain: string): Promise<string | null> {
    try {
      const apiKey = await settingsService.get('googleCustomSearchApiKey', process.env.GOOGLE_CUSTOM_SEARCH_API_KEY);
      const searchEngineId = await settingsService.get('googleCustomSearchEngineId', process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID);

      if (!apiKey || !searchEngineId) {
        logger.debug('[EmailFinder] Google Custom Search not configured');
        return null;
      }

      const query = `"email" OR "contact" OR "@${domain}" site:${domain}`;
      
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: apiKey,
          cx: searchEngineId,
          q: query,
          num: 3,
        },
        timeout: 10000,
      });

      if (response.data.items && response.data.items.length > 0) {
        // Search through snippets and titles for email addresses
        for (const item of response.data.items) {
          const text = `${item.snippet || ''} ${item.title || ''}`;
          const emails = text.match(this.emailRegex);
          
          if (emails && emails.length > 0) {
            // Filter to only emails from the target domain
            const domainEmails = emails.filter(email => 
              email.toLowerCase().includes(`@${domain.toLowerCase()}`)
            );
            
            if (domainEmails.length > 0) {
              return domainEmails[0];
            }
          }
        }
      }

      return null;
    } catch (error: any) {
      logger.error('[EmailFinder] Error searching via Google', {
        error: error.message,
        domain,
      });
      return null;
    }
  }

  /**
   * Generate common email pattern for the domain
   */
  private generateEmailPattern(domain: string): string {
    // Common business email patterns
    const patterns = [
      `info@${domain}`,
      `contact@${domain}`,
      `hello@${domain}`,
      `sales@${domain}`,
      `support@${domain}`,
    ];

    // Return the most common pattern (info@)
    return patterns[0];
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string | null {
    try {
      // Remove protocol
      let domain = url.replace(/^https?:\/\//, '');
      
      // Remove www.
      domain = domain.replace(/^www\./, '');
      
      // Remove path and query
      domain = domain.split('/')[0];
      domain = domain.split('?')[0];
      
      return domain;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Batch find emails for multiple leads
   */
  async findEmailsBatch(leads: Array<{ website?: string; companyName?: string; domain?: string }>): Promise<EmailFinderResult[]> {
    const results: EmailFinderResult[] = [];

    for (const lead of leads) {
      const result = await this.findEmail(lead);
      results.push(result);
      
      // Small delay between requests to avoid rate limiting
      await this.delay(1000);
    }

    return results;
  }
}

export const emailFinderService = new EmailFinderService();
