/**
 * VariableResolverService
 *
 * Single source of truth for resolving {{variables}} in email templates.
 *
 * Usage pattern (designed for efficiency inside lead loops):
 *
 *   const ctx = await variableResolverService.buildContext(userId);
 *   for (const lead of leads) {
 *     const subject = variableResolverService.resolve(template.subject, ctx, lead);
 *     const body    = variableResolverService.resolve(template.body,    ctx, lead);
 *   }
 *
 * Variable categories resolved:
 *   - Lead fields      : {{companyName}}, {{contactName}}, {{city}}, …
 *   - Sender profile   : {{sender_name}}, {{sender_email}}, {{signature}}
 *   - Company profile  : {{company_name}}, {{sign_up_link}}, {{features_link}}, …
 *   - Custom variables : any {{key}} the user has created in custom_variables table
 */

import { db, senderProfiles, customVariables } from '@leadnex/database';
import { eq, and } from 'drizzle-orm';
import { settingsService } from './settings.service';
import { logger } from '../utils/logger';

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export interface CompanyProfile {
  companyName: string;
  productName: string;
  productDescription: string;
  websiteUrl: string;
  signUpLink: string;
  featuresLink: string;
  pricingLink: string;
  demoLink: string;
  integrationsLink: string;
  supportEmail: string;
}

export interface ResolverContext {
  /** Sender identity fields (from sender_profiles table) */
  senderName: string;
  senderEmail: string;
  signatureHtml: string;

  /** Company profile (from settings.company_profile JSON) */
  company: CompanyProfile;

  /** Custom variables keyed by their template key (e.g. 'myVar' → 'some value') */
  customVars: Record<string, string>;
}

// ──────────────────────────────────────────────────────────────────────────
// Default fallback values (empty strings — admins should fill these in)
// ──────────────────────────────────────────────────────────────────────────

const EMPTY_COMPANY: CompanyProfile = {
  companyName: '',
  productName: '',
  productDescription: '',
  websiteUrl: '',
  signUpLink: '',
  featuresLink: '',
  pricingLink: '',
  demoLink: '',
  integrationsLink: '',
  supportEmail: '',
};

// ──────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────

export class VariableResolverService {
  /**
   * Pre-load all user-specific data from the database.
   * Call this ONCE before a loop of leads to avoid repeated DB queries.
   */
  async buildContext(userId: string): Promise<ResolverContext> {
    // Load in parallel: sender profile, company profile, custom variables
    const [profileRows, companyRaw, customVarRows] = await Promise.all([
      db
        .select()
        .from(senderProfiles)
        .where(eq(senderProfiles.userId, userId))
        .limit(1),

      settingsService.get('company_profile', null).catch(() => null),

      db
        .select()
        .from(customVariables)
        .where(and(eq(customVariables.userId, userId), eq(customVariables.isActive, true))),
    ]);

    const profile = profileRows[0];

    // Parse company profile
    let company: CompanyProfile = EMPTY_COMPANY;
    if (companyRaw && typeof companyRaw === 'object') {
      const c = companyRaw as Record<string, any>;
      company = {
        companyName:        c.companyName        || '',
        productName:        c.productName        || '',
        productDescription: c.productDescription || '',
        websiteUrl:         c.websiteUrl         || '',
        signUpLink:         c.signUpLink         || '',
        featuresLink:       c.featuresLink       || '',
        pricingLink:        c.pricingLink        || '',
        demoLink:           c.demoLink           || '',
        integrationsLink:   c.integrationsLink   || '',
        supportEmail:       c.supportEmail       || '',
      };
    }

    // Build sender fields
    const senderName  = profile?.senderName  || company.companyName || '';
    const senderEmail = profile?.senderEmail || company.supportEmail || '';

    // Build signature — use saved HTML or a minimal auto-generated fallback
    const signatureHtml = profile?.signatureHtml?.trim()
      ? profile.signatureHtml
      : this.buildFallbackSignature(senderName, senderEmail, company);

    // Build custom variable map: key → defaultValue (or value field as fallback)
    const customVars: Record<string, string> = {};
    for (const cv of customVarRows) {
      customVars[cv.key] = cv.defaultValue || '';
    }

    logger.info('[VariableResolver] Context built', {
      userId,
      hasSenderProfile: !!profile,
      hasCompany: !!companyRaw,
      customVarCount: customVarRows.length,
    });

    return { senderName, senderEmail, signatureHtml, company, customVars };
  }

