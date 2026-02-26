import { useState, useCallback } from 'react';
import { ConversationState, ConversationMessage, ResolvedEntities } from '@/types/ai-conversation.types';

export function useConversationState() {
  const [state, setState] = useState<ConversationState>({
    sessionId: `session-${Date.now()}`,
    messages: [],
    resolvedEntities: {},
    currentDraft: null,
    currentIntent: undefined,
    isLoading: false,
  });

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    setState(prev => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          role,
          content,
          timestamp: new Date(),
        },
      ],
    }));
  }, []);

  const updateEntities = useCallback((entities: Partial<ResolvedEntities>) => {
    setState(prev => ({
      ...prev,
      resolvedEntities: {
        ...prev.resolvedEntities,
        ...entities,
      },
    }));
  }, []);

  const setDraft = useCallback((draft: any, intent: 'campaign' | 'workflow' | 'lead_batch') => {
    setState(prev => ({
      ...prev,
      currentDraft: draft,
      currentIntent: intent,
    }));
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      sessionId: `session-${Date.now()}`,
      messages: [],
      resolvedEntities: {},
      currentDraft: null,
      currentIntent: undefined,
      isLoading: false,
    });
  }, []);

  return {
    state,
    addMessage,
    updateEntities,
    setDraft,
    setLoading,
    reset,
  };
}
