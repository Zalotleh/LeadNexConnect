import { z } from 'zod';

export const campaignDraftSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  campaignType: z.enum(['outreach', 'lead_generation', 'fully_automated']).default('outreach'),
  industry: z.string().optional(),
  targetCountries: z.array(z.string()).optional(),
  targetCities: z.array(z.string()).optional(),
  companySize: z.string().optional(),
  leadSources: z.array(z.string()).optional(),
  maxResultsPerRun: z.number().min(1).max(1000).optional(),
  batchIds: z.array(z.string()).optional(),
  workflowId: z.string().nullable().optional(),
  useWorkflow: z.boolean().optional(),
  leadsPerDay: z.number().min(1).max(500).default(30),
  scheduleType: z.preprocess(
    (val) => {
      // Normalize AI-generated aliases to valid enum values
      if (val === 'once' || val === 'one_time' || val === 'one-time') return 'immediate';
      return val;
    },
    z.enum(['manual', 'immediate', 'scheduled', 'daily', 'weekly'])
  ).default('daily'),
  scheduleTime: z.string().default('09:00'),
  startDate: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringInterval: z.enum(['daily', 'every_2_days', 'weekly', 'monthly']).optional(),
  outreachDelayDays: z.number().optional(),
  followUpEnabled: z.boolean().default(true),
  followUp1DelayDays: z.preprocess(val => (val === null || val === undefined) ? null : typeof val === 'string' ? parseInt(val, 10) : val, z.number().min(0).nullable()).default(null),
  followUp2DelayDays: z.preprocess(val => (val === null || val === undefined) ? null : typeof val === 'string' ? parseInt(val, 10) : val, z.number().min(0).nullable()).default(null),
  reasoning: z.string().default(''),
  suggestedWorkflowInstructions: z.string().optional(),
});

export const workflowDraftSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  industry: z.string().optional(),
  country: z.string().optional(),
  stepsCount: z.preprocess(val => typeof val === 'string' ? parseInt(val, 10) : val, z.number().min(1).max(10)),
  steps: z.array(z.object({
    stepNumber: z.preprocess(val => typeof val === 'string' ? parseInt(val, 10) : val, z.number()),
    daysAfterPrevious: z.preprocess(val => typeof val === 'string' ? parseInt(val, 10) : val, z.number().min(0)),
    subject: z.string().min(1),
    body: z.string().min(1),
  })),
  aiInstructions: z.string().optional(),
  reasoning: z.string().default(''),
});

export const leadBatchDraftSchema = z.object({
  name: z.string().min(1),
  source: z.enum(['apollo', 'google_places', 'hunter', 'peopledatalabs']),
  industry: z.string().min(1),
  country: z.string().optional(),
  city: z.string().optional(),
  maxResults: z.number().min(1).max(500).default(50),
  enrichEmail: z.boolean().default(true),
  analyzeWebsite: z.boolean().default(true),
  reasoning: z.string().default(''),
});

export type CampaignDraftSchema = z.infer<typeof campaignDraftSchema>;
export type WorkflowDraftSchema = z.infer<typeof workflowDraftSchema>;
export type LeadBatchDraftSchema = z.infer<typeof leadBatchDraftSchema>;

// ── Special response schemas (non-draft) ──────────────────────────────────────

export const clarificationSchema = z.object({
  status: z.literal('needs_clarification'),
  question: z.string().min(1),
  missingFields: z.array(z.string()),
});

export const rejectionSchema = z.object({
  status: z.enum(['off_topic', 'policy_violation']),
  message: z.string().min(1),
});

/**
 * Smart union parser — checks for a `status` field first.
 * If present: parses as clarification or rejection.
 * If absent: parses using the provided draft schema.
 * Throws on Zod validation failure (invalid draft from Claude).
 */
export function parseAIResponse<T>(
  schema: z.ZodSchema<T>,
  raw: unknown
): T | z.infer<typeof clarificationSchema> | z.infer<typeof rejectionSchema> {
  if (raw && typeof raw === 'object' && 'status' in raw) {
    const status = (raw as Record<string, unknown>).status;
    if (status === 'needs_clarification') return clarificationSchema.parse(raw);
    if (status === 'off_topic' || status === 'policy_violation') return rejectionSchema.parse(raw);
  }
  return schema.parse(raw);
}
