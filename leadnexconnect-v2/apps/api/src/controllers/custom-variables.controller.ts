import { Request, Response } from 'express';
import { db } from '@leadnex/database';
import { customVariables } from '@leadnex/database';
import { eq, like, or, desc, and } from 'drizzle-orm';
import { logger } from '../utils/logger';

/**
 * Get all custom variables with optional search and filter
 */
export const getCustomVariables = async (req: Request, res: Response) => {
  try {
    const { search, category, isActive } = req.query;

    logger.info('[CustomVariablesController] Fetching custom variables', {
      search,
      category,
      isActive,
    });

    // Build where conditions
    const conditions: any[] = [];

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
    const variables =
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
export const getCustomVariable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    logger.info('[CustomVariablesController] Fetching variable', { id });

    const [variable] = await db
      .select()
      .from(customVariables)
      .where(eq(customVariables.id, id))
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
export const createCustomVariable = async (req: Request, res: Response) => {
  try {
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
export const updateCustomVariable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, category, description, defaultValue, isActive } = req.body;

    logger.info('[CustomVariablesController] Updating variable', { id });

    // Check if variable exists
    const [existingVariable] = await db
      .select()
      .from(customVariables)
      .where(eq(customVariables.id, id))
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
export const deleteCustomVariable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    logger.info('[CustomVariablesController] Deleting variable', { id });

    // Check if variable exists
    const [existingVariable] = await db
      .select()
      .from(customVariables)
      .where(eq(customVariables.id, id))
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
export const incrementUsageCount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    logger.info('[CustomVariablesController] Incrementing usage count', { id });

    const [variable] = await db
      .select()
      .from(customVariables)
      .where(eq(customVariables.id, id))
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
