import { db } from '@leadnex/database';
import { workflows, leadBatches } from '@leadnex/database/src/schema';
import { eq, desc } from 'drizzle-orm';
import { AIContextResponse } from '../../types/ai-responses.types';

export class ContextBuilderService {
  /**
   * Fetch workflows and recent batches for AI prompt context
   */
  async buildContext(userId: string): Promise<AIContextResponse> {
    try {
      // Fetch user's workflows (active only)
      const userWorkflows = await db
        .select({
          id: workflows.id,
          name: workflows.name,
          stepsCount: workflows.stepsCount,
          industry: workflows.industry,
          country: workflows.country,
          createdAt: workflows.createdAt,
        })
        .from(workflows)
        .where(eq(workflows.userId, userId))
        .orderBy(desc(workflows.createdAt))
        .limit(20);

      // Fetch recent batches (last 30 days, max 20)
      const recentUserBatches = await db
        .select({
          id: leadBatches.id,
          name: leadBatches.name,
          totalLeads: leadBatches.totalLeads,
          createdAt: leadBatches.createdAt,
          importSettings: leadBatches.importSettings,
        })
        .from(leadBatches)
        .where(eq(leadBatches.userId, userId))
        .orderBy(desc(leadBatches.createdAt))
        .limit(20);

      return {
        workflows: userWorkflows.map(w => ({
          id: w.id,
          name: w.name,
          stepsCount: w.stepsCount || 1,
          industry: w.industry || undefined,
          country: w.country || undefined,
          createdAt: w.createdAt?.toISOString() || undefined,
        })),
        recentBatches: recentUserBatches.map(b => {
          const settings = b.importSettings as any;
          return {
            id: b.id,
            name: b.name,
            totalLeads: b.totalLeads || 0,
            createdAt: b.createdAt?.toISOString() || new Date().toISOString(),
            industry: settings?.industry || undefined,
            city: settings?.city || settings?.cities?.[0] || undefined,
            country: settings?.country || settings?.countries?.[0] || undefined,
          };
        }),
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[ContextBuilder] Error building context:', msg);
      return {
        workflows: [],
        recentBatches: [],
      };
    }
  }
}
