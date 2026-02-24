import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { db } from '@leadnex/database';
import { customVariables } from '@leadnex/database';
import { eq, like, or, desc, and } from 'drizzle-orm';
import { logger } from '../utils/logger';

/** Default variables auto-seeded for new users on first visit */
const DEFAULT_VARIABLES = [
  { key: 'contact_name',    label: 'Contact Name',    value: '{{contact_name}}',    category: 'lead',    description: 'Full name of the lead contact person',           defaultValue: '[Contact Name]' },
  { key: 'first_name',      label: 'First Name',      value: '{{first_name}}',      category: 'lead',    description: 'First name of the contact',                       defaultValue: '[First Name]' },
  { key: 'company_name',    label: 'Company Name',    value: '{{company_name}}',    category: 'lead',    description: "The lead's company name",                         defaultValue: '[Company Name]' },
  { key: 'contact_email',   label: 'Contact Email',   value: '{{contact_email}}',   category: 'lead',    description: 'Email address of the lead contact',               defaultValue: 'contact@example.com' },
  { key: 'city',            label: 'City',            value: '{{city}}',            category: 'lead',    description: "City where the lead's business is located",       defaultValue: '[City]' },
  { key: 'industry',        label: 'Industry',        value: '{{industry}}',        category: 'lead',    description: 'Industry category of the lead',                   defaultValue: '[Industry]' },
  { key: 'sender_name',     label: 'Sender Name',     value: '{{sender_name}}',     category: 'sender',  description: 'Your name or team member name',                   defaultValue: 'Your Name' },
  { key: 'sender_email',    label: 'Sender Email',    value: '{{sender_email}}',    category: 'sender',  description: 'Your email address',                              defaultValue: 'hello@yourcompany.com' },
  { key: 'sender_company',  label: 'Sender Company',  value: '{{sender_company}}',  category: 'sender',  description: 'Your company name',                               defaultValue: 'Your Company' },
  { key: 'product_name',    label: 'Product Name',    value: '{{product_name}}',    category: 'product', description: 'Name of your product or service',                 defaultValue: 'Your Product' },
  { key: 'product_url',     label: 'Product URL',     value: '{{product_url}}',     category: 'link',    description: 'Your product or company website URL',             defaultValue: 'https://yourwebsite.com' },
  { key: 'sign_up_link',    label: 'Sign Up Link',    value: '{{sign_up_link}}',    category: 'link',    description: 'Link to your sign-up or registration page',       defaultValue: 'https://yourwebsite.com/signup' },
  { key: 'demo_link',       label: 'Demo Link',       value: '{{demo_link}}',       category: 'link',    description: 'Link to your product demo or booking page',       defaultValue: 'https://yourwebsite.com/demo' },
  { key: 'unsubscribe_link',label: 'Unsubscribe Link',value: '{{unsubscribe_link}}',category: 'system',  description: 'Link to unsubscribe from emails',                 defaultValue: '[Unsubscribe URL]' },
  { key: 'current_date',    label: 'Current Date',    value: '{{current_date}}',    category: 'system',  description: 'The current date when the email is sent',         defaultValue: new Date().toISOString().split('T')[0] },
];

/**
 * Get all custom variables with optional search and filter.
 * Auto-seeds default variables for users with no variables yet.
 */
