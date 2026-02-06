import { Router } from 'express';
import { scrapingController } from '../controllers/scraping.controller';

const router = Router();

router.get('/status', (req, res) => scrapingController.getStatus(req, res));
router.post('/start', (req, res) => scrapingController.startScraping(req, res));
router.post('/apollo', (req, res) => scrapingController.generateFromApollo(req, res));
router.post('/google-places', (req, res) => scrapingController.generateFromGooglePlaces(req, res));
router.post('/peopledatalabs', (req, res) => scrapingController.generateFromPDL(req, res));
router.post('/linkedin', (req, res) => scrapingController.importFromLinkedIn(req, res));

export default router;
