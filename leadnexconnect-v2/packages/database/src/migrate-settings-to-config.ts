import { db } from './index';
import { settings, apiConfig, smtpConfig } from './schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Migration script to transfer data from the old settings table
 * to the new api_config and smtp_config tables
 */

async function migrateSettings() {
  console.log('🔄 Starting settings migration...');

  try {
    // Fetch all relevant settings
    const allSettings = await db.select().from(settings);
    const settingsMap = new Map(allSettings.map(s => [s.key, s.value]));

    console.log(`📊 Found ${allSettings.length} settings in database`);

    // ========================================
    // Migrate API Configurations
    // ========================================
    console.log('\n📡 Migrating API configurations...');

    const apiMappings = [
      {
        source: 'apollo',
        keyName: 'apolloApiKey',
        label: 'Apollo.io',
        docUrl: 'https://knowledge.apolloio.com/hc/en-us/articles/4415839446413-How-to-find-your-API-key',
      },
      {
        source: 'hunter',
        keyName: 'hunterApiKey',
        label: 'Hunter.io',
        docUrl: 'https://hunter.io/api-keys',
      },
      {
        source: 'google_places',
        keyName: 'googlePlacesApiKey',
        label: 'Google Places API',
        docUrl: 'https://developers.google.com/maps/documentation/places/web-service/get-api-key',
      },
      {
        source: 'peopledatalabs',
        keyName: 'peopleDataLabsApiKey',
        label: 'PeopleDataLabs',
        docUrl: 'https://docs.peopledatalabs.com/docs/authentication',
      },
      {
        source: 'google_custom_search',
        keyName: 'googleCustomSearchApiKey',
        label: 'Google Custom Search API',
        docUrl: 'https://developers.google.com/custom-search/v1/overview',
      },
    ];

    let apiMigrated = 0;
    for (const mapping of apiMappings) {
      const apiKey = settingsMap.get(mapping.keyName);
      
      // Special handling for Google Custom Search - also get engine ID
      let apiSecret = undefined;
      if (mapping.source === 'google_custom_search') {
        apiSecret = settingsMap.get('googleCustomSearchEngineId') as string;
      }
      
      if (apiKey && typeof apiKey === 'string' && apiKey.trim() !== '') {
        // Check if already exists
        const existing = await db
          .select()
          .from(apiConfig)
          .where(eq(apiConfig.apiSource, mapping.source))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(apiConfig).values({
            id: uuidv4(),
            apiSource: mapping.source,
            apiKey: apiKey,
            apiSecret: apiSecret,
            isActive: true,
            documentationUrl: mapping.docUrl,
            setupNotes: `Migrated from settings table on ${new Date().toISOString()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          console.log(`  ✅ Migrated ${mapping.label} API key`);
          apiMigrated++;
        } else {
          console.log(`  ⏭️  ${mapping.label} already exists, skipping`);
        }
      } else {
        console.log(`  ⚠️  No API key found for ${mapping.label}`);
      }
    }

    console.log(`\n✨ Migrated ${apiMigrated} API configurations`);

    // ========================================
    // Migrate SMTP Configuration
    // ========================================
    console.log('\n📧 Migrating SMTP configurations...');

    const smtpProvider = settingsMap.get('smtpProvider') || 'custom';
    const smtpHost = settingsMap.get('smtpHost');
    const smtpPort = settingsMap.get('smtpPort');
    const smtpUser = settingsMap.get('smtpUser');
    const smtpPass = settingsMap.get('smtpPass');
    const smtpSecure = settingsMap.get('smtpSecure');
    const fromEmail = settingsMap.get('fromEmail');
    const fromName = settingsMap.get('fromName');
    const emailsPerHour = settingsMap.get('emailsPerHour');
    const dailyEmailLimit = settingsMap.get('dailyEmailLimit');

    if (smtpHost && smtpPort && fromEmail) {
      // Check if already exists
      const existingSmtp = await db
        .select()
        .from(smtpConfig)
        .where(eq(smtpConfig.host, smtpHost as string))
        .limit(1);

      if (existingSmtp.length === 0) {
        await db.insert(smtpConfig).values({
          id: uuidv4(),
          provider: smtpProvider as string,
          providerName: typeof smtpProvider === 'string' ? smtpProvider.toUpperCase() : 'Custom SMTP',
          host: smtpHost as string,
          port: typeof smtpPort === 'number' ? smtpPort : parseInt(smtpPort as string, 10),
          secure: smtpSecure === 'true' || smtpSecure === true,
          username: smtpUser as string || '',
          password: smtpPass as string || '',
          fromEmail: fromEmail as string,
          fromName: fromName as string || '',
          hourlyLimit: typeof emailsPerHour === 'number' ? emailsPerHour : parseInt(emailsPerHour as string || '50', 10),
          dailyLimit: typeof dailyEmailLimit === 'number' ? dailyEmailLimit : parseInt(dailyEmailLimit as string || '500', 10),
          isActive: true,
          isPrimary: true,
          priority: 1,
          setupNotes: `Migrated from settings table on ${new Date().toISOString()}`,
          emailsSentToday: 0,
          emailsSentThisHour: 0,
          lastResetAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log('  ✅ Migrated SMTP configuration');
        console.log(`     Host: ${smtpHost}`);
        console.log(`     From: ${fromName} <${fromEmail}>`);
      } else {
        console.log('  ⏭️  SMTP configuration already exists, skipping');
      }
    } else {
      console.log('  ⚠️  No complete SMTP configuration found in settings');
      console.log(`     Missing: ${!smtpHost ? 'host ' : ''}${!smtpPort ? 'port ' : ''}${!fromEmail ? 'fromEmail' : ''}`);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Check the API Configuration tab to verify your API keys');
    console.log('   2. Check the SMTP Configuration tab to verify your email settings');
    console.log('   3. The old settings in the General tab are still there for reference');
    console.log('   4. You can now manage multiple SMTP providers and API configs!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateSettings()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
