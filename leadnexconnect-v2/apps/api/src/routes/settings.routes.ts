import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';

const router = Router();

router.get('/', (req, res) => settingsController.getSettings(req, res));
router.get('/unmasked/:key', (req, res) => settingsController.getUnmaskedSetting(req, res));
router.put('/', (req, res) => settingsController.updateSettings(req, res));
router.post('/test-smtp', (req, res) => settingsController.testSMTP(req, res));
router.post('/clear-cache', (req, res) => settingsController.clearCache(req, res));

export default router;
