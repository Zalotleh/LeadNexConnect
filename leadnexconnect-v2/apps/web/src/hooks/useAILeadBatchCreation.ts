import { useMutation } from '@tanstack/react-query';
import { aiAPI } from '@/services/ai-api';
import { toast } from 'react-hot-toast';

export function useAILeadBatchCreation() {
  const parseLeadBatch = useMutation({
    mutationFn: aiAPI.parseLeadBatch,
    onError: (error: any) => {
      toast.error('Failed to parse lead batch');
      console.error('Lead batch parse error:', error);
    },
  });

  return {
    parseLeadBatch,
  };
}
