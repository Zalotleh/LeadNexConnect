export interface AICampaignDraft {
  name: string;
  description: string;
  campaignType: 'outreach' | 'lead_generation' | 'fully_automated';

  // Target criteria
  industry?: string;
  targetCountries?: string[];
  targetCities?: string[];
  companySize?: string;

  // Lead generation config
  leadSources?: string[];
  maxResultsPerRun?: number;

  // Outreach config
  batchIds?: string[];
  workflowId?: string | null;
  useWorkflow?: boolean;

  // Schedule config
  leadsPerDay?: number;
  scheduleType?: 'manual' | 'immediate' | 'scheduled' | 'daily' | 'weekly';
  scheduleTime?: string;
  startDate?: string;

  // Automation config
  isRecurring?: boolean;
  recurringInterval?: 'daily' | 'every_2_days' | 'weekly' | 'monthly';
  outreachDelayDays?: number;

  // Follow-up config
  followUpEnabled?: boolean;
  followUp1DelayDays?: number | null;
  followUp2DelayDays?: number | null;

  // AI reasoning
  reasoning: string;
  suggestedWorkflowInstructions?: string;
}

export interface AIWorkflowDraft {
  name: string;
  description: string;
  industry?: string;
  country?: string;
  stepsCount: number;
  steps: AIWorkflowStep[];
  aiInstructions?: string;
  reasoning: string;
}

export interface AIWorkflowStep {
  stepNumber: number;
  daysAfterPrevious: number;
  subject: string;
  body: string;
}

export interface AILeadBatchDraft {
  name: string;
  source: 'apollo' | 'google_places' | 'hunter' | 'peopledatalabs';
  industry: string;
  country?: string;
  city?: string;
  maxResults: number;
  enrichEmail: boolean;
  analyzeWebsite: boolean;
  reasoning: string;
}

export interface AIContextResponse {
  workflows: Array<{
    id: string;
    name: string;
    stepsCount: number;
    industry?: string;
    country?: string;
    createdAt?: string;
  }>;
  recentBatches: Array<{
    id: string;
    name: string;
    totalLeads: number;
    createdAt: string;
    industry?: string;
    city?: string;
    country?: string;
  }>;
}

export interface AICampaignParseResponse {
  success: boolean;
  draft?: AICampaignDraft;
  error?: string;
}

export interface AIWorkflowParseResponse {
  success: boolean;
  draft?: AIWorkflowDraft;
  error?: string;
}

export interface AILeadBatchParseResponse {
  success: boolean;
  draft?: AILeadBatchDraft;
  error?: string;
}

// ── Security & robustness response types ──────────────────────────────────────

export type AIParseStatus = 'ok' | 'needs_clarification' | 'off_topic' | 'policy_violation';

/**
 * Returned when Claude cannot complete the request because a required field
 * (e.g. industry, location) is missing. The UI renders this as a follow-up
 * question bubble — no draft card is shown.
 */
export interface AIClarificationResponse {
  status: 'needs_clarification';
  question: string;
  missingFields: string[];
}

/**
 * Returned when the user's message is off-topic (unrelated to campaigns/leads/workflows)
 * or when a prompt injection / extraction attempt is detected.
 * Also used for content policy violations in workflow generation.
 */
export interface AIRejectionResponse {
  status: 'off_topic' | 'policy_violation';
  message: string;
}

/**
 * Union of a valid draft T with the two special non-draft responses.
 * Use this as the return type in service methods so callers must handle all cases.
 */
export type AIParseResult<T> = T | AIClarificationResponse | AIRejectionResponse;

/** Type guard — narrows to AIClarificationResponse */
export function isClarification(r: unknown): r is AIClarificationResponse {
  return typeof r === 'object' && r !== null && (r as Record<string, unknown>).status === 'needs_clarification';
}

/** Type guard — narrows to AIRejectionResponse */
export function isRejection(r: unknown): r is AIRejectionResponse {
  return typeof r === 'object' && r !== null &&
    ((r as Record<string, unknown>).status === 'off_topic' || (r as Record<string, unknown>).status === 'policy_violation');
}
