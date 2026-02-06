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
      const rating = parseFloat(lead.googleRating.toString());
      if (rating >= 4.5) {
        score += 5;
      } else if (rating >= 4.0) {
        score += 3;
      } else if (rating >= 3.5) {
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
    if (lead.googleRating) {
      const rating = parseFloat(lead.googleRating.toString());
      if (rating >= 4.0) potentialScore += 20;
    }
    
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
  private calculateRatingScore(rating?: any, reviewCount?: number): number {
    let score = 0;

    if (rating) {
      const ratingNum = parseFloat(rating.toString());
      if (ratingNum >= 4.5) score += 5;
      else if (ratingNum >= 4.0) score += 3;
      else if (ratingNum >= 3.5) score += 2;
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
