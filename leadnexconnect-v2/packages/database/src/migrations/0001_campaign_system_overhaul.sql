-- Migration: Campaign System Overhaul (PROMPT 1 - Phase 1)
-- Date: 2025-12-11
-- Description: Adds new fields to campaigns table and creates scheduledEmails table

-- =====================================================
-- PART 0: Update campaign_status enum with new values
-- =====================================================

-- Add new status values to the enum
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'scheduled';
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'running';
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'failed';

-- =====================================================
-- PART 1: Update campaigns table with new fields
-- =====================================================

-- NEW: Campaign Type Classification
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS campaign_type VARCHAR(50) NOT NULL DEFAULT 'outreach';

-- NEW: Lead Generation Config
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS lead_sources JSONB,
ADD COLUMN IF NOT EXISTS max_results_per_run INTEGER;

-- NEW: Outreach Config
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS batch_ids JSONB,
ADD COLUMN IF NOT EXISTS use_workflow BOOLEAN DEFAULT false;

-- NEW: Automation Config
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_interval VARCHAR(50),
ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS outreach_delay_days INTEGER DEFAULT 0;

-- NEW: Enhanced Status Management
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS start_type VARCHAR(20) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS scheduled_start_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS actual_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- NEW: Enhanced Metrics
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS total_leads_targeted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS emails_sent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS emails_scheduled_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS emails_failed_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_workflow_step INTEGER DEFAULT 1;

-- =====================================================
-- PART 2: Create scheduledEmails table
-- =====================================================

CREATE TABLE IF NOT EXISTS scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES email_templates(id),
  workflow_id UUID REFERENCES workflows(id),
  workflow_step_number INTEGER DEFAULT 1,

  -- Scheduling
  scheduled_for TIMESTAMP NOT NULL,

  -- Execution
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Values: 'pending' | 'sent' | 'failed' | 'skipped' | 'cancelled'
  sent_at TIMESTAMP,
  failed_at TIMESTAMP,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Result tracking (links to emails table after sent)
  email_id UUID REFERENCES emails(id),

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_campaign_id ON scheduled_emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_lead_id ON scheduled_emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON scheduled_emails(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_for ON scheduled_emails(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_campaign_status ON scheduled_emails(campaign_id, status);

-- =====================================================
-- PART 3: Update lead_batches table
-- =====================================================

-- Add campaign reference fields to lead_batches
ALTER TABLE lead_batches
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id),
ADD COLUMN IF NOT EXISTS campaign_name VARCHAR(255);

-- =====================================================
-- PART 4: Update workflow_steps table
-- =====================================================

-- Add email template reference to workflow_steps
ALTER TABLE workflow_steps
ADD COLUMN IF NOT EXISTS email_template_id UUID REFERENCES email_templates(id);

-- =====================================================
-- PART 5: Create function to auto-update updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for scheduled_emails
DROP TRIGGER IF EXISTS update_scheduled_emails_updated_at ON scheduled_emails;
CREATE TRIGGER update_scheduled_emails_updated_at
    BEFORE UPDATE ON scheduled_emails
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. All old fields in campaigns table are retained for backward compatibility
-- 2. The scheduledEmails table is the KEY to fixing the bug where campaigns
--    complete immediately instead of waiting for all emails to be sent
-- 3. After this migration, you need to run the data migration script to
--    convert existing campaigns to the new schema
-- 4. Indexes added for performance on common queries
