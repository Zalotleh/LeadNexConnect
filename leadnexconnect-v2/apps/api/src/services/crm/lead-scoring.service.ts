import { logger } from '../../utils/logger';
import type { Lead } from '@leadnex/shared';
import { LEAD_SCORING } from '@leadnex/shared';

export class LeadScoringService {
  /**
   * Calculate quality score for a lead (0-100)
   */
  calculateScore(lead: Partial<Lead>): number {
    let score = 0;

    // Email quality (40 points max)
    if (lead.email) {
      score += 20;
      if (lead.verificationStatus === 'email_verified') {
        score += LEAD_SCORING.EMAIL_VERIFIED - 20; // Additional 20 points
      }
    }

    // Website exists (15 points)
    if (lead.website) {
      score += LEAD_SCORING.WEBSITE_EXISTS;
    }

    // Phone number (10 points)
    if (lead.phone) {
      score += LEAD_SCORING.PHONE_NUMBER;
    }

    // LinkedIn profile (15 points)
    if (lead.source === 'linkedin' || lead.linkedinUrl) {
      score += LEAD_SCORING.LINKEDIN_PROFILE;
    }

    // Company size match (20 points)
    if (this.isTargetCompanySize(lead.companySize)) {
      score += LEAD_SCORING.COMPANY_SIZE_MATCH;
    }

    logger.debug('[LeadScoring] Calculated score', {
      companyName: lead.companyName,
      score,
    });

    return Math.min(score, 100);
  }

  /**
   * Check if company size is in target range
   */
  private isTargetCompanySize(size?: string): boolean {
    const targetSizes = ['11-50', '51-200', '201-500'];
    return size ? targetSizes.includes(size) : false;
  }

  /**
   * Classify lead as hot, warm, or cold based on score
   */
  classifyLead(score: number): 'hot' | 'warm' | 'cold' {
    if (score >= 75) return 'hot';
    if (score >= 50) return 'warm';
    return 'cold';
  }
}

export const leadScoringService = new LeadScoringService();
