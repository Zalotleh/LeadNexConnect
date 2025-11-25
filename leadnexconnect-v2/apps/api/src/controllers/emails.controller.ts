import { Request, Response } from 'express';
import { db } from '@leadnex/database';
import { emails, leads } from '@leadnex/database';
import { eq, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { emailGeneratorService } from '../services/outreach/email-generator.service';
import { emailSenderService } from '../services/outreach/email-sender.service';

export class EmailsController {
  /**
   * GET /api/emails - Get all emails
   */
  async getEmails(req: Request, res: Response) {
    try {
      const { leadId, campaignId, status } = req.query;

      logger.info('[EmailsController] Getting emails', { query: req.query });

      let query = db.select().from(emails).orderBy(desc(emails.createdAt));

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
  async getEmail(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const email = await db.select().from(emails).where(eq(emails.id, id)).limit(1);

      if (!email[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Email not found' },
        });
      }

      res.json({
        success: true,
        data: email[0],
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
  async sendEmail(req: Request, res: Response) {
    try {
      const { leadId, campaignId, followUpStage = 'initial' } = req.body;

      logger.info('[EmailsController] Sending email', { leadId, campaignId });

      // Get lead info
      const lead = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);

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
        contactName: lead[0].contactName,
        industry: lead[0].industry,
        city: lead[0].city,
        country: lead[0].country,
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
   * POST /api/emails/:id/track-open - Track email open
   */
  async trackOpen(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const email = await db.select().from(emails).where(eq(emails.id, id)).limit(1);

      if (!email[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Email not found' },
        });
      }

      // Update email
      await db
        .update(emails)
        .set({ openedAt: new Date() })
        .where(eq(emails.id, id));

      // Update lead
      const lead = await db.select().from(leads).where(eq(leads.id, email[0].leadId)).limit(1);
      if (lead[0]) {
        await db
          .update(leads)
          .set({ emailsOpened: lead[0].emailsOpened + 1 })
          .where(eq(leads.id, email[0].leadId));
      }

      res.json({
        success: true,
        message: 'Open tracked',
      });
    } catch (error: any) {
      logger.error('[EmailsController] Error tracking open', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/emails/:id/track-click - Track email click
   */
  async trackClick(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const email = await db.select().from(emails).where(eq(emails.id, id)).limit(1);

      if (!email[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Email not found' },
        });
      }

      // Update email
      await db
        .update(emails)
        .set({ clickedAt: new Date() })
        .where(eq(emails.id, id));

      // Update lead
      const lead = await db.select().from(leads).where(eq(leads.id, email[0].leadId)).limit(1);
      if (lead[0]) {
        await db
          .update(leads)
          .set({ emailsClicked: lead[0].emailsClicked + 1 })
          .where(eq(leads.id, email[0].leadId));
      }

      res.json({
        success: true,
        message: 'Click tracked',
      });
    } catch (error: any) {
      logger.error('[EmailsController] Error tracking click', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }
}

export const emailsController = new EmailsController();
