export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ResolvedEntities {
  lastBatchId?: string;
  lastBatchName?: string;
  lastWorkflowId?: string;
  lastWorkflowName?: string;
  lastCampaignId?: string;
  lastIndustry?: string;
  lastLocation?: string;
  lastCountry?: string;
  lastCity?: string;
}

export interface ConversationState {
  sessionId: string;
  messages: ConversationMessage[];
  resolvedEntities: ResolvedEntities;
  currentDraft?: any;
  currentIntent?: 'campaign' | 'workflow' | 'lead_batch';
  isLoading?: boolean;
}

export interface AICampaignDraft {
  name: string;
  description: string;
  campaignType: 'outreach' | 'lead_generation' | 'fully_automated';
  industry?: string;
  targetCountries?: string[];
  targetCities?: string[];
  companySize?: string;
  leadSources?: string[];
  maxResultsPerRun?: number;
  batchIds?: string[];
  workflowId?: string | null;
  useWorkflow?: boolean;
  leadsPerDay?: number;
  scheduleType?: string;
  scheduleTime?: string;
  startDate?: string;
  isRecurring?: boolean;
  recurringInterval?: string;
  outreachDelayDays?: number;
  followUpEnabled?: boolean;
  followUp1DelayDays?: number;
  followUp2DelayDays?: number;
  reasoning: string;
  suggestedWorkflowInstructions?: string;
}

export interface AIWorkflowDraft {
  name: string;
  description: string;
  industry?: string;
  country?: string;
  stepsCount: number;
  steps: Array<{
    stepNumber: number;
    daysAfterPrevious: number;
    subject: string;
    body: string;
  }>;
  aiInstructions?: string;
  reasoning: string;
}

export interface AILeadBatchDraft {
  name: string;
  source: string;
  industry: string;
  country?: string;
  city?: string;
  maxResults: number;
  enrichEmail: boolean;
  analyzeWebsite: boolean;
  reasoning: string;
}