  /**
   * Resolve all {{variables}} in a template string.
   * This is synchronous — call buildContext() first.
   *
   * @param template   The raw template string (HTML or plain text)
   * @param ctx        Pre-loaded resolver context (from buildContext)
   * @param lead       Optional lead record for lead-specific variables
   */
  resolve(
    template: string,
    ctx: ResolverContext,
    lead: Record<string, any> = {},
  ): string {
    const c = ctx.company;

    // Helper: wrap text/URL as a clickable anchor (for link variables)
    const a = (url: string, label: string): string =>
      url ? `<a href="${url}" style="color:#2563eb;text-decoration:none;">${label}</a>` : label;

    // Helper: mailto link
    const mailto = (email: string): string =>
      email
        ? `<a href="mailto:${email}" style="color:#2563eb;text-decoration:none;">${email}</a>`
        : '';

    let out = template;

    // ── 1. Lead variables ────────────────────────────────────────────────
    out = out
      .replace(/\{\{companyName\}\}/g,  lead.companyName  || 'your company')
      .replace(/\{\{contactName\}\}/g,  lead.contactName  || 'there')
      .replace(/\{\{email\}\}/g,        lead.email        || '')
      .replace(/\{\{website\}\}/g,      lead.website      || '')
      .replace(/\{\{industry\}\}/g,     lead.industry     || '')
      .replace(/\{\{city\}\}/g,         lead.city         || '')
      .replace(/\{\{country\}\}/g,      lead.country      || '')
      .replace(/\{\{jobTitle\}\}/g,     lead.jobTitle     || '')
      .replace(/\{\{companySize\}\}/g,  lead.companySize  || '')
      .replace(/\{\{googleRating\}\}/g, lead.googleRating != null ? String(lead.googleRating) : '');

    // ── 2. Sender profile variables ──────────────────────────────────────
    out = out
      .replace(/\{\{sender_name\}\}/g,  ctx.senderName)
      .replace(/\{\{sender_email\}\}/g, ctx.senderEmail)
      .replace(/\{\{signature\}\}/g,    ctx.signatureHtml);

    // ── 3. Company profile — plain values ────────────────────────────────
    out = out
      .replace(/\{\{company_name\}\}/g,       c.companyName)
      .replace(/\{\{ourCompanyName\}\}/g,      c.companyName)
      .replace(/\{\{product_name\}\}/g,        c.productName)
      .replace(/\{\{product_description\}\}/g, c.productDescription)
      .replace(/\{\{support_email\}\}/g,       c.supportEmail)
      // raw URL variants
      .replace(/\{\{website_url\}\}/g,    c.websiteUrl)
      .replace(/\{\{product_url\}\}/g,    c.websiteUrl)
      .replace(/\{\{ourWebsite\}\}/g,     c.websiteUrl)
      .replace(/\{\{sign_up_link_raw\}\}/g,    c.signUpLink)
      .replace(/\{\{features_link_raw\}\}/g,   c.featuresLink)
      .replace(/\{\{pricing_link_raw\}\}/g,    c.pricingLink)
      .replace(/\{\{demo_link_raw\}\}/g,       c.demoLink)
      .replace(/\{\{integrations_link_raw\}\}/g, c.integrationsLink);

    // ── 4. Company profile — link variables (rendered as <a> tags) ───────
    out = out
      // BookNex-style: {{BookNex}} → hyperlinked company name
      .replace(/\{\{BookNex\}\}/g,        a(c.websiteUrl, c.companyName || c.websiteUrl))
      // email link
      .replace(/\{\{ourEmail\}\}/g,       mailto(c.supportEmail))
      // CTA link variables
      .replace(/\{\{sign_up_link\}\}/g,       a(c.signUpLink,       'Sign Up Now'))
      .replace(/\{\{signUpLink\}\}/g,          a(c.signUpLink,       'Sign Up Now'))
      .replace(/\{\{features_link\}\}/g,      a(c.featuresLink,     'View Our Features'))
      .replace(/\{\{featuresLink\}\}/g,        a(c.featuresLink,     'View Our Features'))
      .replace(/\{\{pricing_link\}\}/g,       a(c.pricingLink,      'View Pricing Plans'))
      .replace(/\{\{pricingLink\}\}/g,         a(c.pricingLink,      'View Pricing Plans'))
      .replace(/\{\{demo_link\}\}/g,          a(c.demoLink,         'Book a Demo'))
      .replace(/\{\{demoLink\}\}/g,            a(c.demoLink,         'Book a Demo'))
      .replace(/\{\{integrations_link\}\}/g,  a(c.integrationsLink, 'View Integrations'))
      .replace(/\{\{integrationsLink\}\}/g,    a(c.integrationsLink, 'View Integrations'))
      .replace(/\{\{howToStartLink\}\}/g,      a(c.websiteUrl,       'How To Get Started'))
      .replace(/\{\{websiteLink\}\}/g,         a(c.websiteUrl,       c.websiteUrl))
      .replace(/\{\{website_link\}\}/g,        a(c.websiteUrl,       c.websiteUrl));

    // ── 5. Custom variables ──────────────────────────────────────────────
    for (const [key, value] of Object.entries(ctx.customVars)) {
      out = out.replace(new RegExp(`\\{\\{${escapeRegex(key)}\\}\\}`, 'g'), value);
    }

    return out;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────────

  private buildFallbackSignature(
    senderName: string,
    senderEmail: string,
    company: CompanyProfile,
  ): string {
    const name    = senderName  || company.companyName || '';
    const email   = senderEmail || company.supportEmail || '';
    const website = company.websiteUrl || '';

    if (!name && !email && !website) {
      return ''; // Nothing to show
    }

    return [
      '<div style="margin-top:20px;font-family:Arial,sans-serif;font-size:14px;color:#333;">',
      name    ? `<strong style="font-size:15px;color:#1e293b;">${name}</strong><br>` : '',
      email   ? `<a href="mailto:${email}" style="color:#2563eb;text-decoration:none;">${email}</a><br>` : '',
      website ? `<a href="${website}" style="color:#2563eb;text-decoration:none;">${website}</a>` : '',
      '</div>',
    ].join('');
  }
}

// Escape a string for use inside a RegExp
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const variableResolverService = new VariableResolverService();
