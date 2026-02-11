import { db } from './src/index';

async function checkColumns() {
  try {
    const result = await db.execute(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND column_name = 'user_id'
      ORDER BY table_name
    `);
    
    console.log('Tables with user_id column:');
    console.log('============================');
    console.log('Result:', result);
    if (result && Array.isArray(result)) {
      result.forEach((row: any) => {
        console.log(`  ✓ ${row.table_name}`);
      });
      console.log(`\nTotal: ${result.length} tables`);
    } else {
      console.log('No rows returned or unexpected format');
    }
    
    // Check users table exists
    const usersCheck = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `);
    console.log(`\nusers table exists:`, usersCheck);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkColumns();
