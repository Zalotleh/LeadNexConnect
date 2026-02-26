import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { CampaignParserService } from '../services/ai/campaign-parser.service';
import { WorkflowParserService } from '../services/ai/workflow-parser.service';
import { LeadBatchParserService } from '../services/ai/lead-batch-parser.service';
import { ContextBuilderService } from '../services/ai/context-builder.service';
import { AILoggerService } from '../services/ai/ai-logger.service';
import { AIStreamService } from '../services/ai/ai-stream.service';
import { contextCache } from '../services/ai/context-cache';
import { sanitizeMessage } from '../utils/sanitize-message';
import { logger } from '../utils/logger';

// Note: IntentDetectorService has been MOVED TO THE FRONTEND (detectIntent.ts utility).
// Running intent detection server-side was a wasteful network round trip for pure string matching.
// The /detect-intent endpoint has been removed — use the frontend utility instead.

// ⚠️  OWNERSHIP VERIFICATION NOTE:
// When the AI draft is approved by the user and submitted to the real creation endpoints
// (POST /api/campaigns, POST /api/workflows, POST /api/scraping/*), those existing controllers
// MUST re-validate ownership of any referenced IDs (batchIds, workflowId) against req.user.id.
// Do NOT trust IDs that come back in the AI draft — a user could manipulate the draft JSON
// to reference another user's batchId before submitting. Verify during integration testing
// that all referenced IDs are scoped to the authenticated userId before any DB write.

export class AICampaignsController {
  private campaignParser = new CampaignParserService();
  private workflowParser = new WorkflowParserService();
  private leadBatchParser = new LeadBatchParserService();
  private contextBuilder = new ContextBuilderService();
  private aiLogger = new AILoggerService();
  private aiStream = new AIStreamService();

  /**
   * GET /api/ai-campaigns/context
   * Fetch workflows and batches for AI prompt context
   */
  async getContext(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;

      // Use cache — invalidate when user creates new workflow/batch
      const cached = contextCache.get(userId);
      if (cached) {
        return res.json({ success: true, data: cached });
      }

      const context = await this.contextBuilder.buildContext(userId);
      contextCache.set(userId, context);

      return res.json({
        success: true,
        data: context,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[AICampaigns] Error fetching context:', msg);
      return res.status(500).json({
        success: false,
        error: { message: msg },
      });
    }
  }

  /**
   * POST /api/ai-campaigns/parse
   * Parse user message into campaign draft
   */
  async parseCampaign(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const { message, conversationHistory, resolvedEntities } = req.body;
    const startTime = Date.now();
    let draft = null;
    let parseSuccess = false;

    try {
      // Input validation
      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Message is required' },
        });
      }
      if (message.length > 2000) {
        return res.status(400).json({
          success: false,
          error: { message: 'Message too long (max 2000 characters)' },
        });
      }

      // Security: keyword pre-filter — blocks prompt injection / extraction attempts
      const sanitized = sanitizeMessage(message);
      if (!sanitized.safe) {
        logger.warn(`[AICampaigns] Blocked message from user ${userId}: ${sanitized.reason}`);
        return res.status(400).json({
          success: false,
          error: { message: 'Message contains disallowed content.' },
        });
      }

      // Build context (cache hit avoids DB query)
      const cached = contextCache.get(userId);
      const context = cached || await this.contextBuilder.buildContext(userId);
      if (!cached) contextCache.set(userId, context);

      // Parse campaign
      draft = await this.campaignParser.parseCampaign(
        { message, conversationHistory, resolvedEntities },
        context
      );
      parseSuccess = true;

