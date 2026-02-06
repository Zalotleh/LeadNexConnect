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
   * Build the AI prompt for Claude
   */
  private buildAIPrompt(params: GenerateEmailParams & {
    jobTitle?: string;
    website?: string;
  }): string {
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

${params.additionalInstructions ? `
🎯 ADDITIONAL CUSTOM INSTRUCTIONS (IMPORTANT - Follow these carefully):
${params.additionalInstructions}

` : ''}BLACK FRIDAY SPECIAL OFFER (Active Now - Ends December 7, 2024):
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
[your email body in HTML format - must end with {{signature}}]

CRITICAL HTML FORMATTING RULES:
1. Use proper HTML structure with email-compatible tags
2. Use <p> tags for paragraphs (not <div>)
3. Use <strong> for bold text
4. Use <a href="VARIABLE"> for links (e.g., <a href="{{signUpLink}}">Sign up now</a>)
5. Use <ul> and <li> for bullet lists if needed
6. Keep HTML simple and email-client compatible
7. Variables like {{signUpLink}}, {{signature}} must remain as-is (will be replaced by backend)
8. Use inline styles sparingly, prefer clean semantic HTML

HTML Example Structure:
<p>Hi {{contactName}},</p>
<p>[Role/industry-specific hook mentioning pain point]</p>
<p>[One sentence about BookNex solution]</p>
<p><strong>🎉 Black Friday Special</strong> - 50% off your first year with code <strong>BOOKNEX100</strong> (ends December 7)</p>
<p>[Brief value proposition with specific benefit]</p>
<p>
  <a href="{{signUpLink}}">Sign up now</a> | 
  <a href="{{featuresLink}}">Explore features</a> | 
  <a href="{{demoLink}}">Book a demo</a>
</p>
<p>{{signature}}</p>

Do not include any other text, markdown formatting, or additional formatting outside the SUBJECT and BODY sections.`;
  }

  /**
   * Parse AI response into subject and body (now handles HTML)
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
      } else if (inBody) {
        // Include all lines in body, even empty ones (for HTML structure)
        bodyLines.push(line);
      }
    }

    // Fallback if parsing fails
    if (!subject) {
      subject = 'Transform your business with BookNex';
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
