import { db, auditLog, users } from '@leadnex/database';
import { eq, desc, and, gte, lte, or, ilike } from 'drizzle-orm';

interface GetAuditLogsParams {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  entity?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

class AdminAuditLogService {
  /**
   * Get audit logs with filtering and pagination (Admin only)
   */
  async getAuditLogs(
    adminId: string,
    params: GetAuditLogsParams = {}
  ) {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      entity,
      startDate,
      endDate,
      search,
    } = params;

    // Verify admin
    const admin = await db
      .select()
      .from(users)
      .where(eq(users.id, adminId))
      .limit(1);

    if (!admin.length || admin[0].role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    // Build filters
    const filters = [];

    if (userId) {
      filters.push(eq(auditLog.userId, userId));
    }

    if (action) {
      filters.push(eq(auditLog.action, action));
    }

    if (entity) {
      filters.push(eq(auditLog.entity, entity));
    }

    if (startDate) {
      filters.push(gte(auditLog.createdAt, startDate));
    }

    if (endDate) {
      filters.push(lte(auditLog.createdAt, endDate));
    }

    if (search) {
      filters.push(
        or(
          ilike(auditLog.action, `%${search}%`),
          ilike(auditLog.entity, `%${search}%`),
          ilike(auditLog.ipAddress, `%${search}%`)
        )!
      );
    }

    // Get total count
    const totalLogsResult = await db
      .select({ count: auditLog.id })
      .from(auditLog)
      .where(filters.length > 0 ? and(...filters) : undefined);

    const total = totalLogsResult.length;

    // Get paginated logs with user info
    const logs = await db
      .select({
        id: auditLog.id,
        userId: auditLog.userId,
        action: auditLog.action,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        changes: auditLog.changes,
        ipAddress: auditLog.ipAddress,
        userAgent: auditLog.userAgent,
        createdAt: auditLog.createdAt,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        },
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.userId, users.id))
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get audit log statistics (Admin only)
   */
  async getAuditStats(adminId: string) {
    // Verify admin
    const admin = await db
      .select()
      .from(users)
      .where(eq(users.id, adminId))
      .limit(1);

    if (!admin.length || admin[0].role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    // Get total logs
    const totalLogs = await db.select({ count: auditLog.id }).from(auditLog);

    // Get logs by action (top 10)
    const logsByAction = await db
      .select({
        action: auditLog.action,
        count: auditLog.id,
      })
      .from(auditLog)
      .groupBy(auditLog.action)
      .orderBy(desc(auditLog.id))
      .limit(10);

    // Get logs by entity (top 10)
    const logsByEntity = await db
      .select({
        entity: auditLog.entity,
        count: auditLog.id,
      })
      .from(auditLog)
      .groupBy(auditLog.entity)
      .orderBy(desc(auditLog.id))
      .limit(10);

    // Get logs by user (top 10)
    const logsByUser = await db
      .select({
        userId: auditLog.userId,
        userEmail: users.email,
        userName: users.firstName,
        count: auditLog.id,
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.userId, users.id))
      .groupBy(auditLog.userId, users.email, users.firstName)
      .orderBy(desc(auditLog.id))
      .limit(10);

    // Get recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = await db
      .select({ count: auditLog.id })
      .from(auditLog)
      .where(gte(auditLog.createdAt, yesterday));

    return {
      totalLogs: totalLogs.length,
      recentActivity: recentActivity.length,
      topActions: logsByAction,
      topEntities: logsByEntity,
      topUsers: logsByUser,
    };
  }

  /**
   * Get user's audit log history (Admin only)
   */
  async getUserAuditHistory(adminId: string, userId: string, limit = 50) {
    // Verify admin
    const admin = await db
      .select()
      .from(users)
      .where(eq(users.id, adminId))
      .limit(1);

    if (!admin.length || admin[0].role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    // Get user's audit logs
    const logs = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.userId, userId))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);

    return logs;
  }

  /**
   * Create audit log entry (used by other services)
   */
  async createAuditLog(data: {
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const [log] = await db
      .insert(auditLog)
      .values({
        userId: data.userId || null,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId || null,
        changes: data.changes || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      })
      .returning();

    return log;
  }
}

export default new AdminAuditLogService();
