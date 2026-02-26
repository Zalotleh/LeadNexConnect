import { useMutation } from '@tanstack/react-query';
import { aiAPI } from '@/services/ai-api';
import { toast } from 'react-hot-toast';

export function useAIWorkflowCreation() {
  const parseWorkflow = useMutation({
    mutationFn: aiAPI.parseWorkflow,
    onError: (error: any) => {
      toast.error('Failed to parse workflow');
      console.error('Workflow parse error:', error);
    },
  });

  return {
    parseWorkflow,
  };
}
