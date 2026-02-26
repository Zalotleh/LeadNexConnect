import { useCallback, useRef, useState } from 'react';

export type SSEEventType = 'reasoning' | 'draft_field' | 'draft_complete' | 'error' | 'done';

export interface SSEEvent {
  type: SSEEventType;
  step?: string;       // for 'reasoning'
  field?: string;      // for 'draft_field'
  value?: unknown;     // for 'draft_field'
  draft?: object;      // for 'draft_complete'
  message?: string;    // for 'error'
}

interface UseSSEStreamOptions {
  onReasoning: (step: string) => void;
  onDraftField: (field: string, value: unknown) => void;
  onDraftComplete: (draft: object) => void;
  onError: (message: string) => void;
  onDone: () => void;
}

export function useSSEStream(options: UseSSEStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (payload: {
    message: string;
    sessionId?: string;
    conversationHistory?: any[];
    resolvedEntities?: any;
  }) => {
    // Abort any existing stream
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsStreaming(true);

    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai-campaigns/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        options.onError('Stream connection failed');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event: SSEEvent = JSON.parse(line.slice(6));
            switch (event.type) {
              case 'reasoning':
                if (event.step) options.onReasoning(event.step);
                break;
              case 'draft_field':
                if (event.field !== undefined) options.onDraftField(event.field, event.value);
                break;
              case 'draft_complete':
                if (event.draft) options.onDraftComplete(event.draft);
                break;
              case 'error':
                options.onError(event.message || 'Unknown error');
                break;
              case 'done':
                options.onDone();
                break;
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        options.onError(err.message);
      }
    } finally {
      setIsStreaming(false);
    }
  }, [options]);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return { startStream, cancelStream, isStreaming };
}
