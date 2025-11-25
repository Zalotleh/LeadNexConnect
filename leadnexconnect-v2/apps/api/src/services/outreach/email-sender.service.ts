import nodemailer from 'nodemailer';
import { logger } from '../../utils/logger';
import { db } from '@leadnex/database';
import { emails, leads } from '@leadnex/database';
import { eq } from 'drizzle-orm';

export class EmailSenderService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Send email to a lead
   */
  async sendEmail(params: {
    leadId: string;
    campaignId?: string;
    subject: string;
    bodyText: string;
    bodyHtml?: string;
    followUpStage: string;
  }): Promise<void> {
    try {
      // Get lead info
      const lead = await db
        .select()
        .from(leads)
        .where(eq(leads.id, params.leadId))
        .limit(1);

      if (!lead[0] || !lead[0].email) {
        throw new Error('Lead email not found');
      }

      logger.info('[EmailSender] Sending email', {
        to: lead[0].email,
        subject: params.subject,
      });

      // Send email
      const info = await this.transporter.sendMail({
        from: `"${process.env.FROM_NAME || 'BookNex Solutions'}" <${process.env.SMTP_USER}>`,
        to: lead[0].email,
        subject: params.subject,
        text: params.bodyText,
        html: params.bodyHtml || params.bodyText,
      });

      // Record email in database
      await db.insert(emails).values({
        leadId: params.leadId,
        campaignId: params.campaignId,
        subject: params.subject,
        bodyText: params.bodyText,
        bodyHtml: params.bodyHtml,
        followUpStage: params.followUpStage,
        status: 'sent',
        sentAt: new Date(),
        externalId: info.messageId,
      });

      // Update lead status
      if (lead[0]) {
        await db
          .update(leads)
          .set({
            status: 'contacted',
            lastContactedAt: new Date(),
            emailsSent: (lead[0].emailsSent || 0) + 1,
          })
          .where(eq(leads.id, params.leadId));
      }

      logger.info('[EmailSender] Email sent successfully', {
        messageId: info.messageId,
      });
    } catch (error: any) {
      logger.error('[EmailSender] Error sending email', {
        error: error.message,
      });
      throw error;
    }
  }
}

export const emailSenderService = new EmailSenderService();
