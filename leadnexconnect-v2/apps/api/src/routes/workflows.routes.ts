import { Router } from 'express';
import { workflowsController } from '../controllers/workflows.controller';

const router = Router();

// Get all workflows
router.get('/', (req, res) => workflowsController.getWorkflows(req, res));

// Get single workflow
router.get('/:id', (req, res) => workflowsController.getWorkflow(req, res));

// Generate workflow with AI
router.post('/generate', (req, res) => workflowsController.generateWorkflow(req, res));

// Update workflow
router.put('/:id', (req, res) => workflowsController.updateWorkflow(req, res));

// Delete workflow
router.delete('/:id', (req, res) => workflowsController.deleteWorkflow(req, res));

export default router;
