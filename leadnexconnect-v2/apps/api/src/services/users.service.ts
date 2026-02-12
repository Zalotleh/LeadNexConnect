import { db, users } from '@leadnex/database';
import { eq, and, or, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger';

const SALT_ROUNDS = 12;

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'user' | 'admin';
}

export interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: 'user' | 'admin';
}

export class UsersService {
  /**
   * Get all users (admin only)
   */
  async getAllUsers(adminId: string) {
    try {
      // Verify admin exists
      const admin = await db.query.users.findFirst({
        where: eq(users.id, adminId),
      });

      if (!admin || admin.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      // Get all users
      const allUsers = await db.query.users.findMany({
        columns: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          lastLoginAt: true,
          lastActiveAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: (users, { desc }) => [desc(users.createdAt)],
      });

      logger.info(`[UsersService] Admin ${adminId} retrieved ${allUsers.length} users`);

      return allUsers;
    } catch (error: any) {
      logger.error('[UsersService] Error getting all users', { error: error.message, adminId });
      throw error;
    }
  }

  /**
   * Get user by ID (admin only)
   */
  async getUserById(adminId: string, userId: string) {
    try {
      // Verify admin exists
      const admin = await db.query.users.findFirst({
        where: eq(users.id, adminId),
      });

      if (!admin || admin.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          lastLoginAt: true,
          lastActiveAt: true,
          failedLoginAttempts: true,
          lockedUntil: true,
          createdAt: true,
          updatedAt: true,
          createdBy: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      logger.info(`[UsersService] Admin ${adminId} retrieved user ${userId}`);

      return user;
    } catch (error: any) {
      logger.error('[UsersService] Error getting user by ID', { 
        error: error.message, 
        adminId, 
        userId 
      });
      throw error;
    }
  }

  /**
   * Create new user (admin only)
   */
  async createUser(adminId: string, data: CreateUserData) {
    try {
      // Verify admin exists
      const admin = await db.query.users.findFirst({
        where: eq(users.id, adminId),
      });

      if (!admin || admin.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      // Check if email already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, data.email),
      });

      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

      // Create user
      const [newUser] = await db.insert(users).values({
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || 'user',
        status: 'active',
        createdBy: adminId,
      }).returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      });

      logger.info(`[UsersService] Admin ${adminId} created user ${newUser.id}`, {
        email: newUser.email,
        role: newUser.role,
      });

      return newUser;
    } catch (error: any) {
      logger.error('[UsersService] Error creating user', { 
        error: error.message, 
        adminId,
        email: data.email 
      });
      throw error;
    }
  }

  /**
   * Update user (admin only)
   */
  async updateUser(adminId: string, userId: string, data: UpdateUserData) {
    try {
      // Verify admin exists
      const admin = await db.query.users.findFirst({
        where: eq(users.id, adminId),
      });

      if (!admin || admin.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      // Check if user exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!existingUser) {
        throw new Error('User not found');
      }

      // Prevent admin from demoting themselves
      if (userId === adminId && data.role && data.role !== 'admin') {
        throw new Error('Cannot change your own admin role');
      }

      // If email is being changed, check for duplicates
      if (data.email && data.email !== existingUser.email) {
        const emailExists = await db.query.users.findFirst({
          where: eq(users.email, data.email),
        });

        if (emailExists) {
          throw new Error('Email already exists');
        }
      }

      // Update user
      const [updatedUser] = await db.update(users)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          status: users.status,
          updatedAt: users.updatedAt,
        });

      logger.info(`[UsersService] Admin ${adminId} updated user ${userId}`, {
        changes: data,
      });

      return updatedUser;
    } catch (error: any) {
      logger.error('[UsersService] Error updating user', { 
        error: error.message, 
        adminId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(adminId: string, userId: string) {
    try {
      // Verify admin exists
      const admin = await db.query.users.findFirst({
        where: eq(users.id, adminId),
      });

      if (!admin || admin.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      // Prevent admin from deleting themselves
      if (userId === adminId) {
        throw new Error('Cannot delete your own account');
      }

      // Check if user exists
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Delete user (cascade will handle related data)
      await db.delete(users).where(eq(users.id, userId));

      logger.info(`[UsersService] Admin ${adminId} deleted user ${userId}`, {
        deletedEmail: user.email,
      });

      return { success: true, message: 'User deleted successfully' };
    } catch (error: any) {
      logger.error('[UsersService] Error deleting user', { 
        error: error.message, 
        adminId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Change user status (admin only)
   */
  async changeUserStatus(
    adminId: string, 
    userId: string, 
    status: 'active' | 'inactive' | 'suspended'
  ) {
    try {
      // Verify admin exists
      const admin = await db.query.users.findFirst({
        where: eq(users.id, adminId),
      });

      if (!admin || admin.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      // Prevent admin from deactivating themselves
      if (userId === adminId && status !== 'active') {
        throw new Error('Cannot deactivate your own account');
      }

      // Check if user exists
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Update status
      const [updatedUser] = await db.update(users)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          status: users.status,
          updatedAt: users.updatedAt,
        });

      logger.info(`[UsersService] Admin ${adminId} changed user ${userId} status to ${status}`);

      return updatedUser;
    } catch (error: any) {
      logger.error('[UsersService] Error changing user status', { 
        error: error.message, 
        adminId,
        userId,
        status 
      });
      throw error;
    }
  }

  /**
   * Get user statistics (for admin analytics)
   */
  async getUserStats(adminId: string, userId: string) {
    try {
      // Verify admin exists
      const admin = await db.query.users.findFirst({
        where: eq(users.id, adminId),
      });

      if (!admin || admin.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      // Get user stats from various tables
      const stats = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM leads WHERE user_id = ${userId}) as leads_count,
          (SELECT COUNT(*) FROM campaigns WHERE user_id = ${userId}) as campaigns_count,
          (SELECT COUNT(*) FROM emails WHERE user_id = ${userId}) as emails_count,
          (SELECT COUNT(*) FROM workflows WHERE user_id = ${userId}) as workflows_count,
          (SELECT COUNT(*) FROM email_templates WHERE user_id = ${userId}) as templates_count,
          (SELECT COUNT(*) FROM api_usage WHERE user_id = ${userId}) as api_calls_count
      `);

      return stats[0];
    } catch (error: any) {
      logger.error('[UsersService] Error getting user stats', { 
        error: error.message, 
        adminId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Bulk operations on multiple users (admin only)
   */
  async bulkOperation(
    adminId: string, 
    userIds: string[], 
    operation: 'activate' | 'deactivate' | 'delete'
  ) {
    try {
      // Verify admin exists
      const admin = await db.query.users.findFirst({
        where: eq(users.id, adminId),
      });

      if (!admin || admin.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const userId of userIds) {
        try {
          // Prevent admin from operating on themselves
          if (userId === adminId) {
            errors.push(`Cannot perform ${operation} on yourself`);
            failedCount++;
            continue;
          }

          // Verify user exists
          const targetUser = await db.query.users.findFirst({
            where: eq(users.id, userId),
          });

          if (!targetUser) {
            errors.push(`User ${userId} not found`);
            failedCount++;
            continue;
          }

          // Perform operation
          switch (operation) {
            case 'activate':
              await db
                .update(users)
                .set({ 
                  status: 'active',
                  updatedAt: new Date() 
                })
                .where(eq(users.id, userId));
              successCount++;
              break;

            case 'deactivate':
              await db
                .update(users)
                .set({ 
                  status: 'inactive',
                  updatedAt: new Date() 
                })
                .where(eq(users.id, userId));
              successCount++;
              break;

            case 'delete':
              await db.delete(users).where(eq(users.id, userId));
              successCount++;
              break;

            default:
              errors.push(`Invalid operation: ${operation}`);
              failedCount++;
          }
        } catch (error: any) {
          logger.error('[UsersService] Error in bulk operation for user', { 
            error: error.message, 
            userId 
          });
          errors.push(`${userId}: ${error.message}`);
          failedCount++;
        }
      }

      return {
        success: successCount,
        failed: failedCount,
        total: userIds.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      logger.error('[UsersService] Error in bulk operation', { 
        error: error.message, 
        adminId,
        operation 
      });
      throw error;
    }
  }
}

export const usersService = new UsersService();

