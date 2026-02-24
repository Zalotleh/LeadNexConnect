import { db } from '@leadnex/database';
import { emailTemplates } from '@leadnex/database';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import Anthropic from '@anthropic-ai/sdk';
import { settingsService } from '../settings.service';

interface GenerateEmailParams {
  companyName: string;
  contactName?: string;
  industry: string;
  city?: string;
  country?: string;
  followUpStage?: string;
  additionalInstructions?: string; // Custom instructions from workflow or user
}

export class EmailGeneratorService {
  /**
   * Generate personalized email content using AI (Claude)
   */
  async generateWithAI(params: GenerateEmailParams & {
    jobTitle?: string;
    website?: string;
    useTemplate?: boolean;
    skipTemplateFallback?: boolean;
  }): Promise<{
    subject: string;
    bodyText: string;
    bodyHtml: string;
  }> {
    try {
      logger.info('[EmailGenerator] Generating email with AI', { params });

      const apiKey = await settingsService.get('anthropicApiKey', process.env.ANTHROPIC_API_KEY || '');
      if (!apiKey) {
        logger.warn('[EmailGenerator] Anthropic API key not configured');
        if (!params.skipTemplateFallback) {
          logger.info('[EmailGenerator] Falling back to template generation');
          return this.generateEmail({ 
            companyName: params.companyName,
            contactName: params.contactName,
            industry: params.industry,
            city: params.city,
            country: params.country,
            followUpStage: params.followUpStage,
            skipAIFallback: true 
          });
        } else {
          // Both AI and template failed, use default
          return this.generateDefaultEmail(params);
        }
      }

      // Initialize Anthropic client with API key
      const anthropic = new Anthropic({
        apiKey,
      });

      // Build context for Claude
      const prompt = await this.buildAIPrompt(params);

      // Call Claude API
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract response
      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

      // Load product name for fallback subject (if Claude response can't be parsed)
      const cpRaw = await settingsService.get('company_profile', null).catch(() => null) as any;
      const resolvedProductName = cpRaw?.productName || 'our platform';

      // Parse the response (expected format: SUBJECT: ... \n\n BODY: ...)
      const parsed = this.parseAIResponse(responseText, resolvedProductName);

      logger.info('[EmailGenerator] AI email generated successfully', {
        subjectLength: parsed.subject.length,
        bodyLength: parsed.bodyText.length,
      });

      return {
        subject: parsed.subject,
        bodyText: parsed.bodyText,
        bodyHtml: this.convertToHtml(parsed.bodyText),
      };
    } catch (error: any) {
      logger.error('[EmailGenerator] Error generating AI email', {
        error: error.message,
      });

      // Fallback to template-based generation (but only if not already in fallback mode)
      if (!params.skipTemplateFallback) {
        logger.info('[EmailGenerator] Falling back to template generation');
        return this.generateEmail({ 
          companyName: params.companyName,
          contactName: params.contactName,
          industry: params.industry,
          city: params.city,
          country: params.country,
          followUpStage: params.followUpStage,
          skipAIFallback: true 
        });
      } else {
        // Both AI and template failed, use default
        logger.info('[EmailGenerator] Using default email template');
        return this.generateDefaultEmail(params);
      }
    }
  }

