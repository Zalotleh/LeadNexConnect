export interface AICampaignParseRequest {
  message: string;
  conversationHistory?: ConversationMessage[];
  resolvedEntities?: ResolvedEntities;
}

export interface AIWorkflowParseRequest {
  message: string;
  conversationHistory?: ConversationMessage[];
  resolvedEntities?: ResolvedEntities;
  industry?: string;
  country?: string;
  availableLeadBatches?: Array<{
    id: string;
    name: string;
    totalLeads: number;
    createdAt: string;
    industry?: string;
    city?: string;
    country?: string;
  }>;
  availableWorkflows?: Array<{
    id: string;
    name: string;
    stepsCount: number;
    industry?: string;
    country?: string;
    createdAt?: string;
  }>;
}

export interface AILeadBatchParseRequest {
  message: string;
  conversationHistory?: ConversationMessage[];
  currentDraft?: any;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
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

export interface AIContextRequest {
  userId: string;
}
