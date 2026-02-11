import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../.env' });

// User1 ID (the account that will own all existing data)
const USER1_ID = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

async function migrateExistingData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  console.log('🔄 Starting data migration...');
  console.log(`📌 Assigning all existing data to user1 (${USER1_ID})`);
  console.log('⚠️  This ensures NO data is lost during migration\n');

  try {
    // Begin transaction
    await db.execute(sql`BEGIN`);

    // Define all tables that need data migration
    const tables = [
      'leads',
      'campaigns',
      'workflows',
      'workflow_steps',
      'email_templates',
      'custom_variables',
      'api_config',
      'smtp_config',
      'scraping_jobs',
      'lead_batches',
      'emails',
      'campaign_leads',
      'scheduled_emails',
      'api_performance',
      'lead_source_roi',
      'api_usage',
      'automated_campaign_runs',
    ];

    console.log('📊 Migrating data from tables:');
    console.log('================================');

    // Migrate each table
    for (const table of tables) {
      try {
        const result = await db.execute(
          sql.raw(`UPDATE ${table} SET user_id = '${USER1_ID}' WHERE user_id IS NULL`)
        );
        
        const rowCount = (result as any).rowCount || 0;
        console.log(`  ✅ ${table.padEnd(25)} ${rowCount} records assigned`);
      } catch (error: any) {
        console.error(`  ❌ ${table.padEnd(25)} ERROR: ${error.message}`);
        throw error;
      }
    }

    // Verify migration
    console.log('\n📈 Verification Report:');
    console.log('================================');
    
    for (const table of tables) {
      try {
        const countResult = await db.execute(
          sql.raw(`SELECT COUNT(*) as count FROM ${table} WHERE user_id = '${USER1_ID}'`)
        );
        const count = (countResult.rows[0] as any).count || 0;
        console.log(`  ${table.padEnd(25)} ${count} records owned by user1`);
      } catch (error: any) {
        // Table might not exist yet or have no data
        console.log(`  ${table.padEnd(25)} 0 records (table empty or not exists)`);
      }
    }

    // Check for any remaining NULL user_id values
    console.log('\n🔍 Checking for unmigrated data:');
    console.log('================================');
    
    let hasUnmigrated = false;
    for (const table of tables) {
      try {
        const nullResult = await db.execute(
          sql.raw(`SELECT COUNT(*) as count FROM ${table} WHERE user_id IS NULL`)
        );
        const nullCount = (nullResult.rows[0] as any).count || 0;
        if (nullCount > 0) {
          console.warn(`  ⚠️  ${table.padEnd(25)} ${nullCount} records with NULL user_id`);
          hasUnmigrated = true;
        }
      } catch (error) {
        // Ignore errors for tables that don't exist
      }
    }

    if (!hasUnmigrated) {
      console.log('  ✅ No unmigrated data found. All records have user_id!');
    }

    // Commit transaction
    await db.execute(sql`COMMIT`);
    
    console.log('\n✅ Data migration completed successfully!');
    console.log('📌 All existing data is now owned by user1@leadnex.com');
    console.log(`   User ID: ${USER1_ID}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Login as user1@leadnex.com to verify data access');
    console.log('   2. Verify data isolation by logging in as user2');
    console.log('   3. Consider changing default passwords\n');

  } catch (error) {
    // Rollback on error
    console.error('\n💥 Migration failed! Rolling back...');
    try {
      await db.execute(sql`ROLLBACK`);
      console.log('✅ Rollback successful. No changes were made.');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError);
    }
    
    console.error('\n❌ Migration error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
migrateExistingData()
  .then(() => {
    console.log('🎉 Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
