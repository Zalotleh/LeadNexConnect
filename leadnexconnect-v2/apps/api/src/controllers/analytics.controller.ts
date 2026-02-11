import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { db } from '@leadnex/database';
import { leads, campaigns, emails } from '@leadnex/database';
import { eq, gte, sql, and, lt } from 'drizzle-orm';
import { logger } from '../utils/logger';

export class AnalyticsController {
  /**
   * GET /api/analytics/dashboard - Get dashboard statistics
   * Query params: month, year, allTime
   */
  async getDashboardStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { month, year, allTime } = req.query;
      logger.info('[AnalyticsController] Getting dashboard stats', { month, year, allTime });

      // Build date filter
      let dateFilter;
      if (!allTime && month && year) {
        const selectedMonth = parseInt(month as string);
        const selectedYear = parseInt(year as string);
        const periodStart = new Date(selectedYear, selectedMonth - 1, 1);
        const periodEnd = new Date(selectedYear, selectedMonth, 1);
        
        dateFilter = and(
          eq(leads.userId, userId),
          gte(leads.createdAt, periodStart),
          lt(leads.createdAt, periodEnd)
        );
      } else {
        dateFilter = eq(leads.userId, userId);
      }

      // Total leads with date filter
      const allLeads = await db.select().from(leads).where(dateFilter);
      
      const totalLeads = allLeads.length;

      // Leads by quality score (hot/warm/cold)
      const hotLeads = allLeads.filter((l) => (l.qualityScore || 0) >= 80).length;
      const warmLeads = allLeads.filter((l) => (l.qualityScore || 0) >= 60 && (l.qualityScore || 0) < 80).length;
      const coldLeads = allLeads.filter((l) => (l.qualityScore || 0) < 60).length;

      // Leads by status
      const newLeads = allLeads.filter((l) => l.status === 'new').length;
      const contactedLeads = allLeads.filter((l) => l.status === 'contacted').length;
      const interestedLeads = allLeads.filter((l) => l.status === 'interested').length;
      const convertedLeads = allLeads.filter((l) => l.status === 'converted').length;

      // Total campaigns
      const allCampaigns = await db.select().from(campaigns).where(eq(campaigns.userId, userId));
      const totalCampaigns = allCampaigns.length;
      const activeCampaigns = allCampaigns.filter((c) => c.status === 'active').length;

