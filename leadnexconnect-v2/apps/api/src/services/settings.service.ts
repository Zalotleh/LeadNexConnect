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
  
  // AWS SES Configuration
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
  
  // Email Settings
  emailsPerHour?: number;
  dailyEmailLimit?: number;

  // Email Signature
  emailSignature?: string;

  // Company Profile (admin-managed)
  company_profile?: Record<string, any>;
}

export class SettingsService {
  private cache: Map<string, any> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Get a setting value by key
   * Priority: 1. User-specific database, 2. Global database, 3. .env file, 4. default value
   */
  async get(key: string, defaultValue?: any, userId?: string): Promise<any> {
    try {
      // Check cache first
      const cacheKey = userId ? `setting:${userId}:${key}` : `setting:${key}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (cached.expiry > Date.now()) {
          return cached.value;
        }
      }

      // Try database first
      let result;
      if (userId) {
        // First try user-specific setting
        const { and, isNull } = await import('drizzle-orm');
        result = await db
          .select()
          .from(settings)
          .where(and(eq(settings.key, key), eq(settings.userId, userId)))
          .limit(1);
        
        // If not found, try global setting (userId = null)
        if (result.length === 0) {
          result = await db
            .select()
            .from(settings)
            .where(and(eq(settings.key, key), isNull(settings.userId)))
            .limit(1);
        }
      } else {
        // No userId provided, get global setting
        const { and, isNull } = await import('drizzle-orm');
        result = await db
          .select()
          .from(settings)
          .where(and(eq(settings.key, key), isNull(settings.userId)))
          .limit(1);
      }

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
        userId,
        error: error.message,
      });
      
      // Fall back to env on error
      const envValue = this.getEnvValue(key);
      return envValue !== undefined ? envValue : defaultValue;
    }
  }

  /**
   * Get all settings for a specific user
   */
  async getAll(userId?: string): Promise<SettingsData> {
    try {
      const settingsData: SettingsData = {
        // AI Keys
        anthropicApiKey: await this.get('anthropicApiKey', process.env.ANTHROPIC_API_KEY, userId),
        
        // Lead Generation Keys
        apolloApiKey: await this.get('apolloApiKey', process.env.APOLLO_API_KEY, userId),
        hunterApiKey: await this.get('hunterApiKey', process.env.HUNTER_API_KEY, userId),
        peopleDataLabsApiKey: await this.get('peopleDataLabsApiKey', process.env.PEOPLEDATALABS_API_KEY, userId),
        googlePlacesApiKey: await this.get('googlePlacesApiKey', process.env.GOOGLE_PLACES_API_KEY, userId),
        googleCustomSearchApiKey: await this.get('googleCustomSearchApiKey', process.env.GOOGLE_CUSTOM_SEARCH_API_KEY, userId),
        googleCustomSearchEngineId: await this.get('googleCustomSearchEngineId', process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID, userId),
        
        // SMTP Config
        smtpProvider: await this.get('smtpProvider', process.env.SMTP_PROVIDER || 'smtp2go', userId),
        smtpHost: await this.get('smtpHost', process.env.SMTP_HOST, userId),
        smtpPort: await this.get('smtpPort', process.env.SMTP_PORT, userId),
        smtpUser: await this.get('smtpUser', process.env.SMTP_USER, userId),
        smtpPass: await this.get('smtpPass', process.env.SMTP_PASS, userId),
        smtpSecure: await this.get('smtpSecure', process.env.SMTP_SECURE, userId),
        fromName: await this.get('fromName', process.env.FROM_NAME, userId),
        fromEmail: await this.get('fromEmail', process.env.FROM_EMAIL, userId),
        
        // AWS SES Config
        awsAccessKeyId: await this.get('awsAccessKeyId', process.env.AWS_ACCESS_KEY_ID, userId),
        awsSecretAccessKey: await this.get('awsSecretAccessKey', process.env.AWS_SECRET_ACCESS_KEY, userId),
        awsRegion: await this.get('awsRegion', process.env.AWS_REGION || 'us-east-1', userId),
        
        // Email Settings
        emailsPerHour: await this.get('emailsPerHour', 50, userId),
        dailyEmailLimit: await this.get('dailyEmailLimit', 500, userId),

        // Email Signature
        emailSignature: await this.get('emailSignature', '', userId),
      };

      return settingsData;
    } catch (error: any) {
      logger.error('[SettingsService] Error getting all settings', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Set a setting value
   */
  async set(key: string, value: any, userId?: string): Promise<void> {
    try {
      const { and, isNull } = await import('drizzle-orm');
      // Check if setting exists
      const existing = await db
        .select()
        .from(settings)
        .where(
          userId 
            ? and(eq(settings.key, key), eq(settings.userId, userId))
            : and(eq(settings.key, key), isNull(settings.userId))
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await db
          .update(settings)
          .set({ value, updatedAt: new Date() })
          .where(eq(settings.id, existing[0].id));
      } else {
        // Insert new
        await db.insert(settings).values({
          key,
          value,
          userId: userId || null,
        });
      }

      // Clear cache
      const cacheKey = userId ? `setting:${userId}:${key}` : `setting:${key}`;
      this.cache.delete(cacheKey);

      logger.info('[SettingsService] Setting updated', { key, userId });
    } catch (error: any) {
      logger.error('[SettingsService] Error setting value', {
        key,
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update multiple settings at once
   */
  async updateMany(settingsData: Partial<SettingsData>, userId?: string): Promise<void> {
    try {
      logger.info('[SettingsService] Updating multiple settings', {
        keys: Object.keys(settingsData),
        userId,
      });

      // Update each setting
      for (const [key, value] of Object.entries(settingsData)) {
        if (value !== undefined && value !== null && value !== '') {
          await this.set(key, value, userId);
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
  async getAllMasked(userId?: string): Promise<SettingsData> {
    const allSettings = await this.getAll(userId);
    
    return {
      ...allSettings,
      anthropicApiKey: this.maskApiKey(allSettings.anthropicApiKey),
      apolloApiKey: this.maskApiKey(allSettings.apolloApiKey),
      hunterApiKey: this.maskApiKey(allSettings.hunterApiKey),
      peopleDataLabsApiKey: this.maskApiKey(allSettings.peopleDataLabsApiKey),
      googlePlacesApiKey: this.maskApiKey(allSettings.googlePlacesApiKey),
      googleCustomSearchApiKey: this.maskApiKey(allSettings.googleCustomSearchApiKey),
      // Don't mask googleCustomSearchEngineId - it's not sensitive
      smtpPass: this.maskApiKey(allSettings.smtpPass),
      awsAccessKeyId: this.maskApiKey(allSettings.awsAccessKeyId),
      awsSecretAccessKey: this.maskApiKey(allSettings.awsSecretAccessKey),
    };
  }

  /**
   * Check if a value has been set (not empty or masked)
   */
  isSet(value?: string): boolean {
    return !!value && value !== '' && !value.includes('••••••••');
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
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      awsRegion: process.env.AWS_REGION,
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
