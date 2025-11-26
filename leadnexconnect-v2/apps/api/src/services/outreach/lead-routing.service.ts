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
    if (lead.hasBookingKeywords && lead.bookingKeywordScore && lead.bookingKeywordScore >= 5) {
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
    if (lead.qualityScore && lead.qualityScore >= 80) {
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
