import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiAPI } from '@/services/ai-api';
import { toast } from 'react-hot-toast';

export function useAICampaignCreation() {
  const [context, setContext] = useState<any>(null);

  const fetchContext = useMutation({
    mutationFn: aiAPI.getContext,
    onSuccess: (data) => {
      setContext(data.data);
    },
    onError: (error: any) => {
      toast.error('Failed to load context');
      console.error('Context fetch error:', error);
    },
  });

  const parseCampaign = useMutation({
    mutationFn: aiAPI.parseCampaign,
    onError: (error: any) => {
      toast.error('Failed to parse campaign');
      console.error('Campaign parse error:', error);
    },
  });

  const generateWorkflow = useMutation({
    mutationFn: aiAPI.generateWorkflow,
    onError: (error: any) => {
      toast.error('Failed to generate workflow');
      console.error('Workflow generation error:', error);
    },
  });

  return {
    context,
    fetchContext,
    parseCampaign,
    generateWorkflow,
  };
}