export const getCustomVariables = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { search, category, isActive } = req.query;

    logger.info('[CustomVariablesController] Fetching custom variables', {
      search,
      category,
      isActive,
    });

    // Build where conditions - always filter by userId
    const conditions: any[] = [eq(customVariables.userId, userId)];

    if (search && typeof search === 'string') {
      conditions.push(
        or(
          like(customVariables.key, `%${search}%`),
          like(customVariables.label, `%${search}%`),
          like(customVariables.description, `%${search}%`)
        )
      );
    }

    if (category && typeof category === 'string') {
      conditions.push(eq(customVariables.category, category));
    }

    if (isActive !== undefined) {
      conditions.push(eq(customVariables.isActive, isActive === 'true'));
    }

    // Execute query with conditions
    let variables =
      conditions.length > 0
        ? await db
            .select()
            .from(customVariables)
            .where(and(...conditions))
            .orderBy(desc(customVariables.createdAt))
        : await db
            .select()
            .from(customVariables)
            .orderBy(desc(customVariables.createdAt));

    // Auto-seed defaults for new users (no search/filter active, zero results)
    const isUnfiltered = !search && !category && isActive === undefined;
    if (variables.length === 0 && isUnfiltered) {
      logger.info('[CustomVariablesController] No variables for user — auto-seeding defaults', { userId });
      try {
        // Insert each default individually so a key conflict on one row
        // doesn't block the rest (another user may already own that key globally).
        for (const v of DEFAULT_VARIABLES) {
          try {
            await db.insert(customVariables).values({
              ...v,
              userId,
              usageCount: 0,
              isActive: true,
            });
          } catch (rowErr: any) {
            // 23505 = unique_violation — key already taken by another user; skip silently
            if (rowErr.code !== '23505') throw rowErr;
            logger.warn('[CustomVariablesController] Key conflict on auto-seed, skipping', { key: v.key });
          }
        }

        // Re-fetch after seeding
        variables = await db
          .select()
          .from(customVariables)
          .where(eq(customVariables.userId, userId))
          .orderBy(desc(customVariables.createdAt));

        logger.info('[CustomVariablesController] Auto-seed complete', { count: variables.length });
      } catch (seedErr: any) {
        logger.error('[CustomVariablesController] Auto-seed failed', { error: seedErr.message });
        // Non-fatal — return empty list rather than crashing
      }
    }

    logger.info('[CustomVariablesController] Variables fetched', {
      count: variables.length,
    });

    res.json({ success: true, data: variables });
  } catch (error: any) {
    logger.error('[CustomVariablesController] Error fetching variables', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch custom variables',
      message: error.message,
    });
  }
};

/**
 * Get a single custom variable by ID
 */
export const getCustomVariable = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    logger.info('[CustomVariablesController] Fetching variable', { id });

    const [variable] = await db
      .select()
      .from(customVariables)
      .where(and(eq(customVariables.id, id), eq(customVariables.userId, userId)))
      .limit(1);

    if (!variable) {
      logger.warn('[CustomVariablesController] Variable not found', { id });
      return res.status(404).json({
        error: 'Variable not found',
      });
    }

    logger.info('[CustomVariablesController] Variable fetched', {
      id,
      key: variable.key,
    });

    res.json({ success: true, data: variable });
  } catch (error: any) {
    logger.error('[CustomVariablesController] Error fetching variable', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Failed to fetch custom variable',
      message: error.message,
    });
  }
};

/**
 * Create a new custom variable
 */
export const createCustomVariable = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { key, label, value, category, description, defaultValue, isActive } =
      req.body;

    // Validation
    if (!key || !label || !value) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'key, label, and value are required',
      });
    }

    // Ensure key is alphanumeric with underscores only
    if (!/^[a-zA-Z0-9_]+$/.test(key)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'key must contain only letters, numbers, and underscores',
      });
    }

    // Ensure value follows {{key}} format
    const expectedValue = `{{${key}}}`;
    if (value !== expectedValue) {
      return res.status(400).json({
        error: 'Validation failed',
        message: `value must be ${expectedValue} to match the key`,
      });
    }

    logger.info('[CustomVariablesController] Creating variable', {
      key,
      label,
      category,
    });

    const [newVariable] = await db
      .insert(customVariables)
      .values({
        userId,
        key,
        label,
        value,
        category: category || 'custom',
        description: description || null,
        defaultValue: defaultValue || null,
        isActive: isActive !== undefined ? isActive : true,
        usageCount: 0,
      })
      .returning();

    logger.info('[CustomVariablesController] Variable created', {
      id: newVariable.id,
      key: newVariable.key,
    });

    res.status(201).json({ success: true, data: newVariable });
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      logger.warn('[CustomVariablesController] Variable key already exists', {
        error: error.message,
      });

      return res.status(409).json({
        error: 'Variable key already exists',
        message: 'A variable with this key already exists',
      });
    }

    logger.error('[CustomVariablesController] Error creating variable', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Failed to create custom variable',
      message: error.message,
    });
  }
};

