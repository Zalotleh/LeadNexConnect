# 🚀 LeadNexConnect v2 - Complete Enhancement Implementation Roadmap

## 📋 Overview

This document provides **step-by-step instructions** for an AI coding agent to enhance LeadNexConnect v2 with advanced lead qualification, smart routing, API performance tracking, and a complete UI for BookNex Solutions' lead generation needs.

**Repository:** https://github.com/Zalotleh/LeadNexConnect/tree/main/leadnexconnect-v2

---

## 🎯 Business Context

**BookNex Solutions** (https://www.booknexsolutions.com) is a SaaS booking platform targeting 10 industries:
1. Spa & Salons
2. Tours & Activities Operators
3. Repair Centers
4. Private Salons
5. Medical/Health Services
6. Gym/Sport & Fitness
7. Educational Services (Tutors)
8. Consultants
9. Beauty & Wellness
10. Individual Activity Organizers

**Value Proposition:**
- 24/7 booking automation
- 120% revenue increase
- 60% no-show reduction
- 5-10 hours saved weekly
- Starting at $9.99/month

**Lead Generation Goal:**
- Maximize free tier API usage (Apollo, Hunter, Google Places, LinkedIn)
- Generate 1,950+ leads/month at $0 cost
- Smart qualification to prioritize high-potential leads
- Track API performance to determine which to upgrade

---

## 📊 Current Implementation Status

Based on CLAUDE_CODE_INSTRUCTIONS.md and project structure:

**✅ Already Complete:**
- Express.js API with TypeScript
- PostgreSQL schema with 8 tables
- Drizzle ORM setup
- Apollo.io integration
- Hunter.io integration
- Google Places integration (partial)
- LinkedIn CSV import
- Basic email generation & sending
- Lead scoring (basic)
- Winston logging
- PM2 deployment config

**⏳ Needs Implementation:**
- Enhanced lead scoring algorithm
- Website analysis module
- Smart lead routing
- API performance tracking
- Advanced web scraping
- Automation jobs (cron)
- Complete frontend UI
- Analytics dashboard
- Campaign management UI

---

## 🗺️ Implementation Phases

### **Phase 1: Database Schema Enhancements** (Priority: HIGH)
### **Phase 2: Enhanced Lead Qualification System** (Priority: HIGH)
### **Phase 3: API Performance Tracking** (Priority: HIGH)
### **Phase 4: Smart Lead Routing** (Priority: MEDIUM)
### **Phase 5: Complete Frontend UI** (Priority: HIGH)
### **Phase 6: Automation & Jobs** (Priority: MEDIUM)
### **Phase 7: Testing & Documentation** (Priority: HIGH)

---

# PHASE 1: Database Schema Enhancements

## Step 1.1: Update Leads Table Schema

**File:** `packages/database/src/schema/index.ts`

**Action:** ADD these new columns to the existing `leads` table:

```typescript
// Add to existing leads table
export const leads = pgTable('leads', {
  // ... existing columns ...
  
  // NEW: Digital Presence Indicators
  hasGoogleMapsListing: boolean('has_google_maps_listing').default(false),
  googleRating: decimal('google_rating', { precision: 3, scale: 2 }),
  googleReviewCount: integer('google_review_count').default(0),
  
  // NEW: Website Analysis
  hasBookingKeywords: boolean('has_booking_keywords').default(false),
  bookingKeywordScore: integer('booking_keyword_score').default(0),
  currentBookingTool: varchar('current_booking_tool', { length: 100 }),
  hasAppointmentForm: boolean('has_appointment_form').default(false),
  hasOnlineBooking: boolean('has_online_booking').default(false),
  hasMultiLocation: boolean('has_multi_location').default(false),
  servicesCount: integer('services_count').default(0),
  
  // NEW: Qualification Signals
  bookingPotential: varchar('booking_potential', { length: 20 }).default('medium'), // low, medium, high
  digitalMaturityScore: integer('digital_maturity_score').default(0),
  isDecisionMaker: boolean('is_decision_maker').default(false),
  
  // NEW: Business Intelligence
  hasWeekendHours: boolean('has_weekend_hours'),
  responseTime: varchar('response_time', { length: 50 }),
  priceLevel: integer('price_level'), // From Google Places (1-4)
  
  // ... existing timestamps ...
});
```

---

## Step 1.2: Create API Performance Tracking Tables

**File:** `packages/database/src/schema/index.ts`

**Action:** ADD these new tables after existing tables:

```typescript
// API Performance Tracking
export const apiPerformance = pgTable('api_performance', {
  id: uuid('id').defaultRandom().primaryKey(),
  apiSource: varchar('api_source', { length: 50 }).notNull(), // apollo, hunter, google_places, linkedin
  
  // Metrics
  leadsGenerated: integer('leads_generated').default(0),
  leadsConverted: integer('leads_converted').default(0),
  emailsFound: integer('emails_found').default(0),
  emailsVerified: integer('emails_verified').default(0),
  
  // Quality Metrics
  avgLeadScore: decimal('avg_lead_score', { precision: 5, scale: 2 }),
  hotLeadsPercent: decimal('hot_leads_percent', { precision: 5, scale: 2 }),
  warmLeadsPercent: decimal('warm_leads_percent', { precision: 5, scale: 2 }),
  
  // Conversion Tracking
  demosBooked: integer('demos_booked').default(0),
  trialsStarted: integer('trials_started').default(0),
  customersConverted: integer('customers_converted').default(0),
  
  // Cost Analysis
  apiCallsUsed: integer('api_calls_used').default(0),
  apiCallsLimit: integer('api_calls_limit'),
  costPerLead: decimal('cost_per_lead', { precision: 10, scale: 2 }),
  
  // Time Period
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  
  createdAt: timestamp('created_at').defaultNow(),
});

// Lead Source ROI Tracking
export const leadSourceRoi = pgTable('lead_source_roi', {
  id: uuid('id').defaultRandom().primaryKey(),
  leadId: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  source: varchar('source', { length: 50 }).notNull(),
  
  // Journey Tracking
  firstContactAt: timestamp('first_contact_at'),
  demoBookedAt: timestamp('demo_booked_at'),
  trialStartedAt: timestamp('trial_started_at'),
  convertedAt: timestamp('converted_at'),
  
  // Revenue
  planType: varchar('plan_type', { length: 50 }), // basic, business, premium
  mrr: decimal('mrr', { precision: 10, scale: 2 }),
  lifetimeValue: decimal('lifetime_value', { precision: 10, scale: 2 }),
  
  // Attribution
  attributedSource: varchar('attributed_source', { length: 50 }),
  conversionTimeDays: integer('conversion_time_days'),
  
  createdAt: timestamp('created_at').defaultNow(),
});

// Website Analysis Cache
export const websiteAnalysisCache = pgTable('website_analysis_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  domain: varchar('domain', { length: 255 }).notNull().unique(),
  
  // Analysis Results
  hasBookingKeywords: boolean('has_booking_keywords'),
  bookingKeywordScore: integer('booking_keyword_score'),
  currentBookingTool: varchar('current_booking_tool', { length: 100 }),
  hasAppointmentForm: boolean('has_appointment_form'),
  hasCalendar: boolean('has_calendar'),
  hasPricing: boolean('has_pricing'),
  hasGallery: boolean('has_gallery'),
  hasReviews: boolean('has_reviews'),
  hasContactForm: boolean('has_contact_form'),
  hasPhoneOnly: boolean('has_phone_only'),
  multiLocation: boolean('multi_location'),
  servicesCount: integer('services_count'),
  languageSupport: varchar('language_support', { length: 255 }).array(),
  
  // Raw Data
  analysisData: jsonb('analysis_data'),
  
  // Cache Control
  lastAnalyzedAt: timestamp('last_analyzed_at').defaultNow(),
  expiresAt: timestamp('expires_at'), // Cache for 30 days
  
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## Step 1.3: Generate Database Migration

**Command to run:**

```bash
cd packages/database
npm run db:generate
```

**This will create:** `packages/database/src/migrations/0002_add_enhanced_fields.sql`

---

## Step 1.4: Apply Migration

**Command to run:**

```bash
npm run db:migrate
```

---

# PHASE 2: Enhanced Lead Qualification System

## Step 2.1: Create Enhanced Lead Scoring Service

**File:** `apps/api/src/services/crm/lead-scoring-v2.service.ts` (NEW FILE)

**Action:** CREATE this file with the following content:

```typescript
import { logger } from '../../utils/logger';
import type { Lead } from '@leadnex/shared';

interface ScoringWeights {
  emailVerified: number;
  websiteExists: number;
  phoneNumber: number;
  linkedinProfile: number;
  companySizeMatch: number;
  googleRating: number;
  googleReviews: number;
  bookingKeywords: number;
  currentBookingTool: number;
  multiLocation: number;
  isDecisionMaker: number;
}

export class LeadScoringV2Service {
  private weights: ScoringWeights = {
    emailVerified: 25,        // Critical for outreach
    websiteExists: 15,        // Shows digital presence
    phoneNumber: 5,           // Additional contact method
    linkedinProfile: 10,      // Professional presence
    companySizeMatch: 15,     // Perfect size for BookNex
    googleRating: 5,          // Business quality indicator
    googleReviews: 5,         // Active business
    bookingKeywords: 10,      // Already thinking about bookings
    currentBookingTool: 5,    // Competitor switch opportunity
    multiLocation: 5,         // Premium plan potential
    isDecisionMaker: 10,      // Can make purchase decision
  };

  /**
   * Calculate comprehensive lead score (0-100)
   */
  calculateScore(lead: Partial<Lead>): number {
    let score = 0;

    // 1. EMAIL QUALITY (25 points max)
    if (lead.email) {
      score += 10;
      if (lead.verificationStatus === 'email_verified' || 
          lead.verificationStatus === 'fully_verified') {
        score += this.weights.emailVerified - 10;
      }
    }

    // 2. WEBSITE PRESENCE (15 points max)
    if (lead.website) {
      score += this.weights.websiteExists;
    }

    // 3. PHONE NUMBER (5 points)
    if (lead.phone) {
      score += this.weights.phoneNumber;
    }

    // 4. LINKEDIN PROFILE (10 points)
    if (lead.source === 'linkedin' || lead.linkedinUrl) {
      score += this.weights.linkedinProfile;
    }

    // 5. COMPANY SIZE MATCH (15 points)
    if (this.isTargetCompanySize(lead.companySize)) {
      score += this.weights.companySizeMatch;
    }

    // 6. GOOGLE RATING & REVIEWS (10 points max)
    if (lead.googleRating) {
      if (lead.googleRating >= 4.5) {
        score += 5;
      } else if (lead.googleRating >= 4.0) {
        score += 3;
      } else if (lead.googleRating >= 3.5) {
        score += 2;
      }
    }

    if (lead.googleReviewCount) {
      if (lead.googleReviewCount >= 50) {
        score += 5;
      } else if (lead.googleReviewCount >= 20) {
        score += 3;
      } else if (lead.googleReviewCount >= 10) {
        score += 2;
      }
    }

    // 7. BOOKING KEYWORDS (10 points)
    if (lead.hasBookingKeywords) {
      score += this.weights.bookingKeywords;
    }

    // 8. CURRENT BOOKING TOOL (5 points)
    // Competitor users are good prospects
    if (lead.currentBookingTool) {
      score += this.weights.currentBookingTool;
    }

    // 9. MULTI-LOCATION (5 points)
    if (lead.hasMultiLocation) {
      score += this.weights.multiLocation;
    }

    // 10. IS DECISION MAKER (10 points)
    if (lead.isDecisionMaker) {
      score += this.weights.isDecisionMaker;
    }

    const finalScore = Math.min(score, 100);

    logger.debug('[LeadScoringV2] Calculated score', {
      companyName: lead.companyName,
      score: finalScore,
      breakdown: {
        email: lead.email ? (lead.verificationStatus === 'email_verified' ? 25 : 10) : 0,
        website: lead.website ? 15 : 0,
        phone: lead.phone ? 5 : 0,
        linkedin: (lead.source === 'linkedin' || lead.linkedinUrl) ? 10 : 0,
        companySize: this.isTargetCompanySize(lead.companySize) ? 15 : 0,
        rating: this.calculateRatingScore(lead.googleRating, lead.googleReviewCount),
        bookingKeywords: lead.hasBookingKeywords ? 10 : 0,
        bookingTool: lead.currentBookingTool ? 5 : 0,
        multiLocation: lead.hasMultiLocation ? 5 : 0,
        decisionMaker: lead.isDecisionMaker ? 10 : 0,
      },
    });

    return finalScore;
  }

  /**
   * Calculate digital maturity score (0-100)
   */
  calculateDigitalMaturity(lead: Partial<Lead>): number {
    let score = 0;

    if (lead.website) score += 30;
    if (lead.hasGoogleMapsListing) score += 20;
    if (lead.hasOnlineBooking) score += 25;
    if (lead.googleReviewCount && lead.googleReviewCount >= 20) score += 15;
    if (lead.servicesCount && lead.servicesCount >= 5) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Classify lead tier
   */
  classifyLeadTier(score: number): 'hot' | 'warm' | 'cold' {
    if (score >= 80) return 'hot';
    if (score >= 60) return 'warm';
    return 'cold';
  }

  /**
   * Calculate booking potential
   */
  calculateBookingPotential(lead: Partial<Lead>): 'high' | 'medium' | 'low' {
    let potentialScore = 0;

    // Already has booking keywords
    if (lead.hasBookingKeywords) potentialScore += 30;
    
    // Has website (can integrate)
    if (lead.website) potentialScore += 25;
    
    // Good reputation
    if (lead.googleRating && lead.googleRating >= 4.0) potentialScore += 20;
    
    // Active business
    if (lead.googleReviewCount && lead.googleReviewCount >= 20) potentialScore += 15;
    
    // Right size
    if (this.isTargetCompanySize(lead.companySize)) potentialScore += 10;

    if (potentialScore >= 70) return 'high';
    if (potentialScore >= 40) return 'medium';
    return 'low';
  }

  /**
   * Check if company size is in target range
   */
  private isTargetCompanySize(size?: string): boolean {
    const targetSizes = ['1-10', '11-50', '51-200'];
    return size ? targetSizes.includes(size) : false;
  }

  /**
   * Calculate rating score component
   */
  private calculateRatingScore(rating?: number, reviewCount?: number): number {
    let score = 0;

    if (rating) {
      if (rating >= 4.5) score += 5;
      else if (rating >= 4.0) score += 3;
      else if (rating >= 3.5) score += 2;
    }

    if (reviewCount) {
      if (reviewCount >= 50) score += 5;
      else if (reviewCount >= 20) score += 3;
      else if (reviewCount >= 10) score += 2;
    }

    return score;
  }
}

export const leadScoringV2Service = new LeadScoringV2Service();
```

---

## Step 2.2: Create Website Analysis Service

**File:** `apps/api/src/services/analysis/website-analysis.service.ts` (NEW FILE)

**Action:** CREATE this file:

```typescript
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
    const cached = await db
      .select()
      .from(websiteAnalysisCache)
      .where(eq(websiteAnalysisCache.domain, domain))
      .limit(1);

    if (cached.length === 0) return null;

    const cache = cached[0];
    const now = new Date();
    const expiresAt = new Date(cache.expiresAt!);

    // Check if cache expired
    if (now > expiresAt) {
      return null;
    }

    return {
      hasBookingKeywords: cache.hasBookingKeywords!,
      bookingKeywordScore: cache.bookingKeywordScore!,
      currentBookingTool: cache.currentBookingTool,
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
  }

  /**
   * Cache analysis result
   */
  private async cacheAnalysis(domain: string, analysis: WebsiteAnalysisResult): Promise<void> {
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
  }
}

export const websiteAnalysisService = new WebsiteAnalysisService();
```

---

## Step 2.3: Update Leads Controller with Enhanced Processing

**File:** `apps/api/src/controllers/leads.controller.ts`

**Action:** MODIFY the `generateLeads` method to use enhanced scoring:

```typescript
// Add imports at top
import { leadScoringV2Service } from '../services/crm/lead-scoring-v2.service';
import { websiteAnalysisService } from '../services/analysis/website-analysis.service';

// Replace existing generateLeads method
async generateLeads(req: Request, res: Response) {
  try {
    const { industry, country, city, maxResults = 50, sources } = req.body;

    logger.info('[LeadsController] Generating leads', { body: req.body });

    const allLeads: any[] = [];

    // Generate from each source (existing code)
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

    // NEW: Enhanced processing
    logger.info('[LeadsController] Processing leads with enhancements');

    // Deduplicate
    const deduped = await this.deduplicateLeads(allLeads);

    // Analyze websites
    for (const lead of deduped) {
      if (lead.website) {
        const analysis = await websiteAnalysisService.analyzeWebsite(lead.website);
        if (analysis) {
          lead.hasBookingKeywords = analysis.hasBookingKeywords;
          lead.bookingKeywordScore = analysis.bookingKeywordScore;
          lead.currentBookingTool = analysis.currentBookingTool;
          lead.hasAppointmentForm = analysis.hasAppointmentForm;
          lead.hasOnlineBooking = analysis.hasBookingKeywords || analysis.currentBookingTool;
          lead.hasMultiLocation = analysis.multiLocation;
          lead.servicesCount = analysis.servicesCount;
        }
      }
    }

    // Calculate enhanced scores
    const scored = deduped.map(lead => {
      const qualityScore = leadScoringV2Service.calculateScore(lead);
      const digitalMaturityScore = leadScoringV2Service.calculateDigitalMaturity(lead);
      const bookingPotential = leadScoringV2Service.calculateBookingPotential(lead);
      
      return {
        ...lead,
        qualityScore,
        digitalMaturityScore,
        bookingPotential,
      };
    });

    // Save to database
    const saved = [];
    for (const lead of scored) {
      const result = await db.insert(leads).values(lead).returning();
      saved.push(result[0]);
    }

    // Classify by tier
    const hot = saved.filter(l => l.qualityScore >= 80);
    const warm = saved.filter(l => l.qualityScore >= 60 && l.qualityScore < 80);
    const cold = saved.filter(l => l.qualityScore < 60);

    res.json({
      success: true,
      data: {
        leads: saved,
        summary: {
          total: allLeads.length,
          newLeads: saved.length,
          duplicatesSkipped: allLeads.length - saved.length,
          byTier: {
            hot: hot.length,
            warm: warm.length,
            cold: cold.length,
          },
          bySource: this.countBySource(allLeads),
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

// Helper method
private countBySource(leads: any[]): Record<string, number> {
  const counts: Record<string, number> = {};
  leads.forEach(lead => {
    counts[lead.source] = (counts[lead.source] || 0) + 1;
  });
  return counts;
}
```

---

# PHASE 3: API Performance Tracking

## Step 3.1: Create API Performance Service

**File:** `apps/api/src/services/tracking/api-performance.service.ts` (NEW FILE)

**Action:** CREATE this file:

```typescript
import { db } from '@leadnex/database';
import { apiPerformance, leadSourceRoi } from '@leadnex/database';
import { eq, and, gte, lte } from 'drizzle-orm';
import { logger } from '../../utils/logger';

interface APIUsageLog {
  apiSource: string;
  leadsGenerated: number;
  apiCallsUsed: number;
}

export class APIPerformanceService {
  /**
   * Log API usage
   */
  async logAPIUsage(log: APIUsageLog): Promise<void> {
    try {
      const today = new Date();
      const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // Check if record exists for this month
      const existing = await db
        .select()
        .from(apiPerformance)
        .where(
          and(
            eq(apiPerformance.apiSource, log.apiSource),
            eq(apiPerformance.periodStart, periodStart),
            eq(apiPerformance.periodEnd, periodEnd)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        await db
          .update(apiPerformance)
          .set({
            leadsGenerated: existing[0].leadsGenerated + log.leadsGenerated,
            apiCallsUsed: existing[0].apiCallsUsed + log.apiCallsUsed,
          })
          .where(eq(apiPerformance.id, existing[0].id));
      } else {
        // Create new record
        const limits: Record<string, number> = {
          apollo: 100,
          hunter: 50,
          google_places: 40000,
          peopledatalabs: 100,
        };

        await db.insert(apiPerformance).values({
          apiSource: log.apiSource,
          leadsGenerated: log.leadsGenerated,
          apiCallsUsed: log.apiCallsUsed,
          apiCallsLimit: limits[log.apiSource] || 0,
          periodStart,
          periodEnd,
        });
      }

      logger.info('[APIPerformance] Logged API usage', { log });
    } catch (error: any) {
      logger.error('[APIPerformance] Error logging API usage', {
        error: error.message,
      });
    }
  }

  /**
   * Get monthly performance report
   */
  async getMonthlyReport(month?: Date): Promise<any> {
    const targetMonth = month || new Date();
    const periodStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const periodEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);

    const records = await db
      .select()
      .from(apiPerformance)
      .where(
        and(
          gte(apiPerformance.periodStart, periodStart),
          lte(apiPerformance.periodEnd, periodEnd)
        )
      );

    const report: Record<string, any> = {};

    for (const record of records) {
      const quotaPercent = record.apiCallsLimit 
        ? (record.apiCallsUsed / record.apiCallsLimit) * 100 
        : 0;

      report[record.apiSource] = {
        leadsGenerated: record.leadsGenerated,
        apiCallsUsed: record.apiCallsUsed,
        apiCallsLimit: record.apiCallsLimit,
        quotaPercent: Math.round(quotaPercent),
        avgLeadScore: record.avgLeadScore ? Number(record.avgLeadScore) : 0,
        hotLeadsPercent: record.hotLeadsPercent ? Number(record.hotLeadsPercent) : 0,
        demosBooked: record.demosBooked,
        trialsStarted: record.trialsStarted,
        customersConverted: record.customersConverted,
        costPerLead: record.costPerLead ? Number(record.costPerLead) : 0,
      };
    }

    return report;
  }

  /**
   * Update conversion metrics
   */
  async updateConversionMetrics(
    apiSource: string,
    metrics: {
      demosBooked?: number;
      trialsStarted?: number;
      customersConverted?: number;
    }
  ): Promise<void> {
    try {
      const today = new Date();
      const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const existing = await db
        .select()
        .from(apiPerformance)
        .where(
          and(
            eq(apiPerformance.apiSource, apiSource),
            eq(apiPerformance.periodStart, periodStart),
            eq(apiPerformance.periodEnd, periodEnd)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(apiPerformance)
          .set({
            demosBooked: (existing[0].demosBooked || 0) + (metrics.demosBooked || 0),
            trialsStarted: (existing[0].trialsStarted || 0) + (metrics.trialsStarted || 0),
            customersConverted: (existing[0].customersConverted || 0) + (metrics.customersConverted || 0),
          })
          .where(eq(apiPerformance.id, existing[0].id));
      }

      logger.info('[APIPerformance] Updated conversion metrics', {
        apiSource,
        metrics,
      });
    } catch (error: any) {
      logger.error('[APIPerformance] Error updating conversion metrics', {
        error: error.message,
      });
    }
  }

  /**
   * Track lead source ROI
   */
  async trackLeadROI(leadId: string, data: {
    source: string;
    demoBookedAt?: Date;
    trialStartedAt?: Date;
    convertedAt?: Date;
    planType?: string;
    mrr?: number;
  }): Promise<void> {
    try {
      await db.insert(leadSourceRoi).values({
        leadId,
        source: data.source,
        demoBookedAt: data.demoBookedAt,
        trialStartedAt: data.trialStartedAt,
        convertedAt: data.convertedAt,
        planType: data.planType,
        mrr: data.mrr?.toString(),
        attributedSource: data.source,
      });

      logger.info('[APIPerformance] Tracked lead ROI', { leadId, data });
    } catch (error: any) {
      logger.error('[APIPerformance] Error tracking lead ROI', {
        error: error.message,
      });
    }
  }
}

export const apiPerformanceService = new APIPerformanceService();
```

---

## Step 3.2: Integrate Performance Tracking in Lead Generation

**File:** `apps/api/src/controllers/leads.controller.ts`

**Action:** ADD tracking calls after lead generation:

```typescript
// Add import
import { apiPerformanceService } from '../services/tracking/api-performance.service';

// In generateLeads method, AFTER saving leads to database:

// Track API performance
const sourceMetrics: Record<string, { leads: number; calls: number }> = {};

sources.forEach((source: string) => {
  const sourceLeads = saved.filter(l => l.source === source);
  sourceMetrics[source] = {
    leads: sourceLeads.length,
    calls: source === 'apollo' ? 10 : source === 'google_places' ? 50 : 0,
  };
});

// Log usage for each source
for (const [source, metrics] of Object.entries(sourceMetrics)) {
  if (metrics.leads > 0) {
    await apiPerformanceService.logAPIUsage({
      apiSource: source,
      leadsGenerated: metrics.leads,
      apiCallsUsed: metrics.calls,
    });
  }
}
```

---

## Step 3.3: Create API Performance Controller

**File:** `apps/api/src/controllers/api-performance.controller.ts` (NEW FILE)

**Action:** CREATE this file:

```typescript
import { Request, Response } from 'express';
import { apiPerformanceService } from '../services/tracking/api-performance.service';
import { logger } from '../utils/logger';

export class APIPerformanceController {
  /**
   * GET /api/performance/report - Get monthly API performance report
   */
  async getMonthlyReport(req: Request, res: Response) {
    try {
      const { month, year } = req.query;
      
      const targetDate = month && year 
        ? new Date(Number(year), Number(month) - 1, 1)
        : new Date();

      const report = await apiPerformanceService.getMonthlyReport(targetDate);

      res.json({
        success: true,
        data: {
          period: {
            month: targetDate.getMonth() + 1,
            year: targetDate.getFullYear(),
          },
          performance: report,
        },
      });
    } catch (error: any) {
      logger.error('[APIPerformanceController] Error getting report', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/performance/conversion - Update conversion metrics
   */
  async updateConversion(req: Request, res: Response) {
    try {
      const { leadId, apiSource, type } = req.body;

      const metrics: Record<string, any> = {};
      
      if (type === 'demo') {
        metrics.demosBooked = 1;
      } else if (type === 'trial') {
        metrics.trialsStarted = 1;
      } else if (type === 'customer') {
        metrics.customersConverted = 1;
      }

      await apiPerformanceService.updateConversionMetrics(apiSource, metrics);

      res.json({
        success: true,
        message: 'Conversion tracked successfully',
      });
    } catch (error: any) {
      logger.error('[APIPerformanceController] Error updating conversion', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }
}

export const apiPerformanceController = new APIPerformanceController();
```

---

## Step 3.4: Create API Performance Routes

**File:** `apps/api/src/routes/api-performance.routes.ts` (NEW FILE)

**Action:** CREATE this file:

```typescript
import { Router } from 'express';
import { apiPerformanceController } from '../controllers/api-performance.controller';

const router = Router();

router.get('/report', (req, res) => apiPerformanceController.getMonthlyReport(req, res));
router.post('/conversion', (req, res) => apiPerformanceController.updateConversion(req, res));

export default router;
```

---

## Step 3.5: Register Performance Routes

**File:** `apps/api/src/index.ts`

**Action:** ADD this import and route:

```typescript
// Add import
import apiPerformanceRoutes from './routes/api-performance.routes';

// Add route (after existing routes)
app.use('/api/performance', apiPerformanceRoutes);
```

---

# PHASE 4: Smart Lead Routing

## Step 4.1: Create Lead Routing Service

**File:** `apps/api/src/services/outreach/lead-routing.service.ts` (NEW FILE)

**Action:** CREATE this file:

```typescript
import { logger } from '../../utils/logger';
import type { Lead } from '@leadnex/shared';

interface RoutingDecision {
  campaign: string;
  template: string;
  followUpSequence: string;
  priority: 'high' | 'medium' | 'low';
  reasoning: string[];
}

export class LeadRoutingService {
  /**
   * Determine optimal routing for a lead
   */
  routeLead(lead: Partial<Lead>): RoutingDecision {
    const reasoning: string[] = [];

    // SCENARIO 1: No website → QR code campaign
    if (!lead.website) {
      reasoning.push('No website detected');
      reasoning.push('Offer simple booking link + QR code');
      
      return {
        campaign: 'no-website-qr-code',
        template: 'simple-booking-link',
        followUpSequence: 'educational-nurture',
        priority: 'medium',
        reasoning,
      };
    }

    // SCENARIO 2: Has competitor tool → switch campaign
    if (lead.currentBookingTool) {
      reasoning.push(`Currently using ${lead.currentBookingTool}`);
      reasoning.push('Focus on competitive advantages');
      
      return {
        campaign: 'competitor-switch',
        template: `switch-from-${lead.currentBookingTool}`,
        followUpSequence: 'feature-comparison',
        priority: 'high',
        reasoning,
      };
    }

    // SCENARIO 3: Multi-location → enterprise pitch
    if (lead.hasMultiLocation) {
      reasoning.push('Multi-location business detected');
      reasoning.push('Emphasize centralized management');
      
      return {
        campaign: 'enterprise-multi-location',
        template: 'multi-location-management',
        followUpSequence: 'custom-demo-request',
        priority: 'high',
        reasoning,
      };
    }

    // SCENARIO 4: Has booking keywords → ready to buy
    if (lead.hasBookingKeywords && lead.bookingKeywordScore >= 5) {
      reasoning.push('Strong booking intent detected');
      reasoning.push('Lead is actively looking for solutions');
      
      return {
        campaign: 'high-intent-fast-track',
        template: 'ready-to-buy',
        followUpSequence: 'fast-track-demo',
        priority: 'high',
        reasoning,
      };
    }

    // SCENARIO 5: Phone only (no online booking) → education first
    if ((lead.customFields as any)?.hasPhoneOnly) {
      reasoning.push('Manual booking process (phone only)');
      reasoning.push('Educate on automation benefits');
      
      return {
        campaign: 'manual-to-automated',
        template: 'phone-only-pain-points',
        followUpSequence: 'automation-education',
        priority: 'medium',
        reasoning,
      };
    }

    // SCENARIO 6: High quality (score 80+) → premium treatment
    if (lead.qualityScore >= 80) {
      reasoning.push('High quality lead');
      reasoning.push('Personalized approach recommended');
      
      return {
        campaign: 'premium-outreach',
        template: 'personalized-high-value',
        followUpSequence: 'white-glove-follow-up',
        priority: 'high',
        reasoning,
      };
    }

    // DEFAULT: Standard industry-specific outreach
    reasoning.push('Standard qualification criteria met');
    reasoning.push(`Industry: ${lead.industry}`);
    
    return {
      campaign: 'standard-outreach',
      template: `${lead.industry}-initial`,
      followUpSequence: 'standard-3-5-day',
      priority: 'medium',
      reasoning,
    };
  }

  /**
   * Get email template based on routing decision
   */
  getEmailContent(lead: Partial<Lead>, decision: RoutingDecision): {
    subject: string;
    body: string;
  } {
    const templates = this.getTemplateLibrary();
    const template = templates[decision.template] || templates['default'];

    return {
      subject: this.replaceVariables(template.subject, lead),
      body: this.replaceVariables(template.body, lead),
    };
  }

  /**
   * Email template library
   */
  private getTemplateLibrary(): Record<string, { subject: string; body: string }> {
    return {
      'simple-booking-link': {
        subject: 'Accept bookings without a website - {{company_name}}',
        body: `Hi {{contact_name}},

No website? No problem!

BookNex gives you:
• Simple booking link (share anywhere)
• QR code for your location
• WhatsApp booking confirmations
• Starts at $9.99/month

Perfect for solo practitioners and small studios.

See how it works: [link]

Best,
BookNex Team`,
      },

      'switch-from-calendly': {
        subject: 'Better than Calendly for {{industry}} businesses',
        body: `Hi {{contact_name}},

I noticed {{company_name}} uses Calendly for bookings.

Many {{industry}} businesses switch to BookNex because:

✅ WhatsApp notifications (Calendly only has email)
✅ Multi-location support
✅ Lower price ($9.99 vs $12)
✅ Payment integration included
✅ Industry-specific features

14-day free trial - test side-by-side.

Worth a look? [trial link]`,
      },

      'multi-location-management': {
        subject: 'Centralized booking for {{company_name}}\'s locations',
        body: `Hi {{contact_name}},

Managing bookings across multiple locations?

BookNex gives you:
• Single dashboard for all locations
• Location-specific availability
• Staff management per location
• Centralized reporting
• White-label option

{{industry}} chains save 15+ hours/week.

Let's discuss your needs: [schedule call]`,
      },

      'ready-to-buy': {
        subject: 'Online booking solution for {{company_name}}',
        body: `Hi {{contact_name}},

I see {{company_name}} is looking for booking automation.

Quick question: What's your biggest scheduling challenge?

BookNex solves:
• Double bookings
• No-shows (60% reduction)
• Manual coordination
• Payment collection

14-day free trial - setup in 5 minutes.

Ready to start? [trial link]`,
      },

      'phone-only-pain-points': {
        subject: 'Stop losing bookings outside business hours',
        body: `Hi {{contact_name}},

{{company_name}} probably loses bookings to:
• After-hours calls (67% of inquiries)
• Busy phone lines
• Manual back-and-forth

BookNex automates this:
✅ 24/7 online booking
✅ Automatic confirmations
✅ Calendar sync
✅ No phone tag needed

See it in action: [demo link]`,
      },

      'personalized-high-value': {
        subject: 'Booking automation for {{company_name}}',
        body: `Hi {{contact_name}},

{{company_name}} has an impressive {{google_rating}}★ rating!

With that reputation, you shouldn't lose bookings to:
- Manual scheduling
- After-hours inquiries
- No-shows

BookNex helps top-rated {{industry}} businesses:
• Increase bookings 120%
• Reduce no-shows 60%
• Save 10+ hours/week

Can I show you how? [schedule demo]`,
      },

      'default': {
        subject: 'Modern booking for {{industry}} - {{company_name}}',
        body: `Hi {{contact_name}},

{{industry}} businesses using BookNex report:
• 120% more bookings
• 60% fewer no-shows
• 5-10 hours saved weekly

Features:
✅ 24/7 online booking
✅ WhatsApp reminders
✅ Payment integration
✅ Calendar sync

$9.99/month - no credit card for trial.

Try it: [trial link]`,
      },
    };
  }

  /**
   * Replace template variables
   */
  private replaceVariables(text: string, lead: Partial<Lead>): string {
    return text
      .replace(/\{\{company_name\}\}/g, lead.companyName || 'your business')
      .replace(/\{\{contact_name\}\}/g, lead.contactName || 'there')
      .replace(/\{\{industry\}\}/g, lead.industry || 'service')
      .replace(/\{\{google_rating\}\}/g, lead.googleRating?.toString() || '4.5')
      .replace(/\{\{city\}\}/g, lead.city || 'your area')
      .replace(/\{\{country\}\}/g, lead.country || 'your region');
  }
}

export const leadRoutingService = new LeadRoutingService();
```

---

## Step 4.2: Integrate Routing in Campaign Execution

**File:** `apps/api/src/controllers/campaigns.controller.ts`

**Action:** UPDATE to use smart routing (you'll need to implement this controller if it doesn't exist):

```typescript
import { leadRoutingService } from '../services/outreach/lead-routing.service';

// When creating campaign emails
async function prepareOutreachEmail(lead: Lead) {
  // Determine routing
  const routing = leadRoutingService.routeLead(lead);
  
  // Get email content
  const emailContent = leadRoutingService.getEmailContent(lead, routing);
  
  // Log routing decision
  logger.info('[Campaign] Lead routing decision', {
    leadId: lead.id,
    companyName: lead.companyName,
    campaign: routing.campaign,
    priority: routing.priority,
    reasoning: routing.reasoning,
  });
  
  return {
    ...emailContent,
    campaign: routing.campaign,
    priority: routing.priority,
  };
}
```

---

# PHASE 5: Complete Frontend UI

## Step 5.1: Create Dashboard Page

**File:** `apps/web/src/app/page.tsx` (MODIFY OR CREATE)

**Action:** CREATE comprehensive dashboard:

```typescript
'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Users, 
  Mail, 
  TrendingUp, 
  Target,
  Activity,
  DollarSign,
} from 'lucide-react';

interface DashboardMetrics {
  totalLeads: number;
  newLeadsToday: number;
  hotLeads: number;
  warmLeads: number;
  emailsSent: number;
  emailOpenRate: number;
  responsesReceived: number;
  activeCampaigns: number;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await axios.get('http://localhost:4000/api/analytics/dashboard');
      setMetrics(response.data.data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            LeadNexConnect Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Lead generation for BookNex Solutions
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Leads"
            value={metrics?.totalLeads || 0}
            change="+12%"
            icon={<Users className="w-6 h-6 text-blue-600" />}
            trend="up"
          />
          <MetricCard
            title="New Today"
            value={metrics?.newLeadsToday || 0}
            icon={<Target className="w-6 h-6 text-green-600" />}
          />
          <MetricCard
            title="Emails Sent"
            value={metrics?.emailsSent || 0}
            change="+8%"
            icon={<Mail className="w-6 h-6 text-purple-600" />}
            trend="up"
          />
          <MetricCard
            title="Open Rate"
            value={`${metrics?.emailOpenRate || 0}%`}
            change="+3%"
            icon={<TrendingUp className="w-6 h-6 text-orange-600" />}
            trend="up"
          />
        </div>

        {/* Lead Quality Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <QualityCard
            title="Hot Leads"
            count={metrics?.hotLeads || 0}
            percentage={calculatePercentage(metrics?.hotLeads, metrics?.totalLeads)}
            color="red"
          />
          <QualityCard
            title="Warm Leads"
            count={metrics?.warmLeads || 0}
            percentage={calculatePercentage(metrics?.warmLeads, metrics?.totalLeads)}
            color="yellow"
          />
          <QualityCard
            title="Cold Leads"
            count={
              (metrics?.totalLeads || 0) - 
              (metrics?.hotLeads || 0) - 
              (metrics?.warmLeads || 0)
            }
            percentage={
              100 - 
              calculatePercentage(metrics?.hotLeads, metrics?.totalLeads) -
              calculatePercentage(metrics?.warmLeads, metrics?.totalLeads)
            }
            color="blue"
          />
        </div>

        {/* Active Campaigns */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Active Campaigns
          </h2>
          <div className="text-3xl font-bold text-blue-600">
            {metrics?.activeCampaigns || 0}
          </div>
          <p className="text-gray-500 mt-1">campaigns running</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActionCard
            title="Generate Leads"
            description="Start a new lead generation batch"
            href="/leads/generate"
            icon={<Users className="w-8 h-8 text-blue-600" />}
          />
          <ActionCard
            title="Create Campaign"
            description="Setup a new outreach campaign"
            href="/campaigns/new"
            icon={<Mail className="w-8 h-8 text-purple-600" />}
          />
          <ActionCard
            title="View Analytics"
            description="Detailed performance metrics"
            href="/analytics"
            icon={<Activity className="w-8 h-8 text-green-600" />}
          />
        </div>
      </main>
    </div>
  );
}

// Helper Components
function MetricCard({ 
  title, 
  value, 
  change, 
  icon, 
  trend 
}: { 
  title: string; 
  value: number | string; 
  change?: string; 
  icon: React.ReactNode;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-500 text-sm font-medium">{title}</span>
        {icon}
      </div>
      <div className="flex items-end justify-between">
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        {change && (
          <span className={`text-sm font-medium ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

function QualityCard({
  title,
  count,
  percentage,
  color,
}: {
  title: string;
  count: number;
  percentage: number;
  color: 'red' | 'yellow' | 'blue';
}) {
  const colorClasses = {
    red: 'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <div className={`rounded-lg border-2 p-6 ${colorClasses[color]}`}>
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      <div className="text-4xl font-bold mb-1">{count}</div>
      <div className="text-sm font-medium">{percentage.toFixed(1)}%</div>
    </div>
  );
}

function ActionCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
    >
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm">{description}</p>
    </a>
  );
}

function calculatePercentage(value?: number, total?: number): number {
  if (!value || !total || total === 0) return 0;
  return (value / total) * 100;
}
```

---

## Step 5.2: Create Leads Management Page

**File:** `apps/web/src/app/leads/page.tsx` (CREATE)

**Action:** CREATE lead management interface:

```typescript
'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Filter, Download, Plus } from 'lucide-react';

interface Lead {
  id: string;
  companyName: string;
  email: string;
  phone: string;
  industry: string;
  country: string;
  qualityScore: number;
  status: string;
  source: string;
  website: string;
  hasBookingKeywords: boolean;
  currentBookingTool: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    industry: 'all',
    status: 'all',
    minScore: 0,
  });

  useEffect(() => {
    fetchLeads();
  }, [filters]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.industry !== 'all') params.append('industry', filters.industry);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.minScore > 0) params.append('minScore', filters.minScore.toString());

      const response = await axios.get(`http://localhost:4000/api/leads?${params}`);
      setLeads(response.data.data);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.companyName.toLowerCase().includes(filters.search.toLowerCase()) ||
    lead.email?.toLowerCase().includes(filters.search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
              <p className="mt-1 text-sm text-gray-500">
                {filteredLeads.length} leads found
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => window.location.href = '/leads/import'}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Import CSV
              </button>
              <button
                onClick={() => window.location.href = '/leads/generate'}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Generate Leads
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Company name or email..."
                  className="pl-10 w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry
              </label>
              <select
                value={filters.industry}
                onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Industries</option>
                <option value="spa">Spa & Salons</option>
                <option value="tours">Tour Operators</option>
                <option value="clinic">Medical Clinics</option>
                <option value="fitness">Fitness Centers</option>
                <option value="education">Education</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="responded">Responded</option>
                <option value="interested">Interested</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Quality Score
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={filters.minScore}
                onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="text-sm text-gray-500 mt-1">{filters.minScore}+</div>
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Industry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Loading leads...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No leads found
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {lead.companyName}
                        </div>
                        {lead.website && (
                          <div className="text-sm text-gray-500">
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-blue-600"
                            >
                              {lead.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lead.email}</div>
                      <div className="text-sm text-gray-500">{lead.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {lead.industry}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${
                          lead.qualityScore >= 80
                            ? 'text-green-600'
                            : lead.qualityScore >= 60
                            ? 'text-yellow-600'
                            : 'text-gray-600'
                        }`}>
                          {lead.qualityScore}
                        </span>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              lead.qualityScore >= 80
                                ? 'bg-green-500'
                                : lead.qualityScore >= 60
                                ? 'bg-yellow-500'
                                : 'bg-gray-500'
                            }`}
                            style={{ width: `${lead.qualityScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        lead.status === 'new'
                          ? 'bg-gray-100 text-gray-800'
                          : lead.status === 'contacted'
                          ? 'bg-blue-100 text-blue-800'
                          : lead.status === 'responded'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.source}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => window.location.href = `/leads/${lead.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
```

---

**Due to response length limits, I'll create a downloadable complete document with all remaining phases...**

Let me generate the complete roadmap document:
