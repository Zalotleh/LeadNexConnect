import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthRequest } from '../middleware/auth.middleware';
import { AICampaignsController } from '../controllers/ai-campaigns.controller';

const router = Router();
const controller = new AICampaignsController();

// Rate limiter: 20 AI requests per user per minute
// Scoped to these routes only — won't affect the rest of the API
const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,      // 1 minute window
  max: 20,                   // 20 requests per window per user
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as AuthRequest).user?.id || req.ip || 'unknown',
  message: {
    success: false,
    error: { message: 'Too many AI requests. Please wait a moment before trying again.' },
  },
});

// Apply rate limiter to all AI routes
router.use(aiRateLimit);

// Get context for AI (workflows + batches)
router.get('/context', controller.getContext.bind(controller));

// Parse user message into campaign draft
router.post('/parse', controller.parseCampaign.bind(controller));

// Stream campaign parse as SSE (primary path for Command Center UI)
router.post('/stream', controller.streamCampaignParse.bind(controller));

// Generate workflow on demand (user-initiated — NOT automatic)
router.post('/generate-workflow', controller.generateWorkflow.bind(controller));

// Parse workflow from message
router.post('/parse-workflow', controller.parseWorkflow.bind(controller));

// Parse lead batch from message
router.post('/parse-lead-batch', controller.parseLeadBatch.bind(controller));

export default router;
