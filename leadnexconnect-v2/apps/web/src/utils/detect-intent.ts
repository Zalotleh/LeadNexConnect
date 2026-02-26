export type IntentType = 'campaign' | 'workflow' | 'lead_batch';

const CAMPAIGN_KEYWORDS = [
  'campaign', 'outreach', 'email campaign', 'run outreach',
  'start campaign', 'create campaign', 'launch campaign',
];

const WORKFLOW_KEYWORDS = [
  'workflow', 'email sequence', 'email series', 'follow-up sequence',
  'write emails', 'create emails', 'generate emails',
  '3-step', '2-step', '5-step', 'multi-step', 'email steps',
];

const LEAD_GEN_KEYWORDS = [
  'find leads', 'generate leads', 'scrape', 'search for',
  'get leads', 'find companies', 'find businesses', 'find clinics',
  'find salons', 'find gyms', 'find studios', 'lead batch',
  'create batch', 'import leads',
];

/**
 * Detect user intent from natural language message.
 * Runs entirely client-side — zero network overhead.
 * Default: 'campaign' (most common intent).
 */
export function detectIntent(message: string): IntentType {
  const lower = message.toLowerCase();

  const campaignScore = CAMPAIGN_KEYWORDS.filter(k => lower.includes(k)).length;
  const workflowScore = WORKFLOW_KEYWORDS.filter(k => lower.includes(k)).length;
  const leadScore     = LEAD_GEN_KEYWORDS.filter(k => lower.includes(k)).length;

  if (leadScore > campaignScore && leadScore > workflowScore) return 'lead_batch';
  if (workflowScore > campaignScore && workflowScore > leadScore) return 'workflow';
  return 'campaign'; // default — most messages are campaign-related
}