  /**
   * Generate personalized email content using templates
   */
  async generateEmail(params: GenerateEmailParams & { skipAIFallback?: boolean }): Promise<{
    subject: string;
    bodyText: string;
    bodyHtml: string;
  }> {
    try {
      logger.info('[EmailGenerator] Generating email from template', { params });

      // Get template for industry and stage
      const template = await this.getTemplate(
        params.industry,
        params.followUpStage || 'initial'
      );

      if (!template) {
        logger.warn('[EmailGenerator] No template found');
        
        // Try AI generation as fallback (but only if not already in fallback mode)
        if (!params.skipAIFallback) {
          logger.info('[EmailGenerator] Attempting AI generation as fallback');
          try {
            return await this.generateWithAI({ 
              companyName: params.companyName,
              contactName: params.contactName,
              industry: params.industry,
              city: params.city,
              country: params.country,
              followUpStage: params.followUpStage,
              skipTemplateFallback: true 
            });
          } catch (aiError: any) {
            logger.error('[EmailGenerator] AI fallback failed', { error: aiError.message });
            // Continue to default email generation
          }
        }
        
        // Use default email template as last resort
        logger.info('[EmailGenerator] Using default email template');
        return this.generateDefaultEmail(params);
      }

      // Replace variables
      const subject = this.replaceVariables(template.subject, params);
      const bodyText = this.replaceVariables(template.bodyText, params);
      const bodyHtml = template.bodyHtml 
        ? this.replaceVariables(template.bodyHtml, params)
        : this.convertToHtml(bodyText);

      return { subject, bodyText, bodyHtml };
    } catch (error: any) {
      logger.error('[EmailGenerator] Error generating email', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Build the AI prompt for Claude — uses company_profile from settings to avoid hardcoded brand names.
   */
  private async buildAIPrompt(params: GenerateEmailParams & {
    jobTitle?: string;
    website?: string;
  }): Promise<string> {
    // Load company profile so the prompt reflects the actual product — not BookNex
    const companyProfileRaw = await settingsService.get('company_profile', null).catch(() => null) as any;
    const productName    = companyProfileRaw?.productName        || 'our platform';
    const productDesc    = companyProfileRaw?.productDescription || 'an all-in-one business management platform';
    const companyName    = companyProfileRaw?.companyName        || 'our company';
    const signUpLink     = companyProfileRaw?.signUpLink         ? `{{signUpLink}}` : `{{signUpLink}}`;
    const featuresLink   = companyProfileRaw?.featuresLink       ? `{{featuresLink}}` : `{{featuresLink}}`;
    const pricingLink    = companyProfileRaw?.pricingLink        ? `{{pricingLink}}` : `{{pricingLink}}`;
    const demoLink       = companyProfileRaw?.demoLink           ? `{{demoLink}}` : `{{demoLink}}`;
    const websiteLink    = companyProfileRaw?.websiteUrl         ? `{{websiteLink}}` : `{{websiteLink}}`;
    const isFollowUp = params.followUpStage === 'follow_up_1' || params.followUpStage === 'follow_up_2';
    const isSecondFollowUp = params.followUpStage === 'follow_up_2';
    
    // Industry-specific pain points (arrays for variety and specificity)
    const industryPainPoints: Record<string, string[]> = {
      'wellness': [
        'missed appointments',
        'double bookings',
        'time spent on admin instead of focusing on clients',
        'manual appointment reminders',
        'client communication gaps'
      ],
      'healthcare': [
        'appointment scheduling chaos',
        'patient no-shows',
        'manual booking processes',
        'coordination between providers',
        'patient communication challenges'
      ],
      'consulting': [
        'calendar management overhead',
        'client scheduling conflicts',
        'inefficient booking workflows',
        'manual follow-up processes',
        'project coordination issues'
      ],
      'education': [
        'appointment coordination challenges',
        'student scheduling issues',
        'administrative bottlenecks',
        'parent-teacher meeting coordination',
        'resource booking conflicts'
      ],
      'financial services': [
        'client meeting scheduling complexity',
        'missed appointment opportunities',
        'administrative inefficiency',
        'compliance tracking overhead',
        'client relationship management gaps'
      ],
      'real estate': [
        'property showing coordination',
        'client scheduling conflicts',
        'administrative overhead',
        'follow-up management',
        'appointment booking chaos'
      ],
      'legal': [
        'client appointment management',
        'calendar coordination challenges',
        'administrative time drain',
        'case management overhead',
        'client communication workflows'
      ],
      'marketing': [
        'client meeting scheduling',
        'team coordination issues',
        'workflow inefficiencies',
        'campaign management complexity',
        'demo scheduling challenges'
      ],
      'e-commerce': [
        'customer support scheduling',
        'team coordination challenges',
        'operational inefficiencies',
        'order management overhead',
        'customer communication gaps'
      ],
      'saas': [
        'demo scheduling complexity',
        'sales meeting coordination',
        'customer onboarding challenges',
        'trial follow-up management',
        'support ticket coordination'
      ],
      'technology': [
        'managing scattered customer data',
        'inefficient booking processes',
        'missed revenue opportunities',
        'tool fragmentation',
        'workflow inefficiencies'
      ],
      'sales': [
        'prospect meeting booking',
        'follow-up management',
        'pipeline visibility',
        'lead coordination',
        'manual scheduling overhead'
      ],
      'manufacturing': [
        'production scheduling challenges',
        'supply chain coordination',
        'resource management issues',
        'order coordination',
        'operational bottlenecks'
      ],
      'retail': [
        'staff scheduling complexity',
        'customer appointment management',
        'operational coordination',
        'inventory management overhead',
        'customer service challenges'
      ]
    };

    // Get pain points for the industry (normalize to lowercase for matching)
    const industryKey = (params.industry || '').toLowerCase().replace(/\s+/g, '-');
    const painPointsArray = industryPainPoints[industryKey] || industryPainPoints['technology'] || [
      'appointment scheduling challenges',
      'operational inefficiencies',
      'administrative overhead'
    ];
    
    // Join pain points as a comma-separated string for the prompt
    const painPoint = painPointsArray.join(', ');

    return `You are a professional B2B sales email writer for ${companyName}, a ${productDesc}.

Task: Write a ${isFollowUp ? (isSecondFollowUp ? 'second follow-up' : 'first follow-up') : 'initial cold outreach'} email to a ${params.industry} business.

Target context (use ONLY as background — DO NOT hardcode these values; use the {{variables}} below instead):
- Industry: ${params.industry}
- Location: ${params.city ? `${params.city}, ` : ''}${params.country || ''}
${params.jobTitle ? `- Job Title: ${params.jobTitle}` : ''}
- Email type: ${isFollowUp ? (isSecondFollowUp ? 'Second follow-up' : 'First follow-up') : 'Initial outreach'}

Product: ${productName} — ${productDesc}
Industry Pain Point: ${painPoint}

${params.additionalInstructions ? `🎯 ADDITIONAL CUSTOM INSTRUCTIONS (IMPORTANT - follow these carefully):
${params.additionalInstructions}

` : ''}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  MANDATORY VARIABLES — You MUST use ALL of the following in the email body, written EXACTLY as shown with double curly braces. The system replaces them at send time — never write the actual name or URL in their place.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PERSONALIZATION (required — must appear in the body):
  {{contactName}}     → recipient's first name — use in the opening greeting
  {{companyName}}     → the RECIPIENT's company name — use at least once in the body
  {{ourCompanyName}}  → YOUR company name (the sender) — use when introducing your product

CTA LINKS (use AT LEAST 3 as clickable <a href="{{variable}}"> tags):
  {{signUpLink}}      → "Start your free trial" or "Sign up free" (primary CTA)
  {{featuresLink}}    → "See how it works" or "Explore features"
  {{demoLink}}        → "Book a quick demo" or "Book a demo"
  {{pricingLink}}     → "View pricing" (optional 4th CTA)
  {{websiteLink}}     → general company website link
${params.website ? `  {{website}}         → recipient's own website (reference it naturally)` : ''}

SIGNATURE (required — must be the very last element):
  {{signature}}       → sender's full signature block

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Writing requirements:
1. Subject line: 40-50 characters, catchy, reference the industry or {{companyName}}
2. Tone: professional but conversational — like a helpful peer, not a salesperson
3. Length: 150-200 words maximum, short punchy sentences
4. Naturally mention the industry pain point: "${painPointsArray[0]}"
5. ${isFollowUp ? 'Briefly reference the previous email, then add a new angle or value' : 'Open with a hook relevant to their industry challenge'}
6. NEVER write any company name as literal text — use {{ourCompanyName}} for your own company, {{companyName}} for the recipient's company
7. NEVER write real URLs — only the {{link variables}} listed above, always inside <a href="{{variable}}"> tags
8. Avoid: statistics/metrics you cannot verify, "I hope this email finds you well", long paragraphs

${isFollowUp ? `FOLLOW-UP RULES:
- Start with a short reference: "Following up on my previous email..."
- Add a new angle (feature highlight, quick win, etc.)
- Softer CTA: "Would you like to see a quick demo?" → <a href="{{demoLink}}">Book a demo</a>
- Keep it shorter and more casual than an initial email
${isSecondFollowUp ? '- Be more direct — this is the final follow-up' : ''}
` : `INITIAL EMAIL RULES:
- Hook: open with {{companyName}}'s challenge in the ${params.industry} space
- Bridge: one sentence introducing ${productName} (use {{ourCompanyName}} — NEVER write the name literally) as the solution
- CTAs: MUST include all 3 of these links using the EXACT variable syntax:
    <a href="{{signUpLink}}">Start your free trial</a> &nbsp;|&nbsp;
    <a href="{{featuresLink}}">See how it works</a> &nbsp;|&nbsp;
    <a href="{{demoLink}}">Book a quick demo</a>
`}
Format your response EXACTLY as (no extra text outside these two sections):
SUBJECT: [subject line]

BODY:
[HTML email body]

HTML RULES:
- <p> for paragraphs, <strong> for bold, <a href="{{variable}}"> for all links
- Every CTA must be a real clickable <a> tag — no plain text URLs
- All {{variables}} stay as-is with double curly braces
- End the body with <p>{{signature}}</p> as the very last line
- Keep HTML simple and email-client safe (no <div>, no inline styles)

EXAMPLE of correct output structure:
SUBJECT: Fixing ${params.industry} challenges for {{companyName}}

BODY:
<p>Hi {{contactName}},</p>
<p>Managing ${painPointsArray[0]} at {{companyName}} is a real drain — and it doesn't have to be.</p>
<p>{{ourCompanyName}} is ${productDesc} built for ${params.industry} businesses. It handles the heavy lifting so you can focus on what matters.</p>
<p>
  <a href="{{signUpLink}}">Start your free trial</a> &nbsp;|&nbsp;
  <a href="{{featuresLink}}">See how it works</a> &nbsp;|&nbsp;
  <a href="{{demoLink}}">Book a quick demo</a>
</p>
<p>Worth a look?</p>
<p>{{signature}}</p>`;
  }

  /**
   * Parse AI response into subject and body (now handles HTML)
   */
  private parseAIResponse(response: string, fallbackProductName = 'our platform'): {
    subject: string;
    bodyText: string;
  } {
    const lines = response.trim().split('\n');
    let subject = '';
    let bodyLines: string[] = [];
    let inBody = false;

    for (const line of lines) {
      if (line.startsWith('SUBJECT:')) {
        subject = line.replace('SUBJECT:', '').trim();
      } else if (line.startsWith('BODY:')) {
        inBody = true;
      } else if (inBody) {
        // Include all lines in body, even empty ones (for HTML structure)
        bodyLines.push(line);
      }
    }

    // Fallback if parsing fails
    if (!subject) {
      subject = `Transform your business with ${fallbackProductName}`;
    }

    if (bodyLines.length === 0) {
      bodyLines = response.split('\n').filter(l => !l.startsWith('SUBJECT:') && !l.startsWith('BODY:'));
    }

    // Join body lines, preserving HTML structure
    const bodyText = bodyLines.join('\n').trim();

    return {
      subject,
      bodyText, // Now contains HTML
    };
  }

  /**
   * Convert plain text to HTML (fallback for non-AI generated emails)
   */
  private convertToHtml(text: string): string {
    // Check if text already contains HTML tags
    if (text.includes('<p>') || text.includes('<div>') || text.includes('<br')) {
      return text; // Already HTML, return as-is
    }
    
    // Convert plain text to HTML
    return text
      .split('\n\n')
      .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join('\n');
  }

  private async getTemplate(industry: string, stage: string) {
    const templates = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.industry, industry),
          eq(emailTemplates.followUpStage, stage),
          eq(emailTemplates.isActive, true)
        )
      )
      .limit(1);

    return templates[0] || null;
  }

  private replaceVariables(text: string, params: GenerateEmailParams): string {
    return text
      .replace(/\{\{company_name\}\}/g, params.companyName)
      .replace(/\{\{contact_name\}\}/g, params.contactName || 'there')
      .replace(/\{\{industry\}\}/g, params.industry)
      .replace(/\{\{city\}\}/g, params.city || 'your area')
      .replace(/\{\{country\}\}/g, params.country || 'your region');
  }

  /**
   * Generate a default email when both AI and templates fail
   */
  private generateDefaultEmail(params: GenerateEmailParams): {
    subject: string;
    bodyText: string;
    bodyHtml: string;
  } {
    const contactName = params.contactName || 'there';
    const companyName = params.companyName;
    const followUpStage = params.followUpStage || '1';
    
    let subject: string;
    let bodyText: string;

    // Different content based on follow-up stage
    if (followUpStage === '1' || followUpStage === 'initial') {
      subject = `Quick question about ${companyName}`;
      bodyText = `Hi ${contactName},

I came across ${companyName} and was impressed by your work in the ${params.industry} industry.

I wanted to reach out because I believe we might be able to help streamline your operations and boost your growth.

Would you be open to a brief conversation to explore how we can support ${companyName}?

Looking forward to hearing from you.

Best regards`;
    } else if (followUpStage === '2' || followUpStage === 'follow_up_1') {
      subject = `Following up: ${companyName}`;
      bodyText = `Hi ${contactName},

I wanted to follow up on my previous email regarding ${companyName}.

I understand you're busy, but I genuinely believe we can provide value to your ${params.industry} business.

Do you have 10 minutes this week for a quick call?

Best regards`;
    } else {
      subject = `Last follow-up: ${companyName}`;
      bodyText = `Hi ${contactName},

I'll keep this brief - I've reached out a couple of times about how we can help ${companyName}.

If this isn't a priority right now, no problem at all. But if you'd like to explore the possibilities, I'm here to help.

Just let me know!

Best regards`;
    }

    return {
      subject,
      bodyText,
      bodyHtml: this.convertToHtml(bodyText),
    };
  }
}

export const emailGeneratorService = new EmailGeneratorService();
