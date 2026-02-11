import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * Auth Routes
 * Base path: /api/auth
 */

// Public routes (no auth required)
router.post('/login', (req, res) => authController.login(req, res));
router.post('/refresh', (req, res) => authController.refreshToken(req, res));

// Protected routes (auth required)
router.post('/logout', authMiddleware, (req, res) => authController.logout(req, res));
router.get('/me', authMiddleware, (req, res) => authController.getCurrentUser(req, res));
router.post('/change-password', authMiddleware, (req, res) => authController.changePassword(req, res));

export default router;
