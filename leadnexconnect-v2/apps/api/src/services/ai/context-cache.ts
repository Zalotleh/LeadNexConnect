import { AIContextResponse } from '../../types/ai-responses.types';

interface CacheEntry {
  data: AIContextResponse;
  expiresAt: number;
}

const TTL_MS = 30_000; // 30 seconds
const cache = new Map<string, CacheEntry>();

export const contextCache = {
  get(userId: string): AIContextResponse | null {
    const entry = cache.get(userId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.delete(userId);
      return null;
    }
    return entry.data;
  },

  set(userId: string, data: AIContextResponse): void {
    cache.set(userId, { data, expiresAt: Date.now() + TTL_MS });
  },

  invalidate(userId: string): void {
    cache.delete(userId);
  },
};
