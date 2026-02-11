import { Router } from 'express';
import { usersController } from '../controllers/users.controller';

const router = Router();

/**
 * User Management Routes (Admin Only)
 * All routes here require authMiddleware and requireAdmin middleware
 * which are applied in index.ts
 */

// Get all users
router.get('/', (req, res) => usersController.getAllUsers(req as any, res));

// Create new user
router.post('/', (req, res) => usersController.createUser(req as any, res));

// Get user by ID
router.get('/:id', (req, res) => usersController.getUserById(req as any, res));

// Update user
router.put('/:id', (req, res) => usersController.updateUser(req as any, res));

// Delete user
router.delete('/:id', (req, res) => usersController.deleteUser(req as any, res));

// Change user status
router.patch('/:id/status', (req, res) => usersController.changeUserStatus(req as any, res));

// Get user statistics
router.get('/:id/stats', (req, res) => usersController.getUserStats(req as any, res));

export default router;
