-- Migration: Add missing updated_at column to workflow_steps
-- Date: 2025-12-11
-- Description: Adds updated_at column that was missing from workflow_steps table

ALTER TABLE workflow_steps
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add comment
COMMENT ON COLUMN workflow_steps.updated_at IS 'Timestamp when the workflow step was last updated';
