-- Fix leads without userId by setting it from their batch's userId
UPDATE leads
SET user_id = lead_batches.user_id
FROM lead_batches
WHERE leads.batch_id = lead_batches.id
  AND leads.user_id IS NULL;
