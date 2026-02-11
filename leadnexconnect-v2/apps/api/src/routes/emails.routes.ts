import { Router } from 'express';
import { emailsController } from '../controllers/emails.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Protected routes (require authentication)
router.get('/', authMiddleware, (req, res) => emailsController.getEmails(req, res));
router.get('/:id', authMiddleware, (req, res) => emailsController.getEmail(req, res));
router.post('/send', authMiddleware, (req, res) => emailsController.sendEmail(req, res));

// Public tracking endpoints - No auth required (tracking pixels and links make GET requests)
router.get('/track/open/:id', (req, res) => emailsController.trackOpen(req, res));
router.get('/track/click/:id', (req, res) => emailsController.trackClick(req, res));

export default router;
