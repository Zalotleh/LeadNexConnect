export interface AIRequestLog {
  userId: string;
  sessionId: string;
  message: string; // truncated to 1000 chars
  intent: 'campaign' | 'workflow' | 'lead_batch' | 'unknown';
  draftJson: object | null;
  success: boolean;
  errorMessage?: string;
  durationMs: number;
}

export class AILoggerService {
  /**
   * Log an AI request for analytics and future fine-tuning.
   * Non-blocking — fires and forgets. Never throws.
   */
  async log(entry: AIRequestLog): Promise<void> {
    try {
      // Uncomment when ai_request_logs table is created via migration:
      // await db.insert(aiRequestLogs).values({
      //   userId: entry.userId,
      //   sessionId: entry.sessionId,
      //   message: entry.message.slice(0, 1000),
      //   intent: entry.intent,
      //   draftJson: entry.draftJson ? JSON.stringify(entry.draftJson) : null,
      //   success: entry.success,
      //   errorMessage: entry.errorMessage,
      //   durationMs: entry.durationMs,
      //   createdAt: new Date(),
      // });

      // For now, just log to console in structured format:
      console.log('[AILogger]', JSON.stringify({
        userId: entry.userId,
        sessionId: entry.sessionId,
        message: entry.message.slice(0, 200),
        intent: entry.intent,
        success: entry.success,
        durationMs: entry.durationMs,
        timestamp: new Date().toISOString(),
      }));
    } catch {
      // Never let logging crash the main request
    }
  }
}

/*
 * Migration to add later (no rush — just uncomment the db.insert block when ready):
 *
 * CREATE TABLE ai_request_logs (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID NOT NULL REFERENCES users(id),
 *   session_id TEXT NOT NULL,
 *   message TEXT NOT NULL,
 *   intent TEXT NOT NULL,
 *   draft_json JSONB,
 *   success BOOLEAN NOT NULL,
 *   error_message TEXT,
 *   duration_ms INTEGER NOT NULL,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 * CREATE INDEX idx_ai_logs_user ON ai_request_logs(user_id);
 * CREATE INDEX idx_ai_logs_created ON ai_request_logs(created_at DESC);
 */
