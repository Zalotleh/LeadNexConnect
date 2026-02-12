import { db, users, auditLog } from '@leadnex/database';
import { eq, desc, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

export class AdminExportService {
  /**
   * Verify admin access
   */
  private async verifyAdmin(adminId: string) {
    const admin = await db.query.users.findFirst({
      where: eq(users.id, adminId),
    });

    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    return admin;
  }

  /**
   * Export users to CSV format
   */
  async exportUsers(adminId: string) {
    try {
      await this.verifyAdmin(adminId);

      const allUsers = await db.query.users.findMany({
        columns: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          lastActiveAt: true,
        },
        orderBy: [desc(users.createdAt)],
      });

      // Convert to CSV
      const headers = ['ID', 'Email', 'First Name', 'Last Name', 'Role', 'Status', 'Created At', 'Last Login', 'Last Active'];
      const rows = allUsers.map(user => [
        user.id,
        user.email,
        user.firstName,
        user.lastName,
        user.role,
        user.status,
        user.createdAt?.toISOString() || '',
        user.lastLoginAt?.toISOString() || '',
        user.lastActiveAt?.toISOString() || '',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => this.escapeCsvCell(cell)).join(',')),
      ].join('\n');

      return {
        filename: `users-export-${new Date().toISOString().split('T')[0]}.csv`,
        content: csv,
        mimeType: 'text/csv',
      };
    } catch (error: any) {
      logger.error('[AdminExportService] Error exporting users', { 
        error: error.message, 
        adminId 
      });
      throw error;
    }
  }

  /**
   * Export audit logs to CSV format
   */
  async exportAuditLogs(
    adminId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      userId?: string;
      action?: string;
      entity?: string;
    }
  ) {
    try {
      await this.verifyAdmin(adminId);

      // Build query
      let query = db.select({
        id: auditLog.id,
        userId: auditLog.userId,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        userEmail: users.email,
        action: auditLog.action,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        changes: auditLog.changes,
        ipAddress: auditLog.ipAddress,
        userAgent: auditLog.userAgent,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.userId, users.id))
      .orderBy(desc(auditLog.createdAt))
      .$dynamic();

      // Apply filters (simplified - in production, use proper where conditions)
      const logs = await query;

      // Convert to CSV
      const headers = ['ID', 'User ID', 'User Name', 'Email', 'Action', 'Entity', 'Entity ID', 'Changes', 'IP Address', 'User Agent', 'Created At'];
      const rows = logs.map(log => [
        log.id,
        log.userId || '',
        log.userName || '',
        log.userEmail || '',
        log.action,
        log.entity,
        log.entityId || '',
        JSON.stringify(log.changes || {}),
        log.ipAddress || '',
        log.userAgent || '',
        log.createdAt?.toISOString() || '',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => this.escapeCsvCell(cell)).join(',')),
      ].join('\n');

      return {
        filename: `audit-logs-export-${new Date().toISOString().split('T')[0]}.csv`,
        content: csv,
        mimeType: 'text/csv',
      };
    } catch (error: any) {
      logger.error('[AdminExportService] Error exporting audit logs', { 
        error: error.message, 
        adminId 
      });
      throw error;
    }
  }

  /**
   * Export sessions to CSV format
   */
  async exportSessions(adminId: string) {
    try {
      await this.verifyAdmin(adminId);

      const sessions = await db.execute(sql`
        SELECT 
          s.id,
          s.user_id,
          u.first_name || ' ' || u.last_name as user_name,
          u.email,
          s.ip_address,
          s.user_agent,
          s.created_at,
          s.last_used_at,
          s.expires_at,
          CASE 
            WHEN s.expires_at > NOW() THEN 'active'
            ELSE 'expired'
          END as status
        FROM sessions s
        LEFT JOIN users u ON s.user_id = u.id
        ORDER BY s.created_at DESC
      `);

      // Convert to CSV
      const headers = ['ID', 'User ID', 'User Name', 'Email', 'IP Address', 'User Agent', 'Created At', 'Last Used', 'Expires At', 'Status'];
      const rows = sessions.map((session: any) => [
        session.id,
        session.user_id || '',
        session.user_name || '',
        session.email || '',
        session.ip_address || '',
        session.user_agent || '',
        session.created_at ? new Date(session.created_at).toISOString() : '',
        session.last_used_at ? new Date(session.last_used_at).toISOString() : '',
        session.expires_at ? new Date(session.expires_at).toISOString() : '',
        session.status || '',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => this.escapeCsvCell(cell)).join(',')),
      ].join('\n');

      return {
        filename: `sessions-export-${new Date().toISOString().split('T')[0]}.csv`,
        content: csv,
        mimeType: 'text/csv',
      };
    } catch (error: any) {
      logger.error('[AdminExportService] Error exporting sessions', { 
        error: error.message, 
        adminId 
      });
      throw error;
    }
  }

  /**
   * Escape CSV cell value
   */
  private escapeCsvCell(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);

    // If value contains comma, quotes, or newlines, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }
}

export const adminExportService = new AdminExportService();
