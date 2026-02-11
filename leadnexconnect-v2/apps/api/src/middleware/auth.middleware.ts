import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, users, sessions } from '@leadnex/database';
import { eq, and, gte } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin';
    firstName: string;
    lastName: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token from header or cookie
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || req.cookies?.token;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'Authentication required' } 
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      role: 'user' | 'admin';
    };

    // Check if session exists and is valid
    const session = await db.query.sessions.findFirst({
      where: and(
        eq(sessions.token, token),
        eq(sessions.userId, decoded.userId),
        gte(sessions.expiresAt, new Date())
      ),
    });

    if (!session) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'Session expired or invalid' } 
      });
    }

    // Get user details
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'User not found or inactive' } 
      });
    }

    // Update last used
    await db.update(sessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(sessions.id, session.id));

    // Update user last active
    await db.update(users)
      .set({ lastActiveAt: new Date() })
      .where(eq(users.id, user.id));

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as 'user' | 'admin',
      firstName: user.firstName,
      lastName: user.lastName,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ 
      success: false, 
      error: { message: 'Invalid or expired token' } 
    });
  }
};
