import nodemailer from 'nodemailer';
import { logger } from '../../utils/logger';
import { db, settings } from '@leadnex/database';
import { emails, leads } from '@leadnex/database';
import { eq } from 'drizzle-orm';
import { settingsService } from '../settings.service';

interface SMTPConfig {
  provider: 'smtp2go' | 'sendgrid' | 'gmail' | 'wordpress' | 'generic';
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  fromName: string;
  fromEmail: string;
}

export class EmailSenderService {
  private transporter: nodemailer.Transporter | null = null;
  private currentConfig: SMTPConfig | null = null;

  /**
   * Convert plain text to HTML with proper formatting
   * Handles inline HTML elements (links, etc.) that should not be escaped
   */
  private convertTextToHtml(text: string): string {
    // First, temporarily replace HTML tags with placeholders to protect them
    const htmlPlaceholders: { [key: string]: string } = {};
    let placeholderCounter = 0;
    
    // Protect existing <table> tags (including all nested content)
    text = text.replace(/<table[\s\S]*?<\/table>/gi, (match) => {
      const placeholder = `__TABLE_${placeholderCounter}__`;
      htmlPlaceholders[placeholder] = match;
      placeholderCounter++;
      return placeholder;
    });
    
    // Protect existing <div> tags
    text = text.replace(/<div[^>]*>.*?<\/div>/gi, (match) => {
      const placeholder = `__DIV_${placeholderCounter}__`;
      htmlPlaceholders[placeholder] = match;
      placeholderCounter++;
      return placeholder;
    });
    
    // Protect existing <a> tags
    text = text.replace(/<a\s+[^>]*>.*?<\/a>/gi, (match) => {
      const placeholder = `__LINK_${placeholderCounter}__`;
      htmlPlaceholders[placeholder] = match;
      placeholderCounter++;
      return placeholder;
    });
    
    // Protect existing <br> tags
    text = text.replace(/<br\s*\/?>/gi, (match) => {
      const placeholder = `__BR_${placeholderCounter}__`;
      htmlPlaceholders[placeholder] = match;
      placeholderCounter++;
      return placeholder;
    });
    
    // Protect existing <strong> tags
    text = text.replace(/<strong>.*?<\/strong>/gi, (match) => {
      const placeholder = `__STRONG_${placeholderCounter}__`;
      htmlPlaceholders[placeholder] = match;
      placeholderCounter++;
      return placeholder;
    });
    
    // Protect existing <span> tags
    text = text.replace(/<span[^>]*>.*?<\/span>/gi, (match) => {
      const placeholder = `__SPAN_${placeholderCounter}__`;
      htmlPlaceholders[placeholder] = match;
      placeholderCounter++;
      return placeholder;
    });
    
    // Protect existing <img> tags
    text = text.replace(/<img[^>]*\/?>/gi, (match) => {
      const placeholder = `__IMG_${placeholderCounter}__`;
      htmlPlaceholders[placeholder] = match;
      placeholderCounter++;
      return placeholder;
    });

    // Escape HTML characters in the remaining text
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // Restore protected HTML elements
    for (const [placeholder, original] of Object.entries(htmlPlaceholders)) {
      html = html.replace(placeholder, original);
    }

    // Convert bullet points (lines starting with -, *, or •)
    html = html.replace(/^[\-\*•]\s+(.+)$/gm, '<li>$1</li>');
    
    // Wrap consecutive list items in ul tags
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul style="margin: 10px 0; padding-left: 20px;">$1</ul>');
    
    // Convert numbered lists (lines starting with 1., 2., etc.)
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, function(match) {
      // Check if it's already wrapped in ul (bullet points)
      if (match.includes('<ul')) return match;
      return '<ol style="margin: 10px 0; padding-left: 20px;">' + match + '</ol>';
    });

    // Convert double line breaks to paragraph breaks
    html = html.split('\n\n').map(para => {
      if (para.trim() && !para.includes('<ul') && !para.includes('<ol') && !para.includes('<li>')) {
        return '<p style="margin: 10px 0; line-height: 1.6;">' + para.replace(/\n/g, '<br>') + '</p>';
      }
      return para;
    }).join('\n');

    // Convert remaining single line breaks to <br>
    html = html.replace(/\n/g, '<br>');

    // Bold text (text between **text** or __text__)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic text (text between *text* or _text_)
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Links [text](url)
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color: #0066cc; text-decoration: none;">$1</a>');

