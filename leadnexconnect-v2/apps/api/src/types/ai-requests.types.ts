export interface AICampaignParseRequest {
  message: string;
  conversationHistory?: ConversationMessage[];
  resolvedEntities?: ResolvedEntities;
}

export interface AIWorkflowParseRequest {
  message: string;
  conversationHistory?: ConversationMessage[];
  industry?: string;
  country?: string;
}

export interface AILeadBatchParseRequest {
  message: string;
  conversationHistory?: ConversationMessage[];
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
