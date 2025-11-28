import { db, settings } from '@leadnex/database';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

interface SettingsData {
  // AI API Keys
  anthropicApiKey?: string;
  
  // Lead Generation APIs
  apolloApiKey?: string;
  hunterApiKey?: string;
  peopleDataLabsApiKey?: string;
  googlePlacesApiKey?: string;
  googleCustomSearchApiKey?: string;
  googleCustomSearchEngineId?: string;
  
  // SMTP Configuration
  smtpProvider?: string;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: string;
  fromName?: string;
  fromEmail?: string;
  
  // Email Settings
  emailsPerHour?: number;
  dailyEmailLimit?: number;
}

export class SettingsService {
  private cache: Map<string, any> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Get a setting value by key

   * Priority: 1. Database, 2. .env file, 3. default value
   */
  async get(key: string, defaultValue?: any): Promise<any> {
    try {
      // Check cache first

      const cacheKey = `setting:${key}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (cached.expiry > Date.now()) {
          return cached.value;
        }
      }

      // Try database first
      const result = await db
        .select()
        .from(settings)
        .where(eq(settings.key, key))
        .limit(1);

      if (result.length > 0 && result[0].value) {
        const value = result[0].value;
        this.cacheValue(cacheKey, value);
        return value;
      }

      // Fall back to environment variable
      const envValue = this.getEnvValue(key);
      if (envValue !== undefined) {
        return envValue;
      }


      // Return default value
      return defaultValue;
    } catch (error: any) {
      logger.error('[SettingsService] Error getting setting', {
        key,
        error: error.message,
      });
      
      // Fall back to env on error
      const envValue = this.getEnvValue(key);
      return envValue !== undefined ? envValue : defaultValue;
    }
  }

  /**
   * Get all settings
   */
  async getAll(): Promise<SettingsData> {
    try {
      const allSettings = await db.select().from(settings);
      
      const settingsData: SettingsData = {
        // AI Keys
        anthropicApiKey: await this.get('anthropicApiKey', process.env.ANTHROPIC_API_KEY),
        
        // Lead Generation Keys
        apolloApiKey: await this.get('apolloApiKey', process.env.APOLLO_API_KEY),
        hunterApiKey: await this.get('hunterApiKey', process.env.HUNTER_API_KEY),
        peopleDataLabsApiKey: await this.get('peopleDataLabsApiKey', process.env.PEOPLEDATALABS_API_KEY),
        googlePlacesApiKey: await this.get('googlePlacesApiKey', process.env.GOOGLE_PLACES_API_KEY),
        googleCustomSearchApiKey: await this.get('googleCustomSearchApiKey', process.env.GOOGLE_CUSTOM_SEARCH_API_KEY),
        googleCustomSearchEngineId: await this.get('googleCustomSearchEngineId', process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID),
        
        // SMTP Config
        smtpProvider: await this.get('smtpProvider', process.env.SMTP_PROVIDER || 'smtp2go'),
        smtpHost: await this.get('smtpHost', process.env.SMTP_HOST),
        smtpPort: await this.get('smtpPort', process.env.SMTP_PORT),
        smtpUser: await this.get('smtpUser', process.env.SMTP_USER),
        smtpPass: await this.get('smtpPass', process.env.SMTP_PASS),
        smtpSecure: await this.get('smtpSecure', process.env.SMTP_SECURE),
        fromName: await this.get('fromName', process.env.FROM_NAME),
        fromEmail: await this.get('fromEmail', process.env.FROM_EMAIL),
        
        // Email Settings
        emailsPerHour: await this.get('emailsPerHour', 50),
        dailyEmailLimit: await this.get('dailyEmailLimit', 500),
      };

      return settingsData;
    } catch (error: any) {
      logger.error('[SettingsService] Error getting all settings', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Set a setting value
   */
  async set(key: string, value: any): Promise<void> {
    try {
      // Check if setting exists
      const existing = await db
        .select()
        .from(settings)
        .where(eq(settings.key, key))
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await db
          .update(settings)
          .set({ value, updatedAt: new Date() })
          .where(eq(settings.key, key));
      } else {
        // Insert new
        await db.insert(settings).values({
          key,
          value,
        });
      }

      // Clear cache
      this.cache.delete(`setting:${key}`);

      logger.info('[SettingsService] Setting updated', { key });
    } catch (error: any) {
      logger.error('[SettingsService] Error setting value', {
        key,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update multiple settings at once
   */
  async updateMany(settingsData: Partial<SettingsData>): Promise<void> {
    try {
      logger.info('[SettingsService] Updating multiple settings', {
        keys: Object.keys(settingsData),
      });

      // Update each setting
      for (const [key, value] of Object.entries(settingsData)) {
        if (value !== undefined && value !== null && value !== '') {
          await this.set(key, value);
        }
      }

      // Clear all cache
      this.cache.clear();

      logger.info('[SettingsService] All settings updated successfully');
    } catch (error: any) {
      logger.error('[SettingsService] Error updating settings', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get masked version of API keys for display
   */
  async getAllMasked(): Promise<SettingsData> {
    const allSettings = await this.getAll();
    
    return {
      ...allSettings,
      anthropicApiKey: this.maskApiKey(allSettings.anthropicApiKey),
      apolloApiKey: this.maskApiKey(allSettings.apolloApiKey),
      hunterApiKey: this.maskApiKey(allSettings.hunterApiKey),
      peopleDataLabsApiKey: this.maskApiKey(allSettings.peopleDataLabsApiKey),
      googlePlacesApiKey: this.maskApiKey(allSettings.googlePlacesApiKey),
      googleCustomSearchApiKey: this.maskApiKey(allSettings.googleCustomSearchApiKey),
      googleCustomSearchEngineId: this.maskApiKey(allSettings.googleCustomSearchEngineId),
      smtpPass: this.maskApiKey(allSettings.smtpPass),
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('[SettingsService] Cache cleared');
  }

  /**
   * Private helper: Get environment variable value
   */
  private getEnvValue(key: string): any {
    const envMap: Record<string, string | undefined> = {
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      apolloApiKey: process.env.APOLLO_API_KEY,
      hunterApiKey: process.env.HUNTER_API_KEY,
      peopleDataLabsApiKey: process.env.PEOPLEDATALABS_API_KEY,
      googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY,
      googleCustomSearchApiKey: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
      googleCustomSearchEngineId: process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID,
      smtpProvider: process.env.SMTP_PROVIDER,
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT,
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS,
      smtpSecure: process.env.SMTP_SECURE,
      fromName: process.env.FROM_NAME,
      fromEmail: process.env.FROM_EMAIL,
    };

    return envMap[key];
  }

  /**
   * Private helper: Cache a value
   */
  private cacheValue(key: string, value: any): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.cacheTimeout,
    });
  }

  /**
   * Private helper: Mask API key for display
   */
  private maskApiKey(key?: string): string {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  }
}

export const settingsService = new SettingsService();
