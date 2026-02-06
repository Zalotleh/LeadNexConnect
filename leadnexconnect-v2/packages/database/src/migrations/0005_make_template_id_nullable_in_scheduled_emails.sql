-- Migration: Make template_id nullable in scheduled_emails table
-- This allows workflow-based emails to be scheduled without requiring a template_id
-- Workflow emails use workflow_id + workflow_step_number instead

ALTER TABLE scheduled_emails 
ALTER COLUMN template_id DROP NOT NULL;

-- Add a check constraint to ensure either template_id OR workflow_id is present
ALTER TABLE scheduled_emails
ADD CONSTRAINT scheduled_emails_template_or_workflow CHECK (
  template_id IS NOT NULL OR workflow_id IS NOT NULL
);
