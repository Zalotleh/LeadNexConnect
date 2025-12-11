/**
 * Data Migration Script: Migrate Existing Campaigns to New Schema
 *
 * Purpose: Convert existing campaigns to use the new PROMPT 1 schema
 *
 * What this script does:
 * 1. Sets campaignType = 'outreach' for all existing campaigns (default type)
 * 2. Converts old 'active' status to new 'running' status
 * 3. Migrates old batchId to new batchIds array format
 * 4. Copies old metrics to new metric fields
 * 5. Does NOT create scheduledEmails (those are created when campaign starts)
 *
 * IMPORTANT: This script is SAFE to run multiple times (idempotent)
 */

import { db, campaigns } from '@leadnex/database';
import { eq, isNull, or } from 'drizzle-orm';

async function migrateExistingCampaigns() {
  console.log('🚀 Starting campaign data migration...\n');

  try {
    // Get all campaigns that need migration
    // (campaigns where campaignType is null or still has old default)
    const existingCampaigns = await db
      .select()
      .from(campaigns)
      .where(
        or(
          isNull(campaigns.campaignType),
          eq(campaigns.campaignType, 'automated') // Old default
        )
      );

    console.log(`📊 Found ${existingCampaigns.length} campaigns to migrate\n`);

    if (existingCampaigns.length === 0) {
      console.log('✅ No campaigns need migration. All done!');
      return;
    }

    let migratedCount = 0;
    let errorCount = 0;

    // Process each campaign
    for (const campaign of existingCampaigns) {
      try {
        console.log(`\n📝 Migrating campaign: ${campaign.name} (${campaign.id})`);

        // Prepare update data
        const updateData: any = {};

        // 1. Set campaign type to 'outreach' (most campaigns are outreach)
        if (!campaign.campaignType || campaign.campaignType === 'automated') {
          updateData.campaignType = 'outreach';
          console.log('   ✓ Set campaignType = outreach');
        }

        // 2. Migrate status: 'active' → 'running', 'scheduled' → 'draft'
        if (campaign.status === 'active') {
          updateData.status = 'running';
          console.log('   ✓ Converted status: active → running');
        }

        // 3. Migrate batchId to batchIds array
        if (campaign.batchId && !campaign.batchIds) {
          updateData.batchIds = [campaign.batchId];
          console.log(`   ✓ Migrated batchId to batchIds array`);
        }

        // 4. Copy old metrics to new metric fields
        if (campaign.emailsSent && !campaign.emailsSentCount) {
          updateData.emailsSentCount = campaign.emailsSent;
          console.log(`   ✓ Copied emailsSent (${campaign.emailsSent}) → emailsSentCount`);
        }

        if (campaign.leadsGenerated && !campaign.totalLeadsTargeted) {
          updateData.totalLeadsTargeted = campaign.leadsGenerated;
          console.log(`   ✓ Copied leadsGenerated (${campaign.leadsGenerated}) → totalLeadsTargeted`);
        }

        // 5. Set timestamps based on old data
        if (campaign.startDate && !campaign.scheduledStartAt) {
          updateData.scheduledStartAt = campaign.startDate;
          console.log('   ✓ Set scheduledStartAt from startDate');
        }

        if (campaign.status === 'completed' && !campaign.completedAt) {
          updateData.completedAt = new Date();
          console.log('   ✓ Set completedAt timestamp');
        }

        // Perform update if there's any data to update
        if (Object.keys(updateData).length > 0) {
          await db
            .update(campaigns)
            .set(updateData)
            .where(eq(campaigns.id, campaign.id));

          migratedCount++;
          console.log(`   ✅ Campaign migrated successfully`);
        } else {
          console.log(`   ℹ️  No changes needed for this campaign`);
        }

      } catch (error: any) {
        errorCount++;
        console.error(`   ❌ Error migrating campaign ${campaign.id}:`, error.message);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully migrated: ${migratedCount} campaigns`);
    console.log(`❌ Errors: ${errorCount} campaigns`);
    console.log(`📝 Total processed: ${existingCampaigns.length} campaigns`);
    console.log('='.repeat(60) + '\n');

    if (errorCount > 0) {
      console.log('⚠️  Some campaigns failed to migrate. Please check errors above.');
      process.exit(1);
    } else {
      console.log('🎉 All campaigns migrated successfully!');
      console.log('\n📌 Next Steps:');
      console.log('   1. Verify campaigns in database');
      console.log('   2. Test starting a campaign to ensure scheduledEmails are created');
      console.log('   3. Proceed with Phase 3 (Service Layer implementation)\n');
    }

  } catch (error: any) {
    console.error('\n❌ Fatal error during migration:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the migration
migrateExistingCampaigns()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
