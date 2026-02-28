export type IntentType = 'campaign' | 'workflow' | 'lead_batch';

const CAMPAIGN_KEYWORDS = [
  'campaign', 'outreach', 'email campaign', 'run outreach',
  'start campaign', 'create campaign', 'launch campaign',
];

const WORKFLOW_KEYWORDS = [
  'workflow', 'email sequence', 'email series', 'follow-up sequence',
  'write emails', 'create emails', 'generate emails',
  '3-step', '2-step', '5-step', 'multi-step', 'email steps',
  'sequence for', 'emails for', 'follow-up for', 'nurture sequence',
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

  // Check for explicit intent keywords that should override scoring
  // "create a workflow", "just want to create a workflow", "not a campaign"
  const explicitlyNotCampaign = lower.includes('not a campaign') || lower.includes('not campaign');
  const hasWorkflowIntent = 
    lower.includes('create a workflow') || 
    lower.includes('create workflow') || 
    (lower.includes('just want') && lower.includes('workflow')) ||
    (lower.includes('only') && lower.includes('workflow'));

  if (hasWorkflowIntent || (explicitlyNotCampaign && lower.includes('workflow'))) {
    return 'workflow';
  }

  // "for these leads", "for the leads batch", "for existing leads" = not lead generation
  const isReferringToExistingLeads = 
    lower.includes('for these leads') ||
    lower.includes('for the leads') ||
    lower.includes('for existing leads') ||
    lower.includes('for those leads') ||
    (lower.includes('for') && lower.includes('leads batch we created')) ||
    (lower.includes('for') && lower.includes('leads we'));

  const campaignScore = CAMPAIGN_KEYWORDS.filter(k => lower.includes(k)).length;
  const workflowScore = WORKFLOW_KEYWORDS.filter(k => lower.includes(k)).length;
  let leadScore = LEAD_GEN_KEYWORDS.filter(k => lower.includes(k)).length;

  // If referring to existing leads, don't count lead keywords
  if (isReferringToExistingLeads) {
    leadScore = 0;
  }

  if (leadScore > campaignScore && leadScore > workflowScore) return 'lead_batch';
  if (workflowScore > campaignScore && workflowScore > leadScore) return 'workflow';
  return 'campaign'; // default — most messages are campaign-related
}
