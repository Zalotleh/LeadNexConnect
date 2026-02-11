import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { db } from '@leadnex/database';
import { emails, leads, campaigns } from '@leadnex/database';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { emailGeneratorService } from '../services/outreach/email-generator.service';
import { emailSenderService } from '../services/outreach/email-sender.service';

export class EmailsController {
  /**
   * GET /api/emails - Get all emails
   */
  async getEmails(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { leadId, campaignId, status } = req.query;

      logger.info('[EmailsController] Getting emails', { query: req.query });

      // Get user's lead IDs first
      const userLeads = await db.select({ id: leads.id }).from(leads).where(eq(leads.userId, userId));
      const userLeadIds = userLeads.map(l => l.id);

      if (userLeadIds.length === 0) {
        return res.json({ success: true, data: [] });
      }

      let query = db.select().from(emails)
        .where(inArray(emails.leadId, userLeadIds))
        .orderBy(desc(emails.createdAt));

      // Apply filters (simplified - in production use proper query builder)
      const allEmails = await query;
      let filteredEmails = allEmails;

      if (leadId) {
        filteredEmails = filteredEmails.filter((e) => e.leadId === leadId);
      }
      if (campaignId) {
        filteredEmails = filteredEmails.filter((e) => e.campaignId === campaignId);
      }
      if (status) {
        filteredEmails = filteredEmails.filter((e) => e.status === status);
      }

      res.json({
        success: true,
        data: filteredEmails,
      });
    } catch (error: any) {
      logger.error('[EmailsController] Error getting emails', { error: error.message });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * GET /api/emails/:id - Get single email
   */
  async getEmail(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      // Get email and verify ownership via lead
      const emailResults = await db.select({
        email: emails,
        lead: leads
      })
      .from(emails)
      .innerJoin(leads, eq(emails.leadId, leads.id))
      .where(and(eq(emails.id, id), eq(leads.userId, userId)))
      .limit(1);

      if (!emailResults[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Email not found' },
        });
      }

      res.json({
        success: true,
        data: emailResults[0].email,
      });
    } catch (error: any) {
      logger.error('[EmailsController] Error getting email', { error: error.message });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/emails/send - Send email to a lead
   */
  async sendEmail(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { leadId, campaignId, followUpStage = 'initial' } = req.body;

      logger.info('[EmailsController] Sending email', { leadId, campaignId });

      // Get lead info and verify ownership
      const lead = await db.select().from(leads)
        .where(and(eq(leads.id, leadId), eq(leads.userId, userId)))
        .limit(1);

      if (!lead[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Lead not found' },
        });
      }

      if (!lead[0].email) {
        return res.status(400).json({
          success: false,
          error: { message: 'Lead has no email address' },
        });
      }

      // Generate email content
      const emailContent = await emailGeneratorService.generateEmail({
        companyName: lead[0].companyName,
        contactName: lead[0].contactName || undefined,
        industry: lead[0].industry,
        city: lead[0].city || undefined,
        country: lead[0].country || undefined,
        followUpStage,
      });

      // Send email
      await emailSenderService.sendEmail({
        leadId,
        campaignId,
        subject: emailContent.subject,
        bodyText: emailContent.bodyText,
        bodyHtml: emailContent.bodyHtml,
        followUpStage,
      });

      res.json({
        success: true,
        message: 'Email sent successfully',
      });
    } catch (error: any) {
      logger.error('[EmailsController] Error sending email', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * GET /api/emails/track/open/:id - Track email open (public endpoint, no auth)
   */
  async trackOpen(req: Request, res: Response) {
    try {
      const { id } = req.params; // This is the emailId

      const email = await db.select().from(emails).where(eq(emails.id, id)).limit(1);

      if (!email[0]) {
        // Return 1x1 transparent pixel even if email not found (don't break email rendering)
        const pixel = Buffer.from(
          'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
          'base64'
        );
        res.writeHead(200, {
          'Content-Type': 'image/gif',
          'Content-Length': pixel.length,
        });
        return res.end(pixel);
      }

      // Track every open (increment openCount)
      const currentOpenCount = email[0].openCount || 0;
      const isFirstOpen = !email[0].openedAt;
      
      await db
        .update(emails)
        .set({ 
          openedAt: email[0].openedAt || new Date(),
          openCount: currentOpenCount + 1,
          status: 'opened' // Update status to 'opened'
        })
        .where(eq(emails.id, id));

      // Only update lead and campaign stats on first open
      if (isFirstOpen) {
        // Update lead
        const lead = await db.select().from(leads).where(eq(leads.id, email[0].leadId)).limit(1);
        if (lead[0]) {
          await db
            .update(leads)
            .set({ emailsOpened: (lead[0].emailsOpened || 0) + 1 })
            .where(eq(leads.id, email[0].leadId));
        }

        // Update campaign stats
        if (email[0].campaignId) {
          const campaign = await db
            .select()
            .from(campaigns)
            .where(eq(campaigns.id, email[0].campaignId))
            .limit(1);

          if (campaign[0]) {
            await db
              .update(campaigns)
              .set({ emailsOpened: (campaign[0].emailsOpened || 0) + 1 })
              .where(eq(campaigns.id, email[0].campaignId));
          }
        }

        logger.info('[EmailsController] Email opened (first time)', {
          emailId: id,
          leadId: email[0].leadId,
          campaignId: email[0].campaignId,
        });
      } else {
        logger.info('[EmailsController] Email opened again', {
          emailId: id,
          openCount: currentOpenCount + 1,
        });
      }

      // Return 1x1 transparent pixel
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length,
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      });
      res.end(pixel);
    } catch (error: any) {
      logger.error('[EmailsController] Error tracking open', {
        error: error.message,
      });
      // Return pixel even on error
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length,
      });
      res.end(pixel);
    }
  }

  /**
   * GET /api/emails/track/click/:id - Track email click and redirect (public endpoint, no auth)
   */
  async trackClick(req: Request, res: Response) {
    try {
      const { id } = req.params; // This is the emailId
      const { url } = req.query; // The actual URL to redirect to

      const email = await db.select().from(emails).where(eq(emails.id, id)).limit(1);

      if (!email[0]) {
        // Redirect to a default URL if email not found
        return res.redirect(url as string || 'https://www.booknexsolutions.com');
      }

      // Track every click (increment clickCount)
      const currentClickCount = email[0].clickCount || 0;
      const isFirstClick = !email[0].clickedAt;
      
      await db
        .update(emails)
        .set({ 
          clickedAt: email[0].clickedAt || new Date(),
          clickCount: currentClickCount + 1,
          status: 'clicked' // Update status to 'clicked'
        })
        .where(eq(emails.id, id));

      // Only update lead and campaign stats on first click
      if (isFirstClick) {
        // Update lead
        const lead = await db.select().from(leads).where(eq(leads.id, email[0].leadId)).limit(1);
        if (lead[0]) {
          await db
            .update(leads)
            .set({ emailsClicked: (lead[0].emailsClicked || 0) + 1 })
            .where(eq(leads.id, email[0].leadId));
        }

        // Update campaign stats
        if (email[0].campaignId) {
          const campaign = await db
            .select()
            .from(campaigns)
            .where(eq(campaigns.id, email[0].campaignId))
            .limit(1);

          if (campaign[0]) {
            await db
              .update(campaigns)
              .set({ emailsClicked: (campaign[0].emailsClicked || 0) + 1 })
              .where(eq(campaigns.id, email[0].campaignId));
          }
        }

        logger.info('[EmailsController] Email clicked (first time)', {
          emailId: id,
          leadId: email[0].leadId,
          campaignId: email[0].campaignId,
          redirectUrl: url,
        });
      } else {
        logger.info('[EmailsController] Email clicked again', {
          emailId: id,
          clickCount: currentClickCount + 1,
          redirectUrl: url,
        });
      }

      // Redirect to the actual URL
      res.redirect(url as string || 'https://www.booknexsolutions.com');
    } catch (error: any) {
      logger.error('[EmailsController] Error tracking click', {
        error: error.message,
      });
      // Redirect even on error
      res.redirect((req.query.url as string) || 'https://www.booknexsolutions.com');
    }
  }
}

export const emailsController = new EmailsController();
