import { Request, Response } from 'express'
import { anthropicService } from '../services/ai/anthropic.service'
import { logger } from '../utils/logger'

class AIController {
  async generateEmailContent(req: Request, res: Response) {
    try {
      const {
        industry,
        companyName,
        contactName,
        website,
        location,
        companySize,
        tone = 'professional',
        purpose,
        productService,
        callToAction
      } = req.body

      logger.info('Received request to generate email content', { 
        industry, 
        tone,
        companyName 
      })

      // Validate required fields
      if (!industry && !companyName) {
        return res.status(400).json({
          success: false,
          message: 'At least industry or company name is required for context'
        })
      }

      // Generate email content using Anthropic
      const result = await anthropicService.generateEmailContent({
        industry,
        companyName,
        contactName,
        website,
        location,
        companySize,
        tone,
        purpose,
        productService,
        callToAction
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

  async testAI(req: Request, res: Response) {
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
