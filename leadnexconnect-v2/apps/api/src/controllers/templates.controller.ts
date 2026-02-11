import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { db } from '@leadnex/database';
import { emailTemplates } from '@leadnex/database/src/schema';
import { eq, desc, ilike, or, and } from 'drizzle-orm';
import { logger } from '../utils/logger';

class TemplatesController {
  // Get all templates with optional filtering
  async getTemplates(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { category, search } = req.query;

      let query = db.select().from(emailTemplates);

      // Build where conditions
      const conditions = [eq(emailTemplates.userId, userId)];
      
      if (category) {
        conditions.push(eq(emailTemplates.category, category as any));
      }

      if (search) {
        conditions.push(
          or(
            ilike(emailTemplates.name, `%${search}%`),
            ilike(emailTemplates.description, `%${search}%`)
          )
        );
      }

      // Apply filters
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const templates = await query.orderBy(desc(emailTemplates.updatedAt));

      logger.info('[TemplatesController] Retrieved templates', { 
        count: templates.length,
        category,
        search 
      });

      res.json({ success: true, data: templates });
    } catch (error: any) {
      logger.error('[TemplatesController] Error getting templates:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch templates',
        message: error.message 
      });
    }
  }

  // Get single template by ID
  async getTemplate(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const template = await db
        .select()
        .from(emailTemplates)
        .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)))
        .limit(1);

      if (!template || template.length === 0) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      logger.info('[TemplatesController] Retrieved template', { id });

      res.json({ success: true, data: template[0] });
    } catch (error: any) {
      logger.error('[TemplatesController] Error getting template:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch template',
        message: error.message 
      });
    }
  }

  // Create new template
  async createTemplate(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const {
        name,
        description,
        category,
        subject,
        bodyHtml,
        bodyText,
        industry,
        followUpStage,
        variables,
        isActive
      } = req.body;

      // Validate required fields
      if (!name || !subject || !bodyHtml) {
        return res.status(400).json({ 
          success: false,
          error: 'Name, subject, and bodyHtml are required' 
        });
      }

      const newTemplate = await db
        .insert(emailTemplates)
        .values({
          userId,
          name,
          description,
          category: category || 'general',
          subject,
          bodyHtml,
          bodyText: bodyText || bodyHtml.replace(/<[^>]*>/g, ''), // Strip HTML as fallback
          industry,
          followUpStage: followUpStage || 'initial',
          variables,
          isActive: isActive !== undefined ? isActive : true,
          usageCount: 0
        })
        .returning();

      logger.info('[TemplatesController] Created template', { 
        id: newTemplate[0].id,
        name 
      });

      res.status(201).json({ success: true, data: newTemplate[0] });
    } catch (error: any) {
      logger.error('[TemplatesController] Error creating template:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to create template',
        message: error.message 
      });
    }
  }

  // Update existing template
  async updateTemplate(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const {
        name,
        description,
        category,
        subject,
        bodyHtml,
        bodyText,
        industry,
        followUpStage,
        variables,
        isActive
      } = req.body;

      const updatedTemplate = await db
        .update(emailTemplates)
        .set({
          name,
          description,
          category,
          subject,
          bodyHtml,
          bodyText,
          industry,
          followUpStage,
          variables,
          isActive,
          updatedAt: new Date()
        })
        .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)))
        .returning();

      if (!updatedTemplate || updatedTemplate.length === 0) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      logger.info('[TemplatesController] Updated template', { id, name });

      res.json({ success: true, data: updatedTemplate[0] });
    } catch (error: any) {
      logger.error('[TemplatesController] Error updating template:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to update template',
        message: error.message 
      });
    }
  }

  // Delete template
  async deleteTemplate(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const deletedTemplate = await db
        .delete(emailTemplates)
        .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)))
        .returning();

      if (!deletedTemplate || deletedTemplate.length === 0) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      logger.info('[TemplatesController] Deleted template', { id });

      res.json({ 
        success: true, 
        message: 'Template deleted successfully',
        data: deletedTemplate[0]
      });
    } catch (error: any) {
      logger.error('[TemplatesController] Error deleting template:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to delete template',
        message: error.message 
      });
    }
  }

  // Increment usage count
  async incrementUsageCount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const template = await db
        .select()
        .from(emailTemplates)
        .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)))
        .limit(1);

      if (!template || template.length === 0) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      const updatedTemplate = await db
        .update(emailTemplates)
        .set({
          usageCount: (template[0].usageCount || 0) + 1,
          updatedAt: new Date()
        })
        .where(eq(emailTemplates.id, id))
        .returning();

      logger.info('[TemplatesController] Incremented usage count', { 
        id,
        newCount: updatedTemplate[0].usageCount 
      });

      res.json({ success: true, data: updatedTemplate[0] });
    } catch (error: any) {
      logger.error('[TemplatesController] Error incrementing usage:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to increment usage count',
        message: error.message 
      });
    }
  }
}

export const templatesController = new TemplatesController();
