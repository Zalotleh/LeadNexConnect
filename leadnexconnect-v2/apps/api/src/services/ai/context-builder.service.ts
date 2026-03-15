import { db } from '@leadnex/database';
import { workflows, leadBatches, leads } from '@leadnex/database';
import { eq, desc, count } from 'drizzle-orm';
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

      // Fetch recent batches with accurate lead counts from the leads table
      const recentUserBatches = await db
        .select({
          id: leadBatches.id,
          name: leadBatches.name,
          actualLeadCount: count(leads.id),
          createdAt: leadBatches.createdAt,
          importSettings: leadBatches.importSettings,
        })
        .from(leadBatches)
        .leftJoin(leads, eq(leads.batchId, leadBatches.id))
        .where(eq(leadBatches.userId, userId))
        .groupBy(leadBatches.id, leadBatches.name, leadBatches.createdAt, leadBatches.importSettings)
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
            totalLeads: Number(b.actualLeadCount) || 0,
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
