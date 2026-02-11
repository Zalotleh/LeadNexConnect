import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { authService } from '../services/auth.service';

export class AuthController {
  /**
   * POST /api/auth/login
   * Login with email and password
   */
  async login(req: AuthRequest, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { message: 'Email and password are required' },
        });
      }

      const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login(
        { email, password },
        ipAddress,
        userAgent
      );

      // Set HTTP-only cookie for token
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json(result);
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(401).json({
        success: false,
        error: { message: error.message || 'Login failed' },
      });
    }
  }

  /**
   * POST /api/auth/logout
   * Logout current user
   */
  async logout(req: AuthRequest, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
      const userId = req.user!.id;
      const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
      const userAgent = req.headers['user-agent'];

      const result = await authService.logout(token!, userId, ipAddress, userAgent);

      // Clear cookie
      res.clearCookie('token');

      res.json(result);
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Logout failed' },
      });
    }
  }

  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  async refreshToken(req: AuthRequest, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: { message: 'Refresh token is required' },
        });
      }

      const result = await authService.refreshToken(refreshToken);

      // Update HTTP-only cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json(result);
    } catch (error: any) {
      console.error('Refresh token error:', error);
      res.status(401).json({
        success: false,
        error: { message: error.message || 'Token refresh failed' },
      });
    }
  }

  /**
   * GET /api/auth/me
   * Get current user information
   */
  async getCurrentUser(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const result = await authService.getCurrentUser(userId);
      res.json(result);
    } catch (error: any) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to get user info' },
      });
    }
  }

  /**
   * POST /api/auth/change-password
   * Change password for current user
   */
  async changePassword(req: AuthRequest, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user!.id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: { message: 'Current password and new password are required' },
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: { message: 'New password must be at least 8 characters long' },
        });
      }

      const result = await authService.changePassword(userId, currentPassword, newPassword);

      // Clear cookie to force re-login
      res.clearCookie('token');

      res.json(result);
    } catch (error: any) {
      console.error('Change password error:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Password change failed' },
      });
    }
  }
}

export const authController = new AuthController();
