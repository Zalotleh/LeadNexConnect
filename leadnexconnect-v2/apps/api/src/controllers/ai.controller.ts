import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { anthropicService } from '../services/ai/anthropic.service'
import { EmailGeneratorService } from '../services/outreach/email-generator.service'
import { logger } from '../utils/logger'

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

  async testAI(req: AuthRequest, res: Response) {
    try {
      const isConnected = await anthropicService.testConnection()
      
      res.json({
        success: true,
        data: {
          connected: isConnected,
          provider: 'Anthropic Claude',
          model: 'claude-3-5-sonnet-20241022'
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
