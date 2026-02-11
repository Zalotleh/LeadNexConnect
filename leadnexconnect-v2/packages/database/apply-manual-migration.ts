import { sql } from 'drizzle-orm';
import { db } from './src/index';

async function addUserIdColumns() {
  try {
    console.log('🔧 Adding user_id columns to existing tables...\n');
    
    // Add user_id columns one by one
    const tables = [
      'leads', 'campaigns', 'emails', 'scheduled_emails', 'automated_campaign_runs',
      'campaign_leads', 'email_templates', 'scraping_jobs', 'api_usage', 'settings',
      'api_performance', 'lead_source_roi', 'lead_batches', 'workflows', 'workflow_steps',
      'custom_variables', 'api_config', 'smtp_config'
    ];
    
    for (const table of tables) {
      try {
        await db.execute(sql.raw(`
          ALTER TABLE ${table} 
          ADD COLUMN IF NOT EXISTS user_id uuid 
          REFERENCES users(id) ON DELETE CASCADE
        `));
        console.log(`  ✓ ${table}`);
      } catch (err: any) {
        if (err.code === '42701') { // column already exists
          console.log(`  ≈ ${table} (already has user_id)`);
        } else {
          throw err;
        }
      }
    }
    
    console.log('\n✅ All user_id columns added successfully!\n');
    
    // Verify
    const result = await db.execute(sql`
      SELECT table_name
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND column_name = 'user_id'
      ORDER BY table_name
    `);
    
    console.log(`📊 Total tables with user_id: ${result.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addUserIdColumns();
