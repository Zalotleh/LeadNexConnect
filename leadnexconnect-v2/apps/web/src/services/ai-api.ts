// Import the shared api instance that already has auth interceptors configured.
// Do NOT create a new axios instance here — that bypasses 401 handling and token refresh.
import api from '@/services/api';

export const aiAPI = {
  // Get context (workflows + batches)
  getContext: async () => {
    const response = await api.get('/ai-campaigns/context');
    return response.data;
  },

  // Parse campaign from message
  parseCampaign: async (data: {
    message: string;
    sessionId?: string;
    conversationHistory?: any[];
    resolvedEntities?: any;
  }) => {
    const response = await api.post('/ai-campaigns/parse', data);
    return response.data;
  },

  // Generate workflow on demand (user-initiated — NOT automatic)
  generateWorkflow: async (data: {
    industry?: string;
    country?: string;
    instructions?: string;
  }) => {
    const response = await api.post('/ai-campaigns/generate-workflow', data);
    return response.data;
  },

  // Parse workflow from message
  parseWorkflow: async (data: { message: string; industry?: string; country?: string; conversationHistory?: any[]; resolvedEntities?: any }) => {
    const response = await api.post('/ai-campaigns/parse-workflow', data);
    return response.data;
  },

  // Parse lead batch from message
  parseLeadBatch: async (data: { message: string; currentDraft?: any }) => {
    const response = await api.post('/ai-campaigns/parse-lead-batch', data);
    return response.data;
  },

  // NOTE: detectIntent is intentionally NOT here anymore.
  // Use the frontend utility: import { detectIntent } from '@/utils/detect-intent';
};
