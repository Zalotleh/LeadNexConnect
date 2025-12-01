import { Router } from 'express';
import { testingController } from '../controllers/testing.controller';

const router = Router();

// Generate test leads for testing
router.post('/generate-test-leads', (req, res) => testingController.generateTestLeads(req, res));

// Preview email without sending
router.post('/preview-email', (req, res) => testingController.previewEmail(req, res));

// Dry run a workflow (simulate entire sequence)
router.post('/dry-run-workflow', (req, res) => testingController.dryRunWorkflow(req, res));

// Send test email to a specific address
router.post('/send-test-email', (req, res) => testingController.sendTestEmail(req, res));

// Get email schedule for a campaign
router.get('/email-schedule/:campaignId', (req, res) => testingController.getEmailSchedule(req, res));

// Cleanup all test data
router.delete('/cleanup-test-data', (req, res) => testingController.cleanupTestData(req, res));

export default router;
