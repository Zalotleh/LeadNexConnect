import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { anthropicService } from '../services/ai/anthropic.service'
import { EmailGeneratorService } from '../services/outreach/email-generator.service'
import { logger } from '../utils/logger'
import { settingsService } from '../services/settings.service'
import Anthropic from '@anthropic-ai/sdk'

class AIController {
  private emailGeneratorService = new EmailGeneratorService();

  async generateEmailContent(req: AuthRequest, res: Response) {
    try {
      const {
        industry,
        companyName,
        contactName,
        website,
        city,
        country,
        followUpStage,
        additionalInstructions,
        jobTitle
      } = req.body

      logger.info('Received request to generate email content', { 
        industry, 
        companyName,
        contactName
      })

      // Validate required fields
      if (!industry || !companyName) {
        return res.status(400).json({
          success: false,
          message: 'Industry and company name are required'
        })
      }

      // Generate email content using AI (now returns HTML)
      const result = await this.emailGeneratorService.generateWithAI({
        industry,
        companyName,
        contactName,
        city,
        country,
        followUpStage,
        additionalInstructions,
        jobTitle,
        website
      })

      res.json({
        success: true,
        data: result
      })
    } catch (error: any) {
      logger.error('Error in generateEmailContent controller:', error)
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate email content'
      })
    }
  }

  /**
   * POST /api/ai/improve-email
   * Improve / edit an existing email based on user instructions.
   * Unlike generate-email, this keeps the original structure and only applies the requested changes.
   */
  async improveEmailContent(req: AuthRequest, res: Response) {
    try {
      const { existingEmail, instructions } = req.body

      if (!existingEmail || !existingEmail.trim()) {
        return res.status(400).json({ success: false, message: 'existingEmail is required' })
      }

      const apiKey = await settingsService.get('anthropicApiKey', process.env.ANTHROPIC_API_KEY || '')
      if (!apiKey) {
        return res.status(500).json({ success: false, message: 'AI API key not configured' })
      }

      const anthropic = new Anthropic({ apiKey })

      const prompt = `You are an expert email editor. Your job is to improve the email below based on the user's instructions.

RULES:
- Keep all template variables exactly as-is (e.g. {{contactName}}, {{companyName}}, {{signature}}). Do NOT replace them with real values.
- Keep the overall structure and intent of the original email unless instructed otherwise.
- Apply ONLY the changes the user requests. Do not rewrite parts that don't need changing.
- Return ONLY the improved email body (no preamble, no explanation, no markdown code block).
- Preserve line breaks and paragraph spacing from the original.

ORIGINAL EMAIL:
---
${existingEmail.trim()}
---

USER INSTRUCTIONS:
${instructions?.trim() || 'Improve the overall quality, clarity and call to action of this email.'}

Return the improved email now:`

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      })

      const improvedText = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

      // Convert plain text to HTML (preserve line breaks)
      const improvedHtml = improvedText
        .split(/\n{2,}/)
        .filter((p: string) => p.trim())
        .map((p: string) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('')

      res.json({
        success: true,
        data: {
          bodyText: improvedText,
          bodyHtml: improvedHtml,
        },
      })
    } catch (error: any) {
      logger.error('Error in improveEmailContent controller:', error)
      res.status(500).json({ success: false, message: error.message || 'Failed to improve email' })
    }
  }

  async testAI(req: AuthRequest, res: Response) {
    try {
      const isConnected = await anthropicService.testConnection()
      
      res.json({
        success: true,
        data: {
          connected: isConnected,
          provider: 'Anthropic Claude',
          model: 'claude-sonnet-4-20250514'
        }
      })
    } catch (error: any) {
      logger.error('Error testing AI connection:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to test AI connection'
      })
    }
  }
}

export const aiController = new AIController()
