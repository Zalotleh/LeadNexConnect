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
  // numeric patterns: "find 50 X in Y", "get me 100 X"
  'find 1', 'find 2', 'find 3', 'find 4', 'find 5',
  'find 6', 'find 7', 'find 8', 'find 9',
  'get me', 'locate', 'discover', 'list of',
  'dentist', 'dental', 'clinic', 'salon', 'spa', 'gym', 'studio',
  'restaurant', 'hotel', 'store', 'shop', 'agency', 'firm',
  // source-related keywords for modifications
  'apollo', 'google places', 'hunter', 'peopledatalabs',
  'change source', 'use apollo', 'use google', 'switch to',
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
