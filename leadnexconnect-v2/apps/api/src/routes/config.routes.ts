import { Router } from 'express';
import { configController } from '../controllers/config.controller';

const router = Router();

// =========================
// API Configuration Routes
// =========================

// Get all API configurations (masked)
router.get('/apis', configController.getAllApiConfigs.bind(configController));

// Get specific API configuration (masked)
router.get('/apis/:apiSource', configController.getApiConfig.bind(configController));

// Get unmasked API configuration (for editing)
router.get('/apis/:apiSource/unmasked', configController.getUnmaskedApiConfig.bind(configController));

// Create or update API configuration
router.post('/apis', configController.upsertApiConfig.bind(configController));

// Delete API configuration
router.delete('/apis/:apiSource', configController.deleteApiConfig.bind(configController));

// ==========================
// SMTP Configuration Routes
// ==========================

// Get all SMTP configurations (masked)
router.get('/smtp', configController.getAllSmtpConfigs.bind(configController));

// Get specific SMTP configuration (masked)
router.get('/smtp/:id', configController.getSmtpConfig.bind(configController));

// Get unmasked SMTP configuration (for editing)
router.get('/smtp/:id/unmasked', configController.getUnmaskedSmtpConfig.bind(configController));

// Create SMTP configuration
router.post('/smtp', configController.createSmtpConfig.bind(configController));

// Update SMTP configuration
router.put('/smtp/:id', configController.updateSmtpConfig.bind(configController));

// Delete SMTP configuration
router.delete('/smtp/:id', configController.deleteSmtpConfig.bind(configController));

// Test SMTP connection
router.post('/smtp/test', configController.testSmtpConnection.bind(configController));

export default router;
