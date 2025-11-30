import { Router } from 'express';
import { emailsController } from '../controllers/emails.controller';

const router = Router();

router.get('/', (req, res) => emailsController.getEmails(req, res));
router.get('/:id', (req, res) => emailsController.getEmail(req, res));
router.post('/send', (req, res) => emailsController.sendEmail(req, res));
// Tracking endpoints - use GET because tracking pixel and links make GET requests
router.get('/track/open/:id', (req, res) => emailsController.trackOpen(req, res));
router.get('/track/click/:id', (req, res) => emailsController.trackClick(req, res));

export default router;
