import { Router } from 'express';
import {
  getCustomVariables,
  getCustomVariable,
  createCustomVariable,
  updateCustomVariable,
  deleteCustomVariable,
  incrementUsageCount,
} from '../controllers/custom-variables.controller';

const router = Router();

// Get all custom variables
router.get('/', getCustomVariables);

// Get single custom variable
router.get('/:id', getCustomVariable);

// Create new custom variable
router.post('/', createCustomVariable);

// Update custom variable
router.put('/:id', updateCustomVariable);

// Delete custom variable
router.delete('/:id', deleteCustomVariable);

// Increment usage count
router.post('/:id/use', incrementUsageCount);

export default router;
