import { Router } from 'express';
import { emailsController } from '../controllers/emails.controller';

const router = Router();

router.get('/', (req, res) => emailsController.getEmails(req, res));
router.get('/:id', (req, res) => emailsController.getEmail(req, res));
router.post('/send', (req, res) => emailsController.sendEmail(req, res));
router.post('/:id/track-open', (req, res) => emailsController.trackOpen(req, res));
router.post('/:id/track-click', (req, res) => emailsController.trackClick(req, res));

export default router;
