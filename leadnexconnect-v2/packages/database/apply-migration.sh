#!/bin/bash
# Auto-respond to drizzle-kit push prompts

# First prompt: select create column (default, just press enter)
# Second prompt: select create column for automated_campaign_runs (press enter)
# Third prompt: confirm data loss (type 'y')

{
  sleep 1
  echo ""  # Select "+ user_id create column" for lead_batches
  sleep 1
  echo ""  # Select "+ user_id create column" for automated_campaign_runs
  sleep 1
  echo "y" # Confirm data loss
} | npm run db:push
