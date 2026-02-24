import { Router } from 'express';
import { getSenderProfile, upsertSenderProfile } from '../controllers/sender-profile.controller';

const router = Router();

// GET  /api/sender-profile  — current user's sender profile
router.get('/', getSenderProfile);

// PUT  /api/sender-profile  — create or update sender profile
router.put('/', upsertSenderProfile);

export default router;
