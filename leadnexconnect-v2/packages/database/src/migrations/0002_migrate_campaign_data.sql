-- Data Migration: Update Existing Campaigns to New Schema
-- Date: 2025-12-11
-- Description: Migrates existing campaign data to use PROMPT 1 schema

-- =====================================================
-- PART 1: Set campaignType for existing campaigns
-- =====================================================

-- Set all existing campaigns to 'outreach' type (most common type)
UPDATE campaigns
SET campaign_type = 'outreach'
WHERE campaign_type IS NULL OR campaign_type = 'automated';

-- =====================================================
-- PART 2: Migrate status values
-- =====================================================

-- Convert 'active' to 'running'
UPDATE campaigns
SET status = 'running'
WHERE status = 'active';

-- Campaigns in 'scheduled' become 'draft' (will be re-scheduled properly)
UPDATE campaigns
SET status = 'draft'
WHERE status = 'scheduled';

-- =====================================================
-- PART 3: Migrate batchId to batchIds array
-- =====================================================

-- For campaigns with a batchId but no batchIds, convert to array
UPDATE campaigns
SET batch_ids = jsonb_build_array(batch_id::text)
WHERE batch_id IS NOT NULL AND batch_ids IS NULL;

-- =====================================================
-- PART 4: Copy old metrics to new metric fields
-- =====================================================

-- Copy emails_sent → emails_sent_count
UPDATE campaigns
SET emails_sent_count = emails_sent
WHERE emails_sent IS NOT NULL AND (emails_sent_count IS NULL OR emails_sent_count = 0);

-- Copy leads_generated → total_leads_targeted
UPDATE campaigns
SET total_leads_targeted = leads_generated
WHERE leads_generated IS NOT NULL AND (total_leads_targeted IS NULL OR total_leads_targeted = 0);

-- =====================================================
-- PART 5: Set timestamp fields
-- =====================================================

-- Set scheduledStartAt from startDate if exists
UPDATE campaigns
SET scheduled_start_at = start_date
WHERE start_date IS NOT NULL AND scheduled_start_at IS NULL;

-- Set completedAt for campaigns marked as completed
UPDATE campaigns
SET completed_at = updated_at
WHERE status = 'completed' AND completed_at IS NULL AND updated_at IS NOT NULL;

-- Set actualStartedAt for running campaigns
UPDATE campaigns
SET actual_started_at = COALESCE(start_date, created_at)
WHERE status = 'running' AND actual_started_at IS NULL;

-- =====================================================
-- VERIFICATION QUERIES (run these manually to verify)
-- =====================================================

-- Uncomment to run verification queries:

-- SELECT campaign_type, COUNT(*) FROM campaigns GROUP BY campaign_type;
-- SELECT status, COUNT(*) FROM campaigns GROUP BY status;
-- SELECT COUNT(*) FROM campaigns WHERE batch_id IS NOT NULL AND batch_ids IS NULL;
-- SELECT COUNT(*) FROM campaigns WHERE emails_sent_count > 0;
-- SELECT COUNT(*) FROM campaigns WHERE total_leads_targeted > 0;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. This script is SAFE to run multiple times (idempotent)
-- 2. No data is deleted, only updated
-- 3. Old fields are preserved for backward compatibility
-- 4. scheduledEmails table remains empty until campaigns are (re)started
