import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { db, senderProfiles } from '@leadnex/database';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

/**
 * GET /api/sender-profile
 * Returns the current user's sender profile (or empty object if not set yet).
 */
export const getSenderProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const [profile] = await db
      .select()
      .from(senderProfiles)
      .where(eq(senderProfiles.userId, userId))
      .limit(1);

    // Return profile or empty defaults so the frontend always has a consistent shape
    res.json({
      success: true,
      data: profile ?? {
        userId,
        senderName: null,
        senderEmail: null,
        replyTo: null,
        signatureHtml: null,
      },
    });
  } catch (error: any) {
    logger.error('[SenderProfileController] Error fetching sender profile', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch sender profile' });
  }
};

/**
 * PUT /api/sender-profile
 * Creates or updates the current user's sender profile (upsert).
 */
export const upsertSenderProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { senderName, senderEmail, replyTo, signatureHtml } = req.body;

    // Check if a profile already exists
    const [existing] = await db
      .select({ id: senderProfiles.id })
      .from(senderProfiles)
      .where(eq(senderProfiles.userId, userId))
      .limit(1);

    if (existing) {
      // Update
      await db
        .update(senderProfiles)
        .set({
          senderName:    senderName    ?? null,
          senderEmail:   senderEmail   ?? null,
          replyTo:       replyTo       ?? null,
          signatureHtml: signatureHtml ?? null,
          updatedAt:     new Date(),
        })
        .where(eq(senderProfiles.userId, userId));
    } else {
      // Insert
      await db.insert(senderProfiles).values({
        userId,
        senderName:    senderName    ?? null,
        senderEmail:   senderEmail   ?? null,
        replyTo:       replyTo       ?? null,
        signatureHtml: signatureHtml ?? null,
      });
    }

    const [updated] = await db
      .select()
      .from(senderProfiles)
      .where(eq(senderProfiles.userId, userId))
      .limit(1);

    logger.info('[SenderProfileController] Sender profile saved', { userId });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    logger.error('[SenderProfileController] Error saving sender profile', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to save sender profile' });
  }
};
