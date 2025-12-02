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
      const prompt = this.buildAIPrompt(params);

      // Call Claude API
      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
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

      // Parse the response (expected format: SUBJECT: ... \n\n BODY: ...)
      const parsed = this.parseAIResponse(responseText);

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
   * Build AI prompt for Claude
   */
  private buildAIPrompt(params: GenerateEmailParams & {
    jobTitle?: string;
    website?: string;
  }): string {
    const isFollowUp = params.followUpStage === 'follow_up_1' || params.followUpStage === 'follow_up_2';
    const isSecondFollowUp = params.followUpStage === 'follow_up_2';
    
    // Industry-specific pain points
    const industryPainPoints: Record<string, string> = {
      'Technology': 'managing scattered customer data across multiple tools, inefficient booking processes, and missed revenue opportunities',
      'Healthcare': 'complex appointment scheduling, patient communication challenges, and administrative overhead',
      'Real Estate': 'managing multiple property viewings, client follow-ups, and booking coordination',
      'Consulting': 'calendar chaos, client onboarding delays, and manual scheduling back-and-forth',
      'Education': 'student/parent meeting coordination, resource booking, and communication gaps',
      'Financial Services': 'client meeting scheduling, compliance tracking, and relationship management',
      'Legal': 'client consultation scheduling, case management, and communication workflows',
      'Marketing': 'client demos, campaign coordination, and team collaboration challenges',
      'Sales': 'prospect meeting booking, follow-up management, and pipeline visibility',
      'default': 'scattered scheduling tools, missed opportunities, and inefficient workflows'
    };

    const painPoint = industryPainPoints[params.industry || ''] || industryPainPoints['default'];

    return `You are a professional B2B sales email writer for BookNex, a comprehensive booking and CRM platform.

Task: Write a ${isFollowUp ? (isSecondFollowUp ? 'second follow-up' : 'first follow-up') : 'initial cold outreach'} email to a ${params.industry} business.

Target Business Details:
- Company Name: ${params.companyName}
- Contact Name: ${params.contactName || 'the business owner'}
${params.jobTitle ? `- Job Title: ${params.jobTitle}` : ''}
- Industry: ${params.industry}
- Location: ${params.city ? `${params.city}, ` : ''}${params.country || ''}
${params.website ? `- Website: ${params.website}` : ''}

Email Context: ${isFollowUp ? (isSecondFollowUp ? 'This is a SECOND follow-up email. Be more direct and create urgency.' : 'This is a FOLLOW-UP email (first reminder). Reference the previous email briefly.') : 'This is an INITIAL outreach email.'}

Product: BookNex - All-in-one booking and CRM platform
Industry Pain Point: ${painPoint}

BLACK FRIDAY SPECIAL OFFER (Active Now - Ends December 7, 2024):
- Offer Code: BOOKNEX100
- Discount: 50% off first year
- Deadline: December 7, 2024
- This is a time-sensitive opportunity

Requirements:
1. Subject line: Catchy, personalized, 40-50 characters max
2. Email body: Professional but conversational tone - write like a helpful peer, not a salesperson
3. Keep it concise and scannable (150-200 words maximum)
4. Mention the industry-specific pain point naturally
5. Highlight the BLACK FRIDAY offer prominently with urgency (ends December 7)
6. Include the offer code BOOKNEX100 clearly
7. ${isFollowUp ? 'Reference the previous email briefly, add new value or perspective' : 'Start with a relevant hook related to their role/industry'}
8. DO NOT use placeholder text or brackets - use actual information provided
9. DO NOT mention statistics or success metrics unless you have verified data
10. DO NOT use generic phrases like "I hope this email finds you well"
11. Use short, punchy sentences - avoid long paragraphs

CRITICAL - Call-to-Action Links (use these exact variables):
- {{signUpLink}} - For signing up to BookNex (PRIMARY CTA)
- {{featuresLink}} - To explore specific features
- {{pricingLink}} - To see pricing and plans
- {{integrationsLink}} - To view integrations
- {{demoLink}} - To book a demo
- {{websiteLink}} - General website link

CRITICAL - Signature Variable:
- End with {{signature}} - this will be replaced with the sender's signature

${isFollowUp ? `
FOLLOW-UP SPECIFIC:
- Acknowledge previous message briefly ("Following up on my last email...")
- Provide a NEW angle or additional value (e.g., mention a specific feature, share a quick win, reference the Black Friday deadline)
- Use a softer CTA like "Would you like to see a quick demo?" or "Want to grab this offer before December 7?"
- Reinforce urgency with the Black Friday deadline
- Keep it shorter and more casual than initial email
${isSecondFollowUp ? '- Be more direct - this is the final follow-up' : ''}
` : `
INITIAL EMAIL SPECIFIC:
- Hook: Start with their role or industry challenge
- Pain Point: Reference the specific pain point for their industry
- Solution: Briefly introduce BookNex as the solution (all-in-one booking & CRM)
- Black Friday Offer: Highlight 50% off + BOOKNEX100 code + December 7 deadline
- CTAs: Include 2-3 actionable CTAs:
  * Primary: "Sign up now with {{signUpLink}} using code BOOKNEX100"
  * Secondary: "Explore features at {{featuresLink}}" or "See pricing at {{pricingLink}}"
  * Tertiary: "Book a quick demo at {{demoLink}}"
- Make the Black Friday offer feel urgent and valuable
`}

Example Structure for Initial Email:
Hi [Name],

[Role/industry-specific hook mentioning pain point]

[One sentence about BookNex solution]

🎉 Black Friday Special - 50% off your first year with code BOOKNEX100 (ends December 7)

[Brief value proposition with specific benefit]

[2-3 CTAs using link variables]

{{signature}}

Format your response EXACTLY as:
SUBJECT: [your subject line]

BODY:
[your email body - must end with {{signature}}]

Do not include any other text or additional formatting.`;
  }

  /**
   * Parse AI response into subject and body
   */
  private parseAIResponse(response: string): {
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
      } else if (inBody && line.trim()) {
        bodyLines.push(line.trim());
      }
    }

    // Fallback if parsing fails
    if (!subject) {
      subject = 'Transform your business with BookNex';
    }

    if (bodyLines.length === 0) {
      bodyLines = response.split('\n').filter(l => l.trim() && !l.startsWith('SUBJECT:'));
    }

    return {
      subject,
      bodyText: bodyLines.join('\n\n'),
    };
  }

  /**
   * Convert plain text to HTML
   */
  private convertToHtml(text: string): string {
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