    return html;
  }

  /**
   * Wrap HTML content in a professional email template
   */
  private wrapInEmailTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .email-container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        p {
            margin: 10px 0;
            line-height: 1.6;
        }
        ul, ol {
            margin: 10px 0;
            padding-left: 20px;
        }
        li {
            margin: 5px 0;
        }
        a {
            color: #0066cc;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        strong {
            font-weight: 600;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666666;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="email-container">
        ${content}
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Get SMTP configuration from database settings or environment
   */
  private async getSMTPConfig(): Promise<SMTPConfig> {
    try {
      // Try to get individual SMTP settings from database via settingsService
      const provider = await settingsService.get('smtpProvider', null);
      
      // If we have a provider in database, use database settings
      if (provider) {
        logger.info('[EmailSender] Using SMTP config from database settings');
        
        const config = {
          provider,
          host: await settingsService.get('smtpHost', process.env.SMTP_HOST || 'localhost'),
          port: parseInt(await settingsService.get('smtpPort', process.env.SMTP_PORT || '587')),
          secure: (await settingsService.get('smtpSecure', process.env.SMTP_SECURE || 'false')) === 'true',
          user: await settingsService.get('smtpUser', process.env.SMTP_USER || ''),
          pass: await settingsService.get('smtpPass', process.env.SMTP_PASS || ''),
          fromName: await settingsService.get('fromName', process.env.FROM_NAME || 'BookNex Solutions'),
          fromEmail: await settingsService.get('fromEmail', process.env.FROM_EMAIL || ''),
        };
        
        return this.buildSMTPConfig(config);
      }
    } catch (error: any) {
      logger.warn('[EmailSender] Could not load SMTP from database, using env vars', { error: error.message });
    }

    // Fallback to environment variables
    logger.info('[EmailSender] Using SMTP config from .env file');
    return this.buildSMTPConfigFromEnv();
  }

  /**
   * Build SMTP configuration based on provider
   */
  private buildSMTPConfig(config: any): SMTPConfig {
    const provider = config.provider || 'generic';

    // Provider-specific defaults
    const providerDefaults: Record<string, Partial<SMTPConfig>> = {
      smtp2go: {
        host: 'mail.smtp2go.com',
        port: 587,
        secure: false,
      },
      sendgrid: {
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
      },
      gmail: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
      },
      wordpress: {
        host: config.host || 'localhost',
        port: config.port || 587,
        secure: config.secure || false,
      },
      generic: {
        host: config.host,
        port: config.port || 587,
        secure: config.secure || false,
      },
    };

    const defaults = providerDefaults[provider] || providerDefaults.generic;

    return {
      provider,
      host: config.host || defaults.host!,
      port: config.port || defaults.port!,
      secure: config.secure !== undefined ? config.secure : defaults.secure!,
      auth: {
        user: config.user || config.auth?.user || '',
        pass: config.pass || config.auth?.pass || '',
      },
      fromName: config.fromName || 'BookNex Solutions',
      fromEmail: config.fromEmail || config.user || config.auth?.user || '',
    };
  }

  /**
   * Build SMTP configuration from environment variables
   */
  private async buildSMTPConfigFromEnv(): Promise<SMTPConfig> {
    const provider = (await settingsService.get('smtpProvider', process.env.SMTP_PROVIDER || 'generic')) as any;

    return {
      provider,
      host: await settingsService.get('smtpHost', process.env.SMTP_HOST || 'localhost'),
      port: parseInt(await settingsService.get('smtpPort', process.env.SMTP_PORT || '587')),
      secure: (await settingsService.get('smtpSecure', process.env.SMTP_SECURE || 'false')) === 'true',
      auth: {
        user: await settingsService.get('smtpUser', process.env.SMTP_USER || ''),
        pass: await settingsService.get('smtpPass', process.env.SMTP_PASS || ''),
      },
      fromName: await settingsService.get('fromName', process.env.FROM_NAME || 'BookNex Solutions'),
      fromEmail: await settingsService.get('fromEmail', process.env.FROM_EMAIL || process.env.SMTP_USER || ''),
    };
  }

  /**
   * Initialize or update transporter with current config
   */
  private async initializeTransporter(): Promise<void> {
    const config = await this.getSMTPConfig();

    // Only recreate if config changed
    if (
      !this.transporter ||
      JSON.stringify(config) !== JSON.stringify(this.currentConfig)
    ) {
      logger.info('[EmailSender] Initializing SMTP transporter', {
        provider: config.provider,
        host: config.host,
        port: config.port,
      });

      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.auth.user,
          pass: config.auth.pass,
        },
        // Additional options for reliability
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
      });

      this.currentConfig = config;

      // Verify connection
      try {
        await this.transporter.verify();
        logger.info('[EmailSender] SMTP connection verified');
      } catch (error: any) {
        logger.error('[EmailSender] SMTP connection failed', {
          error: error.message,
        });
        throw new Error(`SMTP connection failed: ${error.message}`);
      }
    }
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
      // Initialize transporter if needed
      await this.initializeTransporter();

      if (!this.transporter || !this.currentConfig) {
        throw new Error('SMTP transporter not initialized');
      }

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
        provider: this.currentConfig.provider,
      });

      // Add tracking pixel for open tracking
      const trackingPixel = `<img src="${process.env.API_BASE_URL}/api/emails/track/open/${params.leadId}" width="1" height="1" alt="" />`;
      const bodyHtmlWithTracking = params.bodyHtml 
        ? `${params.bodyHtml}${trackingPixel}`
        : this.wrapInEmailTemplate(this.convertTextToHtml(params.bodyText)) + trackingPixel;

      // Send email
      const info = await this.transporter.sendMail({
        from: `"${this.currentConfig.fromName}" <${this.currentConfig.fromEmail}>`,
        to: lead[0].email,
        subject: params.subject,
        text: params.bodyText,
        html: bodyHtmlWithTracking,
        headers: {
          'X-Campaign-ID': params.campaignId || '',
          'X-Lead-ID': params.leadId,
        },
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

      // Update campaign emailsSent counter
      if (params.campaignId) {
        const { campaigns } = await import('@leadnex/database');
        const campaign = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, params.campaignId))
          .limit(1);
        
        if (campaign[0]) {
          await db
            .update(campaigns)
            .set({
              emailsSent: (campaign[0].emailsSent || 0) + 1,
            })
            .where(eq(campaigns.id, params.campaignId));
        }
      }

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

      // Record failed email
      try {
        await db.insert(emails).values({
          leadId: params.leadId,
          campaignId: params.campaignId,
          subject: params.subject,
          bodyText: params.bodyText,
          bodyHtml: params.bodyHtml,
          followUpStage: params.followUpStage,
          status: 'failed',
          errorMessage: error.message,
        });
      } catch (dbError) {
        logger.error('[EmailSender] Failed to record email error', {
          error: dbError,
        });
      }

      throw error;
    }
  }

  /**
   * Test SMTP connection with current or provided config
   */
  async testConnection(testConfig?: Partial<SMTPConfig>): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      let configToTest: SMTPConfig;

      if (testConfig) {
        configToTest = this.buildSMTPConfig(testConfig);
      } else {
        configToTest = await this.getSMTPConfig();
      }

      logger.info('[EmailSender] Testing SMTP connection', {
        provider: configToTest.provider,
        host: configToTest.host,
      });

      const testTransporter = nodemailer.createTransport({
        host: configToTest.host,
        port: configToTest.port,
        secure: configToTest.secure,
        auth: {
          user: configToTest.auth.user,
          pass: configToTest.auth.pass,
        },
      });

      await testTransporter.verify();

      logger.info('[EmailSender] SMTP connection test successful');

      return {
        success: true,
        message: 'SMTP connection successful',
      };
    } catch (error: any) {
      logger.error('[EmailSender] SMTP connection test failed', {
        error: error.message,
      });

      return {
        success: false,
        message: `Connection failed: ${error.message}`,
      };
    }
  }

  /**
   * Update SMTP configuration
   */
  async updateSMTPConfig(config: Partial<SMTPConfig>): Promise<void> {
    try {
      logger.info('[EmailSender] Updating SMTP configuration');

      // Save to database
      await db
        .insert(settings)
        .values({
          key: 'smtp_config',
          value: config,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value: config,
            updatedAt: new Date(),
          },
        });

      // Reset transporter to force reload
      this.transporter = null;
      this.currentConfig = null;

      logger.info('[EmailSender] SMTP configuration updated');
    } catch (error: any) {
      logger.error('[EmailSender] Error updating SMTP config', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get current SMTP configuration (without sensitive data)
   */
  async getCurrentConfig(): Promise<Partial<SMTPConfig>> {
    const config = await this.getSMTPConfig();

    return {
      provider: config.provider,
      host: config.host,
      port: config.port,
      secure: config.secure,
      fromName: config.fromName,
      fromEmail: config.fromEmail,
      // Don't return auth credentials
    };
  }

  /**
   * Reset transporter to force reinitialization with new settings
   */
  resetTransporter(): void {
    this.transporter = null;
    this.currentConfig = null;
    logger.info('[EmailSender] Transporter reset - will reinitialize with new settings on next email');
  }

  /**
   * Send test email
   */
  async sendTestEmail(to: string): Promise<void> {
    await this.initializeTransporter();

    if (!this.transporter || !this.currentConfig) {
      throw new Error('SMTP transporter not initialized');
    }

    logger.info('[EmailSender] Sending test email', { to });

    await this.transporter.sendMail({
      from: `"${this.currentConfig.fromName}" <${this.currentConfig.fromEmail}>`,
      to,
      subject: 'Test Email from LeadNexConnect',
      text: 'This is a test email to verify your SMTP configuration is working correctly.',
      html: '<p>This is a test email to verify your SMTP configuration is working correctly.</p>',
    });

    logger.info('[EmailSender] Test email sent successfully');
  }
}

export const emailSenderService = new EmailSenderService();
