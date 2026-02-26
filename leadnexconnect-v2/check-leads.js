const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://leadnex_user:1234567@localhost:5432/leadnexconnect'
});

async function checkLeads() {
  try {
    await client.connect();
    
    // Check if leads have userId
    const result = await client.query(`
      SELECT id, company_name, user_id, batch_id, created_at
      FROM leads
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('\n=== RECENT LEADS ===');
    console.log(`Total leads found: ${result.rows.length}`);
    result.rows.forEach(lead => {
      console.log(`\nLead: ${lead.company_name}`);
      console.log(`  ID: ${lead.id}`);
      console.log(`  User ID: ${lead.user_id || 'NULL - THIS IS THE PROBLEM!'}`);
      console.log(`  Batch ID: ${lead.batch_id || 'NULL'}`);
      console.log(`  Created: ${lead.created_at}`);
    });
    
    // Check leads without userId
    const nullUserResult = await client.query(`
      SELECT COUNT(*) as count
      FROM leads
      WHERE user_id IS NULL
    `);
    
    console.log(`\n=== LEADS WITHOUT USER_ID ===`);
    console.log(`Count: ${nullUserResult.rows[0].count}`);
    
    // Check batches
    const batchResult = await client.query(`
      SELECT id, name, user_id, total_leads, successful_imports, created_at
      FROM lead_batches
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log('\n=== RECENT BATCHES ===');
    batchResult.rows.forEach(batch => {
      console.log(`\nBatch: ${batch.name}`);
      console.log(`  ID: ${batch.id}`);
      console.log(`  User ID: ${batch.user_id}`);
      console.log(`  Total Leads: ${batch.total_leads}`);
      console.log(`  Successful: ${batch.successful_imports}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkLeads();
