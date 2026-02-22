import { Router } from 'express'
import { aiController } from '../controllers/ai.controller'

const router = Router()

// Generate email content using AI
router.post('/generate-email', (req, res) => aiController.generateEmailContent(req, res))

// Improve / edit an existing email using AI
router.post('/improve-email', (req, res) => aiController.improveEmailContent(req, res))

// Test AI connection
router.get('/test', (req, res) => aiController.testAI(req, res))

export default router
