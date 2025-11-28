import Anthropic from '@anthropic-ai/sdk'
import { logger } from '../../utils/logger'

interface EmailGenerationParams {
  industry?: string
  companyName?: string
  contactName?: string
  website?: string
  location?: string
  companySize?: string
  tone?: 'professional' | 'casual' | 'friendly'
  purpose?: string
  productService?: string
  callToAction?: string
}

class AnthropicService {
  private client: Anthropic
  private readonly maxRetries = 2
  private readonly timeout = 30000

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required')
    }
    this.client = new Anthropic({ apiKey })
  }

  async generateEmailContent(params: EmailGenerationParams): Promise<{ subject: string; body: string }> {
    try {
      logger.info('Generating AI email content with Anthropic', { 
        industry: params.industry,
        tone: params.tone 
      })

      const prompt = this.buildPrompt(params)
      
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })

      const content = message.content[0]
      if (content.type !== 'text') {
        throw new Error('Unexpected response format from Anthropic')
      }

      const result = this.parseEmailContent(content.text)
      logger.info('Successfully generated AI email content')
      
      return result
    } catch (error: any) {
      logger.error('Error generating AI email content:', error)
      throw new Error(`Failed to generate email content: ${error.message}`)
    }
  }

  private buildPrompt(params: EmailGenerationParams): string {
    const {
      industry = 'business',
      companyName,
      contactName,
      website,
      location,
      companySize,
      tone = 'professional',
      purpose = 'introduce our services',
      productService = 'our solutions',
      callToAction = 'schedule a demo'
    } = params

    return `You are an expert email marketing copywriter. Generate a cold outreach email for a B2B sales campaign.

Context:
- Target Industry: ${industry}
${companyName ? `- Target Company: ${companyName}` : ''}
${contactName ? `- Contact Name: ${contactName}` : ''}
${website ? `- Company Website: ${website}` : ''}
${location ? `- Location: ${location}` : ''}
${companySize ? `- Company Size: ${companySize} employees` : ''}
- Email Tone: ${tone}
- Purpose: ${purpose}
- Product/Service: ${productService}
- Call to Action: ${callToAction}

Requirements:
1. Write a compelling subject line (under 60 characters, no quotes)
2. Write an email body that:
   - Opens with personalization (use {{contactName}} variable)
   - References the company (use {{companyName}} variable)
   - Is concise (under 150 words)
   - Includes specific value proposition for the ${industry} industry
   - Has a clear call to action
   - Ends with a professional signature placeholder
   - Uses template variables: {{contactName}}, {{companyName}}, {{website}}, {{industry}}

Format your response EXACTLY as:
SUBJECT: [your subject line]

BODY:
[your email body]

Write a ${tone} email that will get responses. Do not include quotation marks around the subject line.`
  }

  private parseEmailContent(content: string): { subject: string; body: string } {
    try {
      // Extract subject line
      const subjectMatch = content.match(/SUBJECT:\s*(.+?)(?:\n|$)/i)
      if (!subjectMatch) {
        throw new Error('Could not parse subject line from AI response')
      }
      
      // Extract body
      const bodyMatch = content.match(/BODY:\s*([\s\S]+?)$/i)
      if (!bodyMatch) {
        throw new Error('Could not parse body from AI response')
      }

      const subject = subjectMatch[1].trim()
      const body = bodyMatch[1].trim()

      // Validate minimum requirements
      if (subject.length < 10 || subject.length > 100) {
        throw new Error('Generated subject line length is invalid')
      }
      if (body.length < 50) {
        throw new Error('Generated email body is too short')
      }

      return { subject, body }
    } catch (error: any) {
      logger.error('Error parsing AI email content:', error)
      // Return fallback structure
      return {
        subject: 'Quick question about your business',
        body: content // Return raw content if parsing fails
      }
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: 'Hello'
        }]
      })
      return message.content.length > 0
    } catch (error: any) {
      logger.error('Anthropic API connection test failed:', error)
      return false
    }
  }
}

export const anthropicService = new AnthropicService()
