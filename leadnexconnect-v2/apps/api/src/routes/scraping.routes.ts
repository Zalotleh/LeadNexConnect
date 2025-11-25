import { Router } from 'express';
import { scrapingController } from '../controllers/scraping.controller';

const router = Router();

router.get('/status', (req, res) => scrapingController.getStatus(req, res));
router.post('/start', (req, res) => scrapingController.startScraping(req, res));

export default router;
