import { Request, Response } from 'express';
import { db } from '@leadnex/database';
import { emailTemplates, settings } from '@leadnex/database';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

export class SettingsController {
  /**
   * GET /api/settings - Get all settings
   */
  async getSettings(req: Request, res: Response) {
    try {
      logger.info('[SettingsController] Getting settings');

      const allSettings = await db.select().from(settings);

      // Convert to key-value object
      const settingsObj = allSettings.reduce((acc: any, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});

      res.json({
        success: true,
        data: settingsObj,
      });
    } catch (error: any) {
      logger.error('[SettingsController] Error getting settings', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * PUT /api/settings - Update settings
   */
  async updateSettings(req: Request, res: Response) {
    try {
      const updates = req.body;

      logger.info('[SettingsController] Updating settings', { updates });

      for (const [key, value] of Object.entries(updates)) {
        // Check if setting exists
        const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

        if (existing[0]) {
          // Update existing
          await db
            .update(settings)
            .set({ value: value as string, updatedAt: new Date() })
            .where(eq(settings.key, key));
        } else {
          // Create new
          await db.insert(settings).values({
            key,
            value: value as string,
          });
        }
      }

      res.json({
        success: true,
        message: 'Settings updated successfully',
      });
    } catch (error: any) {
      logger.error('[SettingsController] Error updating settings', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * GET /api/settings/templates - Get all email templates
   */
  async getTemplates(req: Request, res: Response) {
    try {
      logger.info('[SettingsController] Getting email templates');

      const templates = await db.select().from(emailTemplates);

      res.json({
        success: true,
        data: templates,
      });
    } catch (error: any) {
      logger.error('[SettingsController] Error getting templates', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/settings/templates - Create email template
   */
  async createTemplate(req: Request, res: Response) {
    try {
      const { name, industry, followUpStage, subject, bodyText, bodyHtml, isActive } = req.body;

      logger.info('[SettingsController] Creating template', { name });

      const newTemplate = await db
        .insert(emailTemplates)
        .values({
          name,
          industry,
          followUpStage,
          subject,
          bodyText,
          bodyHtml,
          isActive: isActive !== undefined ? isActive : true,
        })
        .returning();

      res.json({
        success: true,
        data: newTemplate[0],
      });
    } catch (error: any) {
      logger.error('[SettingsController] Error creating template', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * PUT /api/settings/templates/:id - Update email template
   */
  async updateTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      logger.info('[SettingsController] Updating template', { id });

      const updated = await db
        .update(emailTemplates)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(emailTemplates.id, id))
        .returning();

      if (!updated[0]) {
        return res.status(404).json({
          success: false,
          error: { message: 'Template not found' },
        });
      }

      res.json({
        success: true,
        data: updated[0],
      });
    } catch (error: any) {
      logger.error('[SettingsController] Error updating template', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * DELETE /api/settings/templates/:id - Delete email template
   */
  async deleteTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await db.delete(emailTemplates).where(eq(emailTemplates.id, id));

      res.json({
        success: true,
        message: 'Template deleted successfully',
      });
    } catch (error: any) {
      logger.error('[SettingsController] Error deleting template', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }
}

export const settingsController = new SettingsController();
