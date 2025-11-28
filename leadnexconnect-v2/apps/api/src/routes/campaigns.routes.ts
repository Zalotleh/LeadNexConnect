import { Router } from 'express';
import { campaignsController } from '../controllers/campaigns.controller';

const router = Router();

router.get('/', (req, res) => campaignsController.getCampaigns(req, res));
router.get('/:id', (req, res) => campaignsController.getCampaign(req, res));
router.post('/', (req, res) => campaignsController.createCampaign(req, res));
router.post('/:id/leads', (req, res) => campaignsController.addLeadsToCampaign(req, res));
router.put('/:id', (req, res) => campaignsController.updateCampaign(req, res));
router.post('/:id/start', (req, res) => campaignsController.startCampaign(req, res));
router.post('/:id/pause', (req, res) => campaignsController.pauseCampaign(req, res));
router.delete('/:id', (req, res) => campaignsController.deleteCampaign(req, res));

export default router;
