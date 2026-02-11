import { sql } from 'drizzle-orm';
import { db } from './src/index';

async function fullCheck() {
  try {
    // List all tables
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('All tables in database:');
    console.log('=======================');
    for (const table of tables) {
      const cols = await db.execute(sql.raw(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${table.table_name}' 
        AND column_name = 'user_id'
      `));
      const hasUserId = cols.length > 0 ? '✓' : '✗';
      console.log(`${hasUserId} ${table.table_name}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fullCheck();
