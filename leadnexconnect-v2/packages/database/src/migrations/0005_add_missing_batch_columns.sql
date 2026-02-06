-- Add missing columns to lead_batches table

-- Add updated_at column if it doesn't exist
ALTER TABLE lead_batches 
ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();

-- Add campaign_history column if it doesn't exist
ALTER TABLE lead_batches 
ADD COLUMN IF NOT EXISTS campaign_history jsonb;

-- Rename campaign_id to active_campaign_id if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lead_batches' AND column_name = 'campaign_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lead_batches' AND column_name = 'active_campaign_id'
  ) THEN
    ALTER TABLE lead_batches RENAME COLUMN campaign_id TO active_campaign_id;
  END IF;
END $$;

-- If active_campaign_id doesn't exist at all, add it
ALTER TABLE lead_batches 
ADD COLUMN IF NOT EXISTS active_campaign_id uuid REFERENCES campaigns(id);

-- Drop the old campaign_id column if both exist (shouldn't happen, but just in case)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lead_batches' AND column_name = 'campaign_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lead_batches' AND column_name = 'active_campaign_id'
  ) THEN
    ALTER TABLE lead_batches DROP COLUMN campaign_id;
  END IF;
END $$;
