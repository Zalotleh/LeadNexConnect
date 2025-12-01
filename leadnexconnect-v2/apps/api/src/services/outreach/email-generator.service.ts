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
    const followUpContext = params.followUpStage === 'follow_up_1'
      ? 'This is a follow-up email (first reminder). Keep it brief and reference the previous email.'
      : params.followUpStage === 'follow_up_2'
      ? 'This is a second follow-up email. Be more direct and create urgency.'
      : 'This is an initial cold outreach email.';

    return `You are a professional B2B sales email writer for BookNex, a comprehensive booking and management platform.

Task: Write a personalized ${followUpContext.toLowerCase()} email to a ${params.industry} business.

Target Business Details:
- Company Name: ${params.companyName}
- Contact Name: ${params.contactName || 'the business owner'}
${params.jobTitle ? `- Job Title: ${params.jobTitle}` : ''}
- Industry: ${params.industry}
- Location: ${params.city ? `${params.city}, ` : ''}${params.country || ''}
${params.website ? `- Website: ${params.website}` : ''}

Context: ${followUpContext}

Product (BookNex):
- All-in-one booking and management platform
- Perfect for ${params.industry} businesses
- Features: Online booking, payment processing, customer management, automated reminders, analytics
- Helps businesses save time and increase revenue

Requirements:
1. Subject line: Catchy, personalized, 50 characters max
2. Email body: Professional, conversational tone
3. Highlight 2-3 specific pain points for ${params.industry} businesses
4. Mention how BookNex solves these problems
5. Include a clear call-to-action (book a demo)
6. Keep it under 150 words
7. Don't be salesy - be helpful and consultative
8. Personalize based on their business name and location

Format your response EXACTLY as:
SUBJECT: [your subject line]

BODY:
[your email body]

Do not include any other text, greetings, or signatures.`;
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