/**
 * Update an existing custom variable
 */
export const updateCustomVariable = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { label, category, description, defaultValue, isActive } = req.body;

    logger.info('[CustomVariablesController] Updating variable', { id });

    // Check if variable exists
    const [existingVariable] = await db
      .select()
      .from(customVariables)
      .where(and(eq(customVariables.id, id), eq(customVariables.userId, userId)))
      .limit(1);

    if (!existingVariable) {
      logger.warn('[CustomVariablesController] Variable not found', { id });
      return res.status(404).json({
        error: 'Variable not found',
      });
    }

    // Prepare update data (key and value cannot be changed)
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (label !== undefined) updateData.label = label;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (defaultValue !== undefined) updateData.defaultValue = defaultValue;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updatedVariable] = await db
      .update(customVariables)
      .set(updateData)
      .where(eq(customVariables.id, id))
      .returning();

    logger.info('[CustomVariablesController] Variable updated', {
      id,
      key: updatedVariable.key,
    });

    res.json({ success: true, data: updatedVariable });
  } catch (error: any) {
    logger.error('[CustomVariablesController] Error updating variable', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Failed to update custom variable',
      message: error.message,
    });
  }
};

/**
 * Delete a custom variable
 */
export const deleteCustomVariable = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    logger.info('[CustomVariablesController] Deleting variable', { id });

    // Check if variable exists
    const [existingVariable] = await db
      .select()
      .from(customVariables)
      .where(and(eq(customVariables.id, id), eq(customVariables.userId, userId)))
      .limit(1);

    if (!existingVariable) {
      logger.warn('[CustomVariablesController] Variable not found', { id });
      return res.status(404).json({
        error: 'Variable not found',
      });
    }

    // Warn if variable is in use
    if (existingVariable.usageCount && existingVariable.usageCount > 0) {
      logger.warn('[CustomVariablesController] Deleting variable in use', {
        id,
        usageCount: existingVariable.usageCount,
      });
    }

    await db.delete(customVariables).where(eq(customVariables.id, id));

    logger.info('[CustomVariablesController] Variable deleted', {
      id,
      key: existingVariable.key,
    });

    res.json({
      success: true,
      message: 'Variable deleted successfully',
      deletedVariable: existingVariable,
    });
  } catch (error: any) {
    logger.error('[CustomVariablesController] Error deleting variable', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Failed to delete custom variable',
      message: error.message,
    });
  }
};

/**
 * Increment usage count for a variable
 */
export const incrementUsageCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    logger.info('[CustomVariablesController] Incrementing usage count', { id });

    const [variable] = await db
      .select()
      .from(customVariables)
      .where(and(eq(customVariables.id, id), eq(customVariables.userId, userId)))
      .limit(1);

    if (!variable) {
      logger.warn('[CustomVariablesController] Variable not found', { id });
      return res.status(404).json({
        error: 'Variable not found',
      });
    }

    const [updatedVariable] = await db
      .update(customVariables)
      .set({
        usageCount: (variable.usageCount || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(customVariables.id, id))
      .returning();

    logger.info('[CustomVariablesController] Usage count incremented', {
      id,
      newCount: updatedVariable.usageCount,
    });

    res.json({ success: true, data: updatedVariable });
  } catch (error: any) {
    logger.error('[CustomVariablesController] Error incrementing usage count', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Failed to increment usage count',
      message: error.message,
    });
  }
};
