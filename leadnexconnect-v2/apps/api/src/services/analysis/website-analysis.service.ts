import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../../utils/logger';
import { db } from '@leadnex/database';
import { websiteAnalysisCache } from '@leadnex/database';
import { eq } from 'drizzle-orm';

interface WebsiteAnalysisResult {
  hasBookingKeywords: boolean;
  bookingKeywordScore: number;
  currentBookingTool: string | null;
  hasAppointmentForm: boolean;
  hasCalendar: boolean;
  hasPricing: boolean;
  hasGallery: boolean;
  hasReviews: boolean;
  hasContactForm: boolean;
  hasPhoneOnly: boolean;
  multiLocation: boolean;
  servicesCount: number;
  languageSupport: string[];
}

export class WebsiteAnalysisService {
  private readonly CACHE_DURATION_DAYS = 30;
  
  private bookingKeywords = {
    strong: ['book now', 'book online', 'schedule appointment', 'reserve now', 'book appointment'],
    medium: ['schedule', 'appointment', 'reservation', 'booking', 'availability'],
    weak: ['contact us', 'call us', 'get in touch'],
  };

  private bookingTools = {
    calendly: /calendly\.com|calendly\.js/i,
    acuity: /acuityscheduling\.com/i,
    square: /squareup\.com|square\.site/i,
    booksy: /booksy\.com/i,
    mindbody: /mindbodyonline\.com/i,
    setmore: /setmore\.com/i,
    simplybook: /simplybook\.me/i,
    vagaro: /vagaro\.com/i,
  };

  /**
   * Analyze website with caching
   */
  async analyzeWebsite(url: string): Promise<WebsiteAnalysisResult | null> {
    try {
      const domain = new URL(url).hostname;

      // Check cache first
      const cached = await this.getCachedAnalysis(domain);
      if (cached) {
        logger.info('[WebsiteAnalysis] Using cached result', { domain });
        return cached;
      }

      // Fetch and analyze
      logger.info('[WebsiteAnalysis] Analyzing website', { url });
      
      const html = await this.fetchWebsite(url);
      const analysis = this.performAnalysis(html);

      // Cache result
      await this.cacheAnalysis(domain, analysis);

      return analysis;
    } catch (error: any) {
      logger.error('[WebsiteAnalysis] Error analyzing website', {
        url,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Fetch website HTML
   */
  private async fetchWebsite(url: string): Promise<string> {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LeadNexBot/1.0)',
      },
      maxRedirects: 3,
    });

    return response.data;
  }

  /**
   * Perform comprehensive website analysis
   */
  private performAnalysis(html: string): WebsiteAnalysisResult {
    const $ = cheerio.load(html);
    const text = $('body').text().toLowerCase();
    const htmlLower = html.toLowerCase();

    return {
      hasBookingKeywords: this.detectBookingKeywords(text).found,
      bookingKeywordScore: this.detectBookingKeywords(text).score,
      currentBookingTool: this.detectBookingTool(htmlLower),
      hasAppointmentForm: this.detectAppointmentForm($),
      hasCalendar: this.detectCalendar(htmlLower),
      hasPricing: this.detectPricing($),
      hasGallery: this.detectGallery($),
      hasReviews: this.detectReviews($),
      hasContactForm: this.detectContactForm($),
      hasPhoneOnly: this.detectPhoneOnly(text, htmlLower),
      multiLocation: this.detectMultiLocation(text),
      servicesCount: this.countServices($),
      languageSupport: this.detectLanguages($),
    };
  }

  /**
   * Detect booking keywords with weighted scoring
   */
  private detectBookingKeywords(text: string): { found: boolean; score: number } {
    let score = 0;

    // Strong signals (3 points each)
    for (const keyword of this.bookingKeywords.strong) {
      if (text.includes(keyword)) {
        score += 3;
      }
    }

    // Medium signals (2 points each)
    for (const keyword of this.bookingKeywords.medium) {
      if (text.includes(keyword)) {
        score += 2;
      }
    }

    // Weak signals (1 point each)
    for (const keyword of this.bookingKeywords.weak) {
      if (text.includes(keyword)) {
        score += 1;
      }
    }

    return {
      found: score > 0,
      score: Math.min(score, 10), // Cap at 10
    };
  }

  /**
   * Detect current booking tool
   */
  private detectBookingTool(html: string): string | null {
    for (const [tool, regex] of Object.entries(this.bookingTools)) {
      if (regex.test(html)) {
        return tool;
      }
    }
    return null;
  }

  /**
   * Detect appointment form
   */
  private detectAppointmentForm($: cheerio.CheerioAPI): boolean {
    const forms = $('form');
    let hasAppointmentForm = false;

    forms.each((_, form) => {
      const formText = $(form).text().toLowerCase();
      if (formText.includes('appointment') || 
          formText.includes('booking') || 
          formText.includes('schedule')) {
        hasAppointmentForm = true;
      }
    });

    return hasAppointmentForm;
  }

  /**
   * Detect calendar widget
   */
  private detectCalendar(html: string): boolean {
    const calendarIndicators = [
      'fullcalendar',
      'datepicker',
      'calendar-widget',
      'booking-calendar',
      'schedule-calendar',
    ];

    return calendarIndicators.some(indicator => html.includes(indicator));
  }

