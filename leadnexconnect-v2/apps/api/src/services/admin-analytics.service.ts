import { db } from '@leadnex/database';
import { 
  users, 
  leads, 
  campaigns, 
  emails, 
  workflows, 
  emailTemplates,
  apiPerformance,
  apiUsage,
  sessions 
} from '@leadnex/database';
import { eq, and, gte, sql, count, countDistinct } from 'drizzle-orm';
import { logger } from '../utils/logger';

/**
 * Admin Analytics Service
 * Provides aggregated analytics and metrics for admin dashboard
 * All methods require admin authorization (checked in controller)
 */
export class AdminAnalyticsService {
  /**
   * Get analytics overview for all users
   * Returns aggregated statistics for the admin dashboard
   */
  async getAllUsersAnalytics(adminId: string) {
    try {
      logger.info('[AdminAnalyticsService] Getting all users analytics', { adminId });

      // Verify admin
      const admin = await db.query.users.findFirst({
        where: eq(users.id, adminId),
      });

      if (!admin || admin.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      // Get all users with their stats
      const allUsers = await db.query.users.findMany({
        columns: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          lastLoginAt: true,
          lastActiveAt: true,
          createdAt: true,
        },
      });

      // Get stats for each user
      const usersWithStats = await Promise.all(
        allUsers.map(async (user) => {
          // Get lead stats
          const [leadStats] = await db
            .select({
              totalLeads: count(leads.id),
              highPotential: sql<number>`COUNT(CASE WHEN ${leads.bookingPotential} = 'high' THEN 1 END)`,
              mediumPotential: sql<number>`COUNT(CASE WHEN ${leads.bookingPotential} = 'medium' THEN 1 END)`,
              lowPotential: sql<number>`COUNT(CASE WHEN ${leads.bookingPotential} = 'low' THEN 1 END)`,
            })
            .from(leads)
            .where(eq(leads.userId, user.id));

          // Get campaign stats
          const [campaignStats] = await db
            .select({
              totalCampaigns: count(campaigns.id),
              activeCampaigns: sql<number>`COUNT(CASE WHEN ${campaigns.status} = 'active' THEN 1 END)`,
            })
            .from(campaigns)
            .where(eq(campaigns.userId, user.id));

          // Get email stats
          const [emailStats] = await db
            .select({
              emailsSent: count(emails.id),
              emailsOpened: sql<number>`COUNT(CASE WHEN ${emails.openedAt} IS NOT NULL THEN 1 END)`,
              emailsClicked: sql<number>`COUNT(CASE WHEN ${emails.clickedAt} IS NOT NULL THEN 1 END)`,
              emailsDelivered: sql<number>`COUNT(CASE WHEN ${emails.deliveredAt} IS NOT NULL THEN 1 END)`,
            })
            .from(emails)
            .where(eq(emails.userId, user.id));

          // Get workflow stats
          const [workflowStats] = await db
            .select({
              totalWorkflows: count(workflows.id),
            })
            .from(workflows)
            .where(eq(workflows.userId, user.id));

          // Get template stats
          const [templateStats] = await db
            .select({
              totalTemplates: count(emailTemplates.id),
            })
            .from(emailTemplates)
            .where(eq(emailTemplates.userId, user.id));

          // Calculate engagement rate
          const totalSent = emailStats.emailsSent || 1;
          const engagementRate = ((emailStats.emailsOpened / totalSent) * 100).toFixed(2);

          return {
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            email: user.email,
            role: user.role,
            status: user.status,
            stats: {
              totalLeads: leadStats.totalLeads || 0,
              highPotential: Number(leadStats.highPotential) || 0,
              mediumPotential: Number(leadStats.mediumPotential) || 0,
              lowPotential: Number(leadStats.lowPotential) || 0,
              totalCampaigns: campaignStats.totalCampaigns || 0,
              activeCampaigns: Number(campaignStats.activeCampaigns) || 0,
              totalWorkflows: workflowStats.totalWorkflows || 0,
              totalTemplates: templateStats.totalTemplates || 0,
              emailsSent: emailStats.emailsSent || 0,
              emailsOpened: emailStats.emailsOpened || 0,
              emailsClicked: emailStats.emailsClicked || 0,
              emailsDelivered: emailStats.emailsDelivered || 0,
              engagementRate: parseFloat(engagementRate),
            },
            lastLoginAt: user.lastLoginAt,
            lastActiveAt: user.lastActiveAt,
            createdAt: user.createdAt,
          };
        })
      );

      logger.info('[AdminAnalyticsService] Successfully retrieved all users analytics', {
        adminId,
        totalUsers: usersWithStats.length,
      });

      return usersWithStats;
    } catch (error: any) {
      logger.error('[AdminAnalyticsService] Error getting all users analytics', {
        adminId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get analytics for a specific user
   * Returns detailed statistics for one user
   */
  async getUserAnalytics(adminId: string, userId: string) {
    try {
      logger.info('[AdminAnalyticsService] Getting user analytics', { adminId, userId });

      // Verify admin
      const admin = await db.query.users.findFirst({
        where: eq(users.id, adminId),
      });

      if (!admin || admin.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      // Get user
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          lastLoginAt: true,
          lastActiveAt: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get detailed lead stats
      const [leadStats] = await db
        .select({
          totalLeads: count(leads.id),
          highPotential: sql<number>`COUNT(CASE WHEN ${leads.bookingPotential} = 'high' THEN 1 END)`,
          mediumPotential: sql<number>`COUNT(CASE WHEN ${leads.bookingPotential} = 'medium' THEN 1 END)`,
          lowPotential: sql<number>`COUNT(CASE WHEN ${leads.bookingPotential} = 'low' THEN 1 END)`,
          verifiedLeads: sql<number>`COUNT(CASE WHEN ${leads.verificationStatus} = 'verified' THEN 1 END)`,
        })
        .from(leads)
        .where(eq(leads.userId, userId));

      // Get campaign stats
      const [campaignStats] = await db
        .select({
          totalCampaigns: count(campaigns.id),
          activeCampaigns: sql<number>`COUNT(CASE WHEN ${campaigns.status} = 'active' THEN 1 END)`,
          pausedCampaigns: sql<number>`COUNT(CASE WHEN ${campaigns.status} = 'paused' THEN 1 END)`,
          completedCampaigns: sql<number>`COUNT(CASE WHEN ${campaigns.status} = 'completed' THEN 1 END)`,
        })
        .from(campaigns)
        .where(eq(campaigns.userId, userId));

      // Get email stats
      const [emailStats] = await db
        .select({
          emailsSent: count(emails.id),
          emailsOpened: sql<number>`COUNT(CASE WHEN ${emails.openedAt} IS NOT NULL THEN 1 END)`,
          emailsClicked: sql<number>`COUNT(CASE WHEN ${emails.clickedAt} IS NOT NULL THEN 1 END)`,
          emailsDelivered: sql<number>`COUNT(CASE WHEN ${emails.deliveredAt} IS NOT NULL THEN 1 END)`,
          emailsBounced: sql<number>`COUNT(CASE WHEN ${emails.bouncedAt} IS NOT NULL THEN 1 END)`,
        })
        .from(emails)
        .where(eq(emails.userId, userId));

      // Get workflow stats
      const [workflowStats] = await db
        .select({
          totalWorkflows: count(workflows.id),
          activeWorkflows: sql<number>`COUNT(CASE WHEN ${workflows.isActive} = true THEN 1 END)`,
        })
        .from(workflows)
        .where(eq(workflows.userId, userId));

      // Get template stats
      const [templateStats] = await db
        .select({
          totalTemplates: count(emailTemplates.id),
        })
        .from(emailTemplates)
        .where(eq(emailTemplates.userId, userId));

      // Calculate rates
      const totalSent = emailStats.emailsSent || 1;
      const openRate = ((emailStats.emailsOpened / totalSent) * 100).toFixed(2);
      const clickRate = ((emailStats.emailsClicked / totalSent) * 100).toFixed(2);
      const deliveryRate = ((emailStats.emailsDelivered / totalSent) * 100).toFixed(2);
      const bounceRate = ((emailStats.emailsBounced / totalSent) * 100).toFixed(2);

      logger.info('[AdminAnalyticsService] Successfully retrieved user analytics', {
        adminId,
        userId,
      });

      return {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        status: user.status,
        stats: {
          leads: {
            total: leadStats.totalLeads || 0,
            highPotential: Number(leadStats.highPotential) || 0,
            mediumPotential: Number(leadStats.mediumPotential) || 0,
            lowPotential: Number(leadStats.lowPotential) || 0,
            verified: Number(leadStats.verifiedLeads) || 0,
          },
          campaigns: {
            total: campaignStats.totalCampaigns || 0,
            active: Number(campaignStats.activeCampaigns) || 0,
            paused: Number(campaignStats.pausedCampaigns) || 0,
            completed: Number(campaignStats.completedCampaigns) || 0,
          },
          emails: {
            sent: emailStats.emailsSent || 0,
            opened: emailStats.emailsOpened || 0,
            clicked: emailStats.emailsClicked || 0,
            delivered: emailStats.emailsDelivered || 0,
            bounced: emailStats.emailsBounced || 0,
            openRate: parseFloat(openRate),
            clickRate: parseFloat(clickRate),
            deliveryRate: parseFloat(deliveryRate),
            bounceRate: parseFloat(bounceRate),
          },
          workflows: {
            total: workflowStats.totalWorkflows || 0,
            active: Number(workflowStats.activeWorkflows) || 0,
          },
          templates: {
            total: templateStats.totalTemplates || 0,
          },
        },
        lastLoginAt: user.lastLoginAt,
        lastActiveAt: user.lastActiveAt,
        createdAt: user.createdAt,
      };
    } catch (error: any) {
      logger.error('[AdminAnalyticsService] Error getting user analytics', {
        adminId,
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get API usage metrics for all users
   * Returns API call statistics per user
   */
  async getApiUsageMetrics(adminId: string) {
    try {
      logger.info('[AdminAnalyticsService] Getting API usage metrics', { adminId });

      // Verify admin
      const admin = await db.query.users.findFirst({
        where: eq(users.id, adminId),
      });

      if (!admin || admin.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      // Get all users
      const allUsers = await db.query.users.findMany({
        columns: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      // Get API usage for each user
      const usageMetrics = await Promise.all(
        allUsers.map(async (user) => {
          // Get API performance stats (last 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]; // Convert to YYYY-MM-DD

          const [apiStats] = await db
            .select({
              totalCalls: sql<number>`SUM(${apiPerformance.apiCallsUsed})`,
              apolloCalls: sql<number>`SUM(CASE WHEN ${apiPerformance.apiSource} = 'apollo' THEN ${apiPerformance.apiCallsUsed} ELSE 0 END)`,
              hunterCalls: sql<number>`SUM(CASE WHEN ${apiPerformance.apiSource} = 'hunter' THEN ${apiPerformance.apiCallsUsed} ELSE 0 END)`,
              leadsGenerated: sql<number>`SUM(${apiPerformance.leadsGenerated})`,
              leadsConverted: sql<number>`SUM(${apiPerformance.leadsConverted})`,
            })
            .from(apiPerformance)
            .where(
              and(
                eq(apiPerformance.userId, user.id),
                gte(apiPerformance.periodStart, thirtyDaysAgoStr)
              )
            );

          // Get API usage stats (if available)
          const [usageStats] = await db
            .select({
              totalUsage: sql<number>`SUM(${apiUsage.requestsMade})`,
            })
            .from(apiUsage)
            .where(eq(apiUsage.userId, user.id));

          const totalCalls = Number(apiStats.totalCalls) || 0;
          const leadsGenerated = Number(apiStats.leadsGenerated) || 0;
          const conversionRate = leadsGenerated > 0 && Number(apiStats.leadsConverted) > 0
            ? ((Number(apiStats.leadsConverted) / leadsGenerated) * 100).toFixed(2)
            : '0.00';

          return {
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            email: user.email,
            apiUsage: {
              totalCalls: totalCalls,
              apolloCalls: Number(apiStats.apolloCalls) || 0,
              hunterCalls: Number(apiStats.hunterCalls) || 0,
              leadsGenerated: leadsGenerated,
              leadsConverted: Number(apiStats.leadsConverted) || 0,
              conversionRate: parseFloat(conversionRate),
              totalUsage: Number(usageStats?.totalUsage) || 0,
            },
            period: 'last_30_days',
          };
        })
      );

      logger.info('[AdminAnalyticsService] Successfully retrieved API usage metrics', {
        adminId,
        totalUsers: usageMetrics.length,
      });

      return usageMetrics;
    } catch (error: any) {
      logger.error('[AdminAnalyticsService] Error getting API usage metrics', {
        adminId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get system overview statistics
   * Returns aggregated system-wide metrics
   */
  async getSystemOverview(adminId: string) {
    try {
      logger.info('[AdminAnalyticsService] Getting system overview', { adminId });

      // Verify admin
      const admin = await db.query.users.findFirst({
        where: eq(users.id, adminId),
      });

      if (!admin || admin.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      // Get total users
      const [userStats] = await db
        .select({
          totalUsers: count(users.id),
          activeUsers: sql<number>`COUNT(CASE WHEN ${users.status} = 'active' THEN 1 END)`,
          adminUsers: sql<number>`COUNT(CASE WHEN ${users.role} = 'admin' THEN 1 END)`,
        })
        .from(users);

      // Get total leads
      const [leadsTotal] = await db
        .select({ total: count(leads.id) })
        .from(leads);

      // Get total campaigns
      const [campaignsTotal] = await db
        .select({ total: count(campaigns.id) })
        .from(campaigns);

      // Get total emails
      const [emailsTotal] = await db
        .select({ total: count(emails.id) })
        .from(emails);

      // Get total workflows
      const [workflowsTotal] = await db
        .select({ total: count(workflows.id) })
        .from(workflows);

      // Get total templates
      const [templatesTotal] = await db
        .select({ total: count(emailTemplates.id) })
        .from(emailTemplates);

      // Get active sessions
      const [activeSessions] = await db
        .select({ total: count(sessions.id) })
        .from(sessions)
        .where(gte(sessions.expiresAt, new Date()));

      // Get API calls (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]; // Convert to YYYY-MM-DD

      const [apiCallsTotal] = await db
        .select({ total: sql<number>`SUM(${apiPerformance.apiCallsUsed})` })
        .from(apiPerformance)
        .where(gte(apiPerformance.periodStart, thirtyDaysAgoStr));

      logger.info('[AdminAnalyticsService] Successfully retrieved system overview', {
        adminId,
      });

      return {
        users: {
          total: userStats.totalUsers || 0,
          active: Number(userStats.activeUsers) || 0,
          admins: Number(userStats.adminUsers) || 0,
        },
        data: {
          totalLeads: leadsTotal.total || 0,
          totalCampaigns: campaignsTotal.total || 0,
          totalEmails: emailsTotal.total || 0,
          totalWorkflows: workflowsTotal.total || 0,
          totalTemplates: templatesTotal.total || 0,
        },
        system: {
          activeSessions: activeSessions.total || 0,
          apiCallsLast30Days: apiCallsTotal.total || 0,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('[AdminAnalyticsService] Error getting system overview', {
        adminId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get leads trend over time (last 30 days)
   */
  async getLeadsTrend(adminId: string) {
    try {
      // Verify admin
      const admin = await db.query.users.findFirst({
        where: eq(users.id, adminId),
      });

      if (!admin || admin.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      // Get leads grouped by date for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const leadsTrend = await db
        .select({
          date: sql<string>`DATE(${leads.createdAt})`,
          count: count(leads.id),
        })
        .from(leads)
        .where(gte(leads.createdAt, thirtyDaysAgo))
        .groupBy(sql`DATE(${leads.createdAt})`)
        .orderBy(sql`DATE(${leads.createdAt})`);

      return leadsTrend;
    } catch (error: any) {
      logger.error('[AdminAnalyticsService] Error getting leads trend', {
        adminId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get campaign status distribution
   */
  async getCampaignDistribution(adminId: string) {
    try {
      // Verify admin
      const admin = await db.query.users.findFirst({
        where: eq(users.id, adminId),
      });

      if (!admin || admin.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const campaignDistribution = await db
        .select({
          status: campaigns.status,
          count: count(campaigns.id),
        })
        .from(campaigns)
        .groupBy(campaigns.status);

      return campaignDistribution;
    } catch (error: any) {
      logger.error('[AdminAnalyticsService] Error getting campaign distribution', {
        adminId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get email engagement metrics
   */
  async getEmailEngagement(adminId: string) {
    try {
      // Verify admin
      const admin = await db.query.users.findFirst({
        where: eq(users.id, adminId),
      });

      if (!admin || admin.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const [emailStats] = await db
        .select({
          total: count(emails.id),
          delivered: sql<number>`COUNT(CASE WHEN ${emails.deliveredAt} IS NOT NULL THEN 1 END)`,
          opened: sql<number>`COUNT(CASE WHEN ${emails.openedAt} IS NOT NULL THEN 1 END)`,
          clicked: sql<number>`COUNT(CASE WHEN ${emails.clickedAt} IS NOT NULL THEN 1 END)`,
          bounced: sql<number>`COUNT(CASE WHEN ${emails.bouncedAt} IS NOT NULL THEN 1 END)`,
        })
        .from(emails);

      return {
        total: emailStats.total || 0,
        delivered: Number(emailStats.delivered) || 0,
        opened: Number(emailStats.opened) || 0,
        clicked: Number(emailStats.clicked) || 0,
        bounced: Number(emailStats.bounced) || 0,
      };
    } catch (error: any) {
      logger.error('[AdminAnalyticsService] Error getting email engagement', {
        adminId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get lead tier distribution
   */
  async getLeadTierDistribution(adminId: string) {
    try {
      // Verify admin
      const admin = await db.query.users.findFirst({
        where: eq(users.id, adminId),
      });

      if (!admin || admin.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const tierDistribution = await db
        .select({
          tier: leads.bookingPotential,
          count: count(leads.id),
        })
        .from(leads)
        .groupBy(leads.bookingPotential);

      return tierDistribution;
    } catch (error: any) {
      logger.error('[AdminAnalyticsService] Error getting lead tier distribution', {
        adminId,
        error: error.message,
      });
      throw error;
    }
  }
}

export const adminAnalyticsService = new AdminAnalyticsService();
