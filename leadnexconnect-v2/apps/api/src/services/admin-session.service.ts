import { db } from '@leadnex/database';
import { sessions, users } from '@leadnex/database';
import { eq, desc, sql, and, gte } from 'drizzle-orm';

class AdminSessionService {
  /**
   * Get all active sessions with user information
   * @param adminId - The admin user ID making the request
   * @returns List of active sessions
   */
  async getActiveSessions(adminId: string) {
    // Verify admin status
    const admin = await db.query.users.findFirst({
      where: eq(users.id, adminId),
    });

    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    // Get all active sessions (not expired)
    const now = new Date();
    const activeSessions = await db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        userEmail: users.email,
        userRole: users.role,
        ipAddress: sessions.ipAddress,
        userAgent: sessions.userAgent,
        expiresAt: sessions.expiresAt,
        createdAt: sessions.createdAt,
        lastUsedAt: sessions.lastUsedAt,
      })
      .from(sessions)
      .leftJoin(users, eq(sessions.userId, users.id))
      .where(gte(sessions.expiresAt, now))
      .orderBy(desc(sessions.lastUsedAt));

    return activeSessions;
  }

  /**
   * Get statistics about sessions
   * @param adminId - The admin user ID making the request
   * @returns Session statistics
   */
  async getSessionStats(adminId: string) {
    // Verify admin status
    const admin = await db.query.users.findFirst({
      where: eq(users.id, adminId),
    });

    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const now = new Date();

    // Total active sessions
    const [{ count: totalActive }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessions)
      .where(gte(sessions.expiresAt, now));

    // Total sessions (including expired)
    const [{ count: totalSessions }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessions);

    // Active sessions in last 24 hours
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [{ count: recentActivity }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessions)
      .where(
        and(
          gte(sessions.expiresAt, now),
          gte(sessions.lastUsedAt, last24Hours)
        )
      );

    // Most active users (by session count)
    const topUsers = await db
      .select({
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        userEmail: users.email,
        count: sql<number>`count(*)`,
      })
      .from(sessions)
      .leftJoin(users, eq(sessions.userId, users.id))
      .where(gte(sessions.expiresAt, now))
      .groupBy(users.firstName, users.lastName, users.email)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    return {
      totalActive: Number(totalActive),
      totalSessions: Number(totalSessions),
      recentActivity: Number(recentActivity),
      topUsers,
    };
  }

  /**
   * Get sessions for a specific user
   * @param adminId - The admin user ID making the request
   * @param userId - The user ID to get sessions for
   * @returns List of user's sessions
   */
  async getUserSessions(adminId: string, userId: string) {
    // Verify admin status
    const admin = await db.query.users.findFirst({
      where: eq(users.id, adminId),
    });

    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const now = new Date();
    const userSessions = await db
      .select({
        id: sessions.id,
        ipAddress: sessions.ipAddress,
        userAgent: sessions.userAgent,
        expiresAt: sessions.expiresAt,
        createdAt: sessions.createdAt,
        lastUsedAt: sessions.lastUsedAt,
        isActive: sql<boolean>`${sessions.expiresAt} >= ${now}`,
      })
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.lastUsedAt));

    return userSessions;
  }

  /**
   * Revoke (delete) a session
   * @param adminId - The admin user ID making the request
   * @param sessionId - The session ID to revoke
   * @returns Success status
   */
  async revokeSession(adminId: string, sessionId: string) {
    // Verify admin status
    const admin = await db.query.users.findFirst({
      where: eq(users.id, adminId),
    });

    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    // Get session info before deletion for audit log
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Delete the session
    await db.delete(sessions).where(eq(sessions.id, sessionId));

    // Log the action
    // Note: This could be enhanced to use the audit log service
    console.log(`Session ${sessionId} revoked by admin ${adminId}`);

    return {
      success: true,
      sessionId,
      userId: session.userId,
    };
  }

  /**
   * Revoke all sessions for a specific user
   * @param adminId - The admin user ID making the request
   * @param userId - The user ID whose sessions should be revoked
   * @returns Number of sessions revoked
   */
  async revokeUserSessions(adminId: string, userId: string) {
    // Verify admin status
    const admin = await db.query.users.findFirst({
      where: eq(users.id, adminId),
    });

    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    // Prevent admin from revoking their own sessions
    if (adminId === userId) {
      throw new Error('Cannot revoke your own sessions');
    }

    // Count sessions before deletion
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessions)
      .where(eq(sessions.userId, userId));

    // Delete all sessions for the user
    await db.delete(sessions).where(eq(sessions.userId, userId));

    // Log the action
    console.log(`${count} sessions revoked for user ${userId} by admin ${adminId}`);

    return {
      success: true,
      userId,
      sessionsRevoked: Number(count),
    };
  }
}

export default new AdminSessionService();
