import { Request, Response } from 'express';
import { db } from '@leadnex/database';
import { campaigns, campaignLeads, leads } from '@leadnex/database';
import { eq, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';

export class CampaignsController {
  /**
   * GET /api/campaigns - Get all campaigns
   */
  async getCampaigns(req: Request, res: Response) {
    try {
      logger.info('[CampaignsController] Getting campaigns');

      const allCampaigns = await db
        .select()
        .from(campaigns)
        .orderBy(desc(campaigns.createdAt));

      res.json({
        success: true,
        data: allCampaigns,
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error getting campaigns', { error: error.message });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * GET /api/campaigns/:id - Get single campaign
   */
  async getCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const campaign = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, id))
        .limit(1);

      if (!campaign[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found' },
        });
      }

      // Get campaign leads
      const campaignLeadsData = await db
        .select()
        .from(campaignLeads)
        .where(eq(campaignLeads.campaignId, id));

      res.json({
        success: true,
        data: {
          ...campaign[0],
          leads: campaignLeadsData,
        },
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error getting campaign', { error: error.message });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/campaigns - Create new campaign
   */
  async createCampaign(req: Request, res: Response) {
    try {
      const {
        name,
        description,
        industry,
        targetCountry,
        targetCity,
        leadIds,
        scheduleType,
        scheduledAt,
      } = req.body;

      logger.info('[CampaignsController] Creating campaign', { name });

      // Create campaign
      const newCampaign = await db
        .insert(campaigns)
        .values({
          name,
          description,
          industry,
          targetCountry,
          targetCity,
          status: scheduleType === 'immediate' ? 'active' : 'scheduled',
          scheduleType,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          totalLeads: leadIds.length,
          sentCount: 0,
          openedCount: 0,
          clickedCount: 0,
          repliedCount: 0,
        })
        .returning();

      // Add leads to campaign
      if (leadIds && leadIds.length > 0) {
        const campaignLeadsData = leadIds.map((leadId: string) => ({
          campaignId: newCampaign[0].id,
          leadId,
          status: 'pending' as const,
        }));

        await db.insert(campaignLeads).values(campaignLeadsData);
      }

      res.json({
        success: true,
        data: newCampaign[0],
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error creating campaign', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * PUT /api/campaigns/:id - Update campaign
   */
  async updateCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const updated = await db
        .update(campaigns)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(campaigns.id, id))
        .returning();

      if (!updated[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found' },
        });
      }

      res.json({
        success: true,
        data: updated[0],
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error updating campaign', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/campaigns/:id/start - Start campaign
   */
  async startCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const updated = await db
        .update(campaigns)
        .set({ status: 'active', startedAt: new Date() })
        .where(eq(campaigns.id, id))
        .returning();

      if (!updated[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found' },
        });
      }

      logger.info('[CampaignsController] Campaign started', { id });

      res.json({
        success: true,
        data: updated[0],
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error starting campaign', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/campaigns/:id/pause - Pause campaign
   */
  async pauseCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const updated = await db
        .update(campaigns)
        .set({ status: 'paused' })
        .where(eq(campaigns.id, id))
        .returning();

      if (!updated[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found' },
        });
      }

      res.json({
        success: true,
        data: updated[0],
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error pausing campaign', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * DELETE /api/campaigns/:id - Delete campaign
   */
  async deleteCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Delete campaign leads first
      await db.delete(campaignLeads).where(eq(campaignLeads.campaignId, id));

      // Delete campaign
      await db.delete(campaigns).where(eq(campaigns.id, id));

      res.json({
        success: true,
        message: 'Campaign deleted successfully',
      });
    } catch (error: any) {
      logger.error('[CampaignsController] Error deleting campaign', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }
}

export const campaignsController = new CampaignsController();
