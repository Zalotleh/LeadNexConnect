import { Router } from 'express';
import { leadsController } from '../controllers/leads.controller';

const router = Router();

router.get('/', (req, res) => leadsController.getLeads(req, res));
router.get('/batches', (req, res) => leadsController.getBatches(req, res));
router.get('/batches/:id/analytics', (req, res) => leadsController.getBatchAnalytics(req, res));
router.get('/export', (req, res) => leadsController.exportLeads(req, res));
router.get('/:id', (req, res) => leadsController.getLead(req, res));
router.post('/', (req, res) => leadsController.createLead(req, res));
router.post('/generate', (req, res) => leadsController.generateLeads(req, res));
router.post('/import', (req, res) => leadsController.importLinkedIn(req, res));
router.put('/:id', (req, res) => leadsController.updateLead(req, res));
router.delete('/:id', (req, res) => leadsController.deleteLead(req, res));

export default router;
