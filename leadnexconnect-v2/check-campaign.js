const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://leadnex_user:1234567@localhost:5432/leadnexconnect'
});

async function checkCampaign() {
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT 
        id, name, status, schedule_type, start_date, end_date, 
        leads_target, leads_generated, campaign_type, is_recurring,
        next_run_at, last_run_at, schedule_time, created_at
      FROM campaigns 
      WHERE id = '1c9489f5-cfc3-44a2-b0c5-4a27e0fd042e'
    `);
    
    if (result.rows.length === 0) {
      console.log('Campaign not found!');
    } else {
      console.log('\n=== CAMPAIGN DETAILS ===');
      console.log(JSON.stringify(result.rows[0], null, 2));
      
      // Check for scheduled emails
      const emailsResult = await client.query(`
        SELECT COUNT(*) as count, status
        FROM scheduled_emails
        WHERE campaign_id = '1c9489f5-cfc3-44a2-b0c5-4a27e0fd042e'
        GROUP BY status
      `);
      
      console.log('\n=== SCHEDULED EMAILS ===');
      console.log(emailsResult.rows);
      
      // Check for generated leads
      const leadsResult = await client.query(`
        SELECT COUNT(*) as count
        FROM campaign_leads
        WHERE campaign_id = '1c9489f5-cfc3-44a2-b0c5-4a27e0fd042e'
      `);
      
      console.log('\n=== CAMPAIGN LEADS ===');
      console.log(`Total leads: ${leadsResult.rows[0].count}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkCampaign();