      return res.json({
        success: true,
        draft,
      });
    } catch (parseError: unknown) {
      const msg = parseError instanceof Error ? parseError.message : String(parseError);
      logger.error('[AICampaigns] Error parsing campaign:', msg);
      return res.status(500).json({
        success: false,
        error: { message: msg },
      });
    } finally {
      // Log every AI request — non-blocking, fire-and-forget
      void this.aiLogger.log({
        userId,
        sessionId: req.body.sessionId || 'unknown',
        message: message || '',
        intent: 'campaign',
        draftJson: draft,
        success: parseSuccess,
        durationMs: Date.now() - startTime,
      });
    }
  }

  /**
   * POST /api/ai-campaigns/stream
   * Stream campaign parse as SSE — reasoning steps + draft fields in real time.
   * This is the primary endpoint for the A2 Command Center UI.
   */
  async streamCampaignParse(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { message, conversationHistory, resolvedEntities } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({ success: false, error: { message: 'Message is required' } });
      }
      if (message.length > 2000) {
        return res.status(400).json({ success: false, error: { message: 'Message too long (max 2000 characters)' } });
      }

      // Security: pre-filter prompt injection before sending to Claude
      const sanitized = sanitizeMessage(message);
      if (!sanitized.safe) {
        logger.warn(`[AICampaigns] Blocked stream message from user ${userId}: ${sanitized.reason}`);
        return res.status(400).json({ success: false, error: { message: 'Message contains disallowed content.' } });
      }

      // Build context (cache hit avoids DB query)
      const cached = contextCache.get(userId);
      const context = cached || await this.contextBuilder.buildContext(userId);
      if (!cached) contextCache.set(userId, context);

      // Stream — this sets SSE headers and writes directly to res
      await this.aiStream.streamCampaignParse(
        res,
        message,
        context,
        resolvedEntities,
        conversationHistory
      );

      // Log after stream completes (non-blocking)
      void this.aiLogger.log({
        userId,
        sessionId: req.body.sessionId || 'unknown',
        message,
        intent: 'campaign',
        draftJson: null, // draft is in the stream, not captured here
        success: true,
        durationMs: 0,
      });

      return;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      // If headers already sent (SSE started), can't send JSON error
      if (!res.headersSent) {
        return res.status(500).json({ success: false, error: { message: msg } });
      }
      return;
    }
  }

  /**
   * POST /api/ai-campaigns/generate-workflow
   * Generate workflow for campaign on demand
   */
  async generateWorkflow(req: AuthRequest, res: Response) {
    try {
      const { industry, country, instructions } = req.body;

      const message = instructions || `Generate a 3-step email workflow for ${industry} businesses${country ? ` in ${country}` : ''}.`;

      const draft = await this.workflowParser.parseWorkflow({
        message,
        industry,
        country,
      });

      return res.json({
        success: true,
        draft,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[AICampaigns] Error generating workflow:', msg);
      return res.status(500).json({
        success: false,
        error: { message: msg },
      });
    }
  }

  /**
   * POST /api/ai-campaigns/parse-workflow
   * Parse user message into workflow draft
   */
  async parseWorkflow(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { message, industry, country } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Message is required' },
        });
      }

      // Security: pre-filter prompt injection before sending to Claude
      const sanitized = sanitizeMessage(message);
      if (!sanitized.safe) {
        logger.warn(`[AICampaigns] Blocked workflow message from user ${userId}: ${sanitized.reason}`);
        return res.status(400).json({
          success: false,
          error: { message: 'Message contains disallowed content.' },
        });
      }

      const draft = await this.workflowParser.parseWorkflow({
        message,
        industry,
        country,
      });

      return res.json({
        success: true,
        draft,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[AICampaigns] Error parsing workflow:', msg);
      return res.status(500).json({
        success: false,
        error: { message: msg },
      });
    }
  }

  /**
   * POST /api/ai-campaigns/parse-lead-batch
   * Parse user message into lead batch config
   */
  async parseLeadBatch(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { message, currentDraft } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Message is required' },
        });
      }

      // Security: pre-filter prompt injection before sending to Claude
      const sanitized = sanitizeMessage(message);
      if (!sanitized.safe) {
        logger.warn(`[AICampaigns] Blocked lead batch message from user ${userId}: ${sanitized.reason}`);
        return res.status(400).json({
          success: false,
          error: { message: 'Message contains disallowed content.' },
        });
      }

      const draft = await this.leadBatchParser.parseLeadBatch({ message, currentDraft });

      return res.json({
        success: true,
        draft,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[AICampaigns] Error parsing lead batch:', msg);
      
      // Clean up validation errors for user-friendly display
      let userMsg = msg;
      if (msg.includes('invalid_enum_value') || msg.includes('"received"')) {
        userMsg = 'I had trouble understanding that request. Please try rephrasing it.';
      }
      
      return res.status(500).json({
        success: false,
        error: { message: userMsg },
      });
    }
  }
}
