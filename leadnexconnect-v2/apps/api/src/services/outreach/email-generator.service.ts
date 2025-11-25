import { db } from '@leadnex/database';
import { emailTemplates } from '@leadnex/database';
import { eq } from 'drizzle-orm';
import { logger } from '../../utils/logger';

interface GenerateEmailParams {
  companyName: string;
  contactName?: string;
  industry: string;
  city?: string;
  country?: string;
  followUpStage?: string;
}

export class EmailGeneratorService {
  /**
   * Generate personalized email content
   */
  async generateEmail(params: GenerateEmailParams): Promise<{
    subject: string;
    bodyText: string;
    bodyHtml: string;
  }> {
    try {
      logger.info('[EmailGenerator] Generating email', { params });

      // Get template for industry and stage
      const template = await this.getTemplate(
        params.industry,
        params.followUpStage || 'initial'
      );

      if (!template) {
        throw new Error(`No template found for industry: ${params.industry}`);
      }

      // Replace variables
      const subject = this.replaceVariables(template.subject, params);
      const bodyText = this.replaceVariables(template.bodyText, params);
      const bodyHtml = template.bodyHtml 
        ? this.replaceVariables(template.bodyHtml, params)
        : bodyText;

      return { subject, bodyText, bodyHtml };
    } catch (error: any) {
      logger.error('[EmailGenerator] Error generating email', {
        error: error.message,
      });
      throw error;
    }
  }

  private async getTemplate(industry: string, stage: string) {
    const templates = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.industry, industry))
      .where(eq(emailTemplates.followUpStage, stage))
      .where(eq(emailTemplates.isActive, true))
      .limit(1);

    return templates[0] || null;
  }

  private replaceVariables(text: string, params: GenerateEmailParams): string {
    return text
      .replace(/\{\{company_name\}\}/g, params.companyName)
      .replace(/\{\{contact_name\}\}/g, params.contactName || 'there')
      .replace(/\{\{industry\}\}/g, params.industry)
      .replace(/\{\{city\}\}/g, params.city || 'your area')
      .replace(/\{\{country\}\}/g, params.country || 'your region');
  }
}

export const emailGeneratorService = new EmailGeneratorService();
