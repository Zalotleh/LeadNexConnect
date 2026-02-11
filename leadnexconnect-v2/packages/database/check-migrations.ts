import { db } from './src/index';

async function checkMigrations() {
  try {
    // Check if migrations table exists
    const tableExists = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '__drizzle_migrations'
      )
    `);
    
    console.log(`Migrations table exists: ${tableExists[0].exists}`);
    
    if (tableExists[0].exists) {
      const migrations = await db.execute(`
        SELECT * FROM __drizzle_migrations 
        ORDER BY created_at DESC
      `);
      
      console.log('\nApplied migrations:');
      console.log('===================');
      migrations.forEach((m: any) => {
        console.log(`${m.hash} - ${m.created_at}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkMigrations();
