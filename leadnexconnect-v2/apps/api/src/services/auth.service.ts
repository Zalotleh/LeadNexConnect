import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db, users, sessions, auditLog } from '@leadnex/database';
import { eq, and, gte } from 'drizzle-orm';

const SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

interface LoginCredentials {
  email: string;
  password: string;
}

interface TokenPair {
  token: string;
  refreshToken: string;
  expiresAt: Date;
}

export class AuthService {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials, ipAddress?: string, userAgent?: string) {
    const { email, password } = credentials;

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new Error(`Account locked. Try again in ${minutesLeft} minutes`);
    }

    // Check if account is active
    if (user.status !== 'active') {
      throw new Error('Account is inactive or suspended');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed login attempts
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateData: any = { failedLoginAttempts: newAttempts };

      // Lock account after 5 failed attempts
      if (newAttempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }

      await db.update(users).set(updateData).where(eq(users.id, user.id));

      throw new Error('Invalid email or password');
    }

    // Reset failed login attempts on successful login
    await db.update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Create session
    const { token, refreshToken, expiresAt } = await this.createSession(
      user.id,
      user.email,
      user.role as 'user' | 'admin',
      ipAddress,
      userAgent
    );

    // Log login
    await this.logAudit(user.id, 'login', 'user', user.id, 'User logged in', ipAddress, userAgent);

    return {
      success: true,
      token,
      refreshToken,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  /**
   * Logout user (invalidate session)
   */
  async logout(token: string, userId: string, ipAddress?: string, userAgent?: string) {
    // Delete session
    await db.delete(sessions).where(eq(sessions.token, token));

    // Log logout
    await this.logAudit(userId, 'logout', 'user', userId, 'User logged out', ipAddress, userAgent);

    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string) {
    // Find session by refresh token
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.refreshToken, refreshToken),
    });

    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid or expired refresh token');
    }

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    if (!user || user.status !== 'active') {
      throw new Error('User not found or inactive');
    }

    // Generate new token pair
    const tokenPair = this.generateTokenPair(user.id, user.email, user.role as 'user' | 'admin');

    // Update session with new tokens
    await db.update(sessions)
      .set({
        token: tokenPair.token,
        refreshToken: tokenPair.refreshToken,
        expiresAt: tokenPair.expiresAt,
        lastUsedAt: new Date(),
      })
      .where(eq(sessions.id, session.id));

    return {
      success: true,
      token: tokenPair.token,
      refreshToken: tokenPair.refreshToken,
      expiresAt: tokenPair.expiresAt,
    };
  }

  /**
   * Get current user info
   */
  async getCurrentUser(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        passwordHash: false, // Exclude password hash
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await db.update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    // Invalidate all sessions (force re-login)
    await db.delete(sessions).where(eq(sessions.userId, userId));

    // Log password change
    await this.logAudit(userId, 'password_change', 'user', userId, 'Password changed');

    return { success: true, message: 'Password changed successfully. Please login again.' };
  }

  /**
   * Create a new session and generate tokens
   */
  private async createSession(
    userId: string,
    email: string,
    role: 'user' | 'admin',
    ipAddress?: string,
    userAgent?: string
  ): Promise<TokenPair> {
    const tokenPair = this.generateTokenPair(userId, email, role);

    // Create session record
    await db.insert(sessions).values({
      userId,
      token: tokenPair.token,
      refreshToken: tokenPair.refreshToken,
      ipAddress,
      userAgent,
      expiresAt: tokenPair.expiresAt,
    });

    return tokenPair;
  }

  /**
   * Generate JWT token pair
   */
  private generateTokenPair(userId: string, email: string, role: 'user' | 'admin'): TokenPair {
    const token = jwt.sign({ userId, email, role }, process.env.JWT_SECRET!, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign({ userId, email, role, type: 'refresh' }, process.env.JWT_SECRET!, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return { token, refreshToken, expiresAt };
  }

  /**
   * Log audit event
   */
  private async logAudit(
    userId: string,
    action: string,
    entity: string,
    entityId: string,
    changes?: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await db.insert(auditLog).values({
        userId,
        action,
        entity,
        entityId,
        changes: typeof changes === 'string' ? { description: changes } : changes,
        ipAddress,
        userAgent,
      });
    } catch (error) {
      console.error('Audit log error:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }
}

export const authService = new AuthService();
