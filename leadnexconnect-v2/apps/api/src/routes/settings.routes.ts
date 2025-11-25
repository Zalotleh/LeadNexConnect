import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';

const router = Router();

router.get('/', (req, res) => settingsController.getSettings(req, res));
router.put('/', (req, res) => settingsController.updateSettings(req, res));

router.get('/templates', (req, res) => settingsController.getTemplates(req, res));
router.post('/templates', (req, res) => settingsController.createTemplate(req, res));
router.put('/templates/:id', (req, res) => settingsController.updateTemplate(req, res));
router.delete('/templates/:id', (req, res) => settingsController.deleteTemplate(req, res));

export default router;