      // Email metrics - filter by user's leads
      const userLeadIds = allLeads.map(l => l.id);
      const allEmails = userLeadIds.length > 0 
        ? await db.select().from(emails).where(sql`${emails.leadId} IN (${sql.join(userLeadIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      const totalEmailsSent = allEmails.filter((e) => e.status === 'sent' || e.status === 'delivered').length;
      const emailsOpened = allEmails.filter((e) => e.openedAt !== null).length;
      const emailsClicked = allEmails.filter((e) => e.clickedAt !== null).length;
      const emailsReplied = allEmails.filter((e) => e.status === 'delivered').length; // No repliedAt field

      // Calculate rates
      const openRate = totalEmailsSent > 0 ? (emailsOpened / totalEmailsSent) * 100 : 0;
      const clickRate = totalEmailsSent > 0 ? (emailsClicked / totalEmailsSent) * 100 : 0;
      const replyRate = totalEmailsSent > 0 ? (emailsReplied / totalEmailsSent) * 100 : 0;

      // Leads by source
      const leadsBySource = allLeads.reduce((acc: any, lead) => {
        acc[lead.source] = (acc[lead.source] || 0) + 1;
        return acc;
      }, {});

      // Leads by industry
      const leadsByIndustry = allLeads.reduce((acc: any, lead) => {
        acc[lead.industry] = (acc[lead.industry] || 0) + 1;
        return acc;
      }, {});

      // Quality score distribution
      const avgQualityScore =
        allLeads.length > 0
          ? allLeads.reduce((sum, lead) => sum + (lead.qualityScore || 0), 0) / allLeads.length
          : 0;

      const highQualityLeads = allLeads.filter((l) => (l.qualityScore || 0) >= 75).length;
      const mediumQualityLeads = allLeads.filter(
        (l) => (l.qualityScore || 0) >= 50 && (l.qualityScore || 0) < 75
      ).length;
      const lowQualityLeads = allLeads.filter((l) => (l.qualityScore || 0) < 50).length;

      res.json({
        success: true,
        data: {
          // Dashboard summary stats (for main dashboard)
          totalLeads,
          hotLeads,
          warmLeads,
          coldLeads,
          activeCampaigns,
          emailsSent: totalEmailsSent,
          // Detailed breakdown (for analytics page)
          leads: {
            total: totalLeads,
            hot: hotLeads,
            warm: warmLeads,
            cold: coldLeads,
            new: newLeads,
            contacted: contactedLeads,
            interested: interestedLeads,
            converted: convertedLeads,
            bySource: leadsBySource,
            byIndustry: leadsByIndustry,
          },
          campaigns: {
            total: totalCampaigns,
            active: activeCampaigns,
          },
          emails: {
            sent: totalEmailsSent,
            opened: emailsOpened,
            clicked: emailsClicked,
            replied: emailsReplied,
            openRate: Math.round(openRate * 100) / 100,
            clickRate: Math.round(clickRate * 100) / 100,
            replyRate: Math.round(replyRate * 100) / 100,
          },
          quality: {
            avgScore: Math.round(avgQualityScore * 100) / 100,
            high: highQualityLeads,
            medium: mediumQualityLeads,
            low: lowQualityLeads,
          },
        },
      });
    } catch (error: any) {
      logger.error('[AnalyticsController] Error getting dashboard stats', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * GET /api/analytics/campaigns/:id - Get campaign analytics
   */
  async getCampaignAnalytics(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      logger.info('[AnalyticsController] Getting campaign analytics', { id });

      const campaign = await db.select().from(campaigns)
        .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)))
        .limit(1);

      if (!campaign[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found' },
        });
      }

      // Get campaign emails
      const campaignEmails = await db
        .select()
        .from(emails)
        .where(eq(emails.campaignId, id));

      const sent = campaignEmails.filter((e) => e.status === 'sent' || e.status === 'delivered').length;
      const opened = campaignEmails.filter((e) => e.openedAt !== null).length;
      const clicked = campaignEmails.filter((e) => e.clickedAt !== null).length;
      const replied = campaignEmails.filter((e) => e.status === 'delivered').length; // No repliedAt field

      const openRate = sent > 0 ? (opened / sent) * 100 : 0;
      const clickRate = sent > 0 ? (clicked / sent) * 100 : 0;
      const replyRate = sent > 0 ? (replied / sent) * 100 : 0;

      res.json({
        success: true,
        data: {
          campaign: campaign[0],
          metrics: {
            sent,
            opened,
            clicked,
            replied,
            openRate: Math.round(openRate * 100) / 100,
            clickRate: Math.round(clickRate * 100) / 100,
            replyRate: Math.round(replyRate * 100) / 100,
          },
        },
      });
    } catch (error: any) {
      logger.error('[AnalyticsController] Error getting campaign analytics', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * GET /api/analytics/leads/timeline - Get leads generation timeline
   */
  async getLeadsTimeline(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { days = 30 } = req.query;

      logger.info('[AnalyticsController] Getting leads timeline', { days });

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

      const recentLeads = await db
        .select()
        .from(leads)
        .where(and(eq(leads.userId, userId), gte(leads.createdAt, daysAgo)));

      // Group by date
      const timeline = recentLeads.reduce((acc: any, lead) => {
        if (lead.createdAt) {
          const date = lead.createdAt.toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = { date, count: 0, sources: {} };
          }
          acc[date].count++;
          acc[date].sources[lead.source] = (acc[date].sources[lead.source] || 0) + 1;
        }
        return acc;
      }, {});

      const timelineArray = Object.values(timeline).sort((a: any, b: any) =>
        a.date.localeCompare(b.date)
      );

      res.json({
        success: true,
        data: timelineArray,
      });
    } catch (error: any) {
      logger.error('[AnalyticsController] Error getting leads timeline', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }
}

export const analyticsController = new AnalyticsController();