  /**
   * Detect pricing information
   */
  private detectPricing($: cheerio.CheerioAPI): boolean {
    const text = $('body').text().toLowerCase();
    return text.includes('$') || 
           text.includes('price') || 
           text.includes('pricing') ||
           text.includes('cost');
  }

  /**
   * Detect gallery
   */
  private detectGallery($: cheerio.CheerioAPI): boolean {
    const images = $('img');
    return images.length > 5; // More than 5 images suggests gallery
  }

  /**
   * Detect reviews/testimonials
   */
  private detectReviews($: cheerio.CheerioAPI): boolean {
    const text = $('body').text().toLowerCase();
    return text.includes('review') || 
           text.includes('testimonial') || 
           text.includes('rating');
  }

  /**
   * Detect contact form
   */
  private detectContactForm($: cheerio.CheerioAPI): boolean {
    const forms = $('form');
    let hasContactForm = false;

    forms.each((_, form) => {
      const formText = $(form).text().toLowerCase();
      if (formText.includes('contact') || 
          formText.includes('message') || 
          formText.includes('inquiry')) {
        hasContactForm = true;
      }
    });

    return hasContactForm;
  }

  /**
   * Detect if business only shows phone (no online booking)
   */
  private detectPhoneOnly(text: string, html: string): boolean {
    const hasPhone = /\d{3}[-\.\s]?\d{3}[-\.\s]?\d{4}/.test(text);
    const noOnlineBooking = !this.detectBookingKeywords(text).found && 
                            !this.detectBookingTool(html);
    
    return hasPhone && noOnlineBooking;
  }

  /**
   * Detect multi-location business
   */
  private detectMultiLocation(text: string): boolean {
    const multiLocationKeywords = [
      'locations',
      'branches',
      'multiple locations',
      'visit us at',
      'find a location',
    ];

    return multiLocationKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Count services offered
   */
  private countServices($: cheerio.CheerioAPI): number {
    const serviceIndicators = [
      'service',
      'treatment',
      'class',
      'session',
      'package',
    ];

    let count = 0;
    serviceIndicators.forEach(indicator => {
      const matches = $('body').text().toLowerCase().match(new RegExp(indicator, 'g'));
      if (matches) {
        count += Math.min(matches.length, 10); // Cap at 10 per indicator
      }
    });

    return Math.min(Math.floor(count / 3), 50); // Average and cap at 50
  }

  /**
   * Detect language support
   */
  private detectLanguages($: cheerio.CheerioAPI): string[] {
    const languages: string[] = [];
    const lang = $('html').attr('lang');
    
    if (lang) {
      languages.push(lang);
    }

    // Check for language switcher
    const languageSwitcher = $('.language-switcher, .lang-switcher, [class*="language"]');
    if (languageSwitcher.length > 0) {
      languages.push('multi-language');
    }

    return languages.length > 0 ? languages : ['en'];
  }

  /**
   * Get cached analysis
   */
  private async getCachedAnalysis(domain: string): Promise<WebsiteAnalysisResult | null> {
    try {
      const cached = await db
        .select()
        .from(websiteAnalysisCache)
        .where(eq(websiteAnalysisCache.domain, domain))
        .limit(1);

      if (cached.length === 0) return null;

      const cache = cached[0];
      const now = new Date();
      const expiresAt = cache.expiresAt ? new Date(cache.expiresAt) : null;

      // Check if cache expired
      if (expiresAt && now > expiresAt) {
        return null;
      }

      return {
        hasBookingKeywords: cache.hasBookingKeywords!,
        bookingKeywordScore: cache.bookingKeywordScore!,
        currentBookingTool: cache.currentBookingTool!,
        hasAppointmentForm: cache.hasAppointmentForm!,
        hasCalendar: cache.hasCalendar!,
        hasPricing: cache.hasPricing!,
        hasGallery: cache.hasGallery!,
        hasReviews: cache.hasReviews!,
        hasContactForm: cache.hasContactForm!,
        hasPhoneOnly: cache.hasPhoneOnly!,
        multiLocation: cache.multiLocation!,
        servicesCount: cache.servicesCount!,
        languageSupport: cache.languageSupport!,
      };
    } catch (error: any) {
      logger.error('[WebsiteAnalysis] Error getting cached analysis', {
        domain,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Cache analysis result
   */
  private async cacheAnalysis(domain: string, analysis: WebsiteAnalysisResult): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.CACHE_DURATION_DAYS);

      await db
        .insert(websiteAnalysisCache)
        .values({
          domain,
          ...analysis,
          analysisData: analysis as any,
          expiresAt,
        })
        .onConflictDoUpdate({
          target: websiteAnalysisCache.domain,
          set: {
            ...analysis,
            analysisData: analysis as any,
            lastAnalyzedAt: new Date(),
            expiresAt,
          },
        });
    } catch (error: any) {
      logger.error('[WebsiteAnalysis] Error caching analysis', {
        domain,
        error: error.message,
      });
    }
  }
}

export const websiteAnalysisService = new WebsiteAnalysisService();
