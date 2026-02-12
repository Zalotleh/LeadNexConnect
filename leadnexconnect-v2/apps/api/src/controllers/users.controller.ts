import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { usersService } from '../services/users.service';
import { logger } from '../utils/logger';

export class UsersController {
  /**
   * GET /api/users
   * Get all users (admin only)
   */
  async getAllUsers(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;

      const users = await usersService.getAllUsers(adminId);

      res.json({
        success: true,
        data: {
          users,
          total: users.length,
        },
      });
    } catch (error: any) {
      logger.error('[UsersController] Error in getAllUsers', { error: error.message });
      
      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
        success: false,
        error: {
          message: error.message || 'Failed to get users',
          code: error.message.includes('Unauthorized') ? 'FORBIDDEN' : 'INTERNAL_ERROR',
        },
      });
    }
  }

  /**
   * GET /api/users/:id
   * Get user by ID (admin only)
   */
  async getUserById(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;

      const user = await usersService.getUserById(adminId, id);

      res.json({
        success: true,
        data: { user },
      });
    } catch (error: any) {
      logger.error('[UsersController] Error in getUserById', { 
        error: error.message,
        userId: req.params.id 
      });
      
      const status = error.message.includes('Unauthorized') ? 403 
                   : error.message.includes('not found') ? 404 
                   : 500;

      res.status(status).json({
        success: false,
        error: {
          message: error.message || 'Failed to get user',
          code: error.message.includes('Unauthorized') ? 'FORBIDDEN'
               : error.message.includes('not found') ? 'NOT_FOUND'
               : 'INTERNAL_ERROR',
        },
      });
    }
  }

  /**
   * POST /api/users
   * Create new user (admin only)
   */
  async createUser(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;
      const { email, password, firstName, lastName, role } = req.body;

      // Validation
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Email, password, firstName, and lastName are required',
            code: 'VALIDATION_ERROR',
          },
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid email format',
            code: 'VALIDATION_ERROR',
          },
        });
      }

      // Password strength validation (min 8 chars, 1 uppercase, 1 number)
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Password must be at least 8 characters with 1 uppercase letter and 1 number',
            code: 'VALIDATION_ERROR',
          },
        });
      }

      const newUser = await usersService.createUser(adminId, {
        email,
        password,
        firstName,
        lastName,
        role: role || 'user',
      });

      res.status(201).json({
        success: true,
        data: { user: newUser },
        message: 'User created successfully',
      });
    } catch (error: any) {
      logger.error('[UsersController] Error in createUser', { error: error.message });
      
      const status = error.message.includes('Unauthorized') ? 403 
                   : error.message.includes('already exists') ? 409 
                   : 500;

      res.status(status).json({
        success: false,
        error: {
          message: error.message || 'Failed to create user',
          code: error.message.includes('Unauthorized') ? 'FORBIDDEN'
               : error.message.includes('already exists') ? 'CONFLICT'
               : 'INTERNAL_ERROR',
        },
      });
    }
  }

  /**
   * PUT /api/users/:id
   * Update user (admin only)
   */
  async updateUser(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;
      const { email, firstName, lastName, role } = req.body;

      // Email format validation if provided
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Invalid email format',
              code: 'VALIDATION_ERROR',
            },
          });
        }
      }

      const updatedUser = await usersService.updateUser(adminId, id, {
        email,
        firstName,
        lastName,
        role,
      });

      res.json({
        success: true,
        data: { user: updatedUser },
        message: 'User updated successfully',
      });
    } catch (error: any) {
      logger.error('[UsersController] Error in updateUser', { 
        error: error.message,
        userId: req.params.id 
      });
      
      const status = error.message.includes('Unauthorized') ? 403 
                   : error.message.includes('not found') ? 404 
                   : error.message.includes('already exists') ? 409
                   : error.message.includes('Cannot change') ? 400
                   : 500;

      res.status(status).json({
        success: false,
        error: {
          message: error.message || 'Failed to update user',
          code: error.message.includes('Unauthorized') ? 'FORBIDDEN'
               : error.message.includes('not found') ? 'NOT_FOUND'
               : error.message.includes('already exists') ? 'CONFLICT'
               : error.message.includes('Cannot change') ? 'BAD_REQUEST'
               : 'INTERNAL_ERROR',
        },
      });
    }
  }

  /**
   * DELETE /api/users/:id
   * Delete user (admin only)
   */
  async deleteUser(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;

      const result = await usersService.deleteUser(adminId, id);

      res.json({
        success: true,
        data: result,
        message: 'User deleted successfully',
      });
    } catch (error: any) {
      logger.error('[UsersController] Error in deleteUser', { 
        error: error.message,
        userId: req.params.id 
      });
      
      const status = error.message.includes('Unauthorized') ? 403 
                   : error.message.includes('not found') ? 404 
                   : error.message.includes('Cannot delete') ? 400
                   : 500;

      res.status(status).json({
        success: false,
        error: {
          message: error.message || 'Failed to delete user',
          code: error.message.includes('Unauthorized') ? 'FORBIDDEN'
               : error.message.includes('not found') ? 'NOT_FOUND'
               : error.message.includes('Cannot delete') ? 'BAD_REQUEST'
               : 'INTERNAL_ERROR',
        },
      });
    }
  }

  /**
   * PATCH /api/users/:id/status
   * Change user status (admin only)
   */
  async changeUserStatus(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;
      const { status } = req.body;

      // Validation
      if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Valid status is required (active, inactive, or suspended)',
            code: 'VALIDATION_ERROR',
          },
        });
      }

      const updatedUser = await usersService.changeUserStatus(adminId, id, status);

      res.json({
        success: true,
        data: { user: updatedUser },
        message: `User status changed to ${status}`,
      });
    } catch (error: any) {
      logger.error('[UsersController] Error in changeUserStatus', { 
        error: error.message,
        userId: req.params.id 
      });
      
      const status = error.message.includes('Unauthorized') ? 403 
                   : error.message.includes('not found') ? 404 
                   : error.message.includes('Cannot deactivate') ? 400
                   : 500;

      res.status(status).json({
        success: false,
        error: {
          message: error.message || 'Failed to change user status',
          code: error.message.includes('Unauthorized') ? 'FORBIDDEN'
               : error.message.includes('not found') ? 'NOT_FOUND'
               : error.message.includes('Cannot deactivate') ? 'BAD_REQUEST'
               : 'INTERNAL_ERROR',
        },
      });
    }
  }

  /**
   * GET /api/users/:id/stats
   * Get user statistics (admin only)
   */
  async getUserStats(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;

      const stats = await usersService.getUserStats(adminId, id);

      res.json({
        success: true,
        data: { stats },
      });
    } catch (error: any) {
      logger.error('[UsersController] Error in getUserStats', { 
        error: error.message,
        userId: req.params.id 
      });
      
      const status = error.message.includes('Unauthorized') ? 403 : 500;

      res.status(status).json({
        success: false,
        error: {
          message: error.message || 'Failed to get user statistics',
          code: error.message.includes('Unauthorized') ? 'FORBIDDEN' : 'INTERNAL_ERROR',
        },
      });
    }
  }

  /**
   * POST /api/users/bulk
   * Perform bulk operations on multiple users (admin only)
   */
  async bulkOperation(req: AuthRequest, res: Response) {
    try {
      const adminId = req.user!.id;
      const { userIds, operation } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'userIds array is required' },
        });
      }

      if (!operation || !['activate', 'deactivate', 'delete'].includes(operation)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid operation. Must be: activate, deactivate, or delete' },
        });
      }

      const result = await usersService.bulkOperation(adminId, userIds, operation);

      res.json({
        success: true,
        data: result,
        message: `Bulk ${operation} completed successfully`,
      });
    } catch (error: any) {
      logger.error('[UsersController] Error in bulkOperation', { error: error.message });

      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
        success: false,
        error: {
          message: error.message || 'Failed to perform bulk operation',
          code: error.message.includes('Unauthorized') ? 'FORBIDDEN' : 'INTERNAL_ERROR',
        },
      });
    }
  }
}

export const usersController = new UsersController();
