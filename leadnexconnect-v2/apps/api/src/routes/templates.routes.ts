import { Router } from 'express';
import { templatesController } from '../controllers/templates.controller';

const router = Router();

// Get all templates
router.get('/', (req, res) => templatesController.getTemplates(req, res));

// Get single template
router.get('/:id', (req, res) => templatesController.getTemplate(req, res));

// Create template
router.post('/', (req, res) => templatesController.createTemplate(req, res));

// Update template
router.put('/:id', (req, res) => templatesController.updateTemplate(req, res));

// Delete template
router.delete('/:id', (req, res) => templatesController.deleteTemplate(req, res));

// Increment usage count
router.post('/:id/use', (req, res) => templatesController.incrementUsageCount(req, res));

export default router;
