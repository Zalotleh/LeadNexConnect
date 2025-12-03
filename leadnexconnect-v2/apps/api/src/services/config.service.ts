import { db, apiConfig, smtpConfig } from '@leadnex/database';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';

// Documentation URLs for API providers
const API_DOCUMENTATION_URLS: Record<string, string> = {
  apollo: 'https://www.apollo.io/api',
  hunter: 'https://hunter.io/api-documentation',
  google_places: 'https://developers.google.com/maps/documentation/places/web-service',
  peopledatalabs: 'https://docs.peopledatalabs.com/',
};

// Documentation URLs for SMTP providers
const SMTP_DOCUMENTATION_URLS: Record<string, string> = {
  gmail: 'https://support.google.com/mail/answer/7126229',
  outlook: 'https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings',
  sendgrid: 'https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api',
  mailgun: 'https://documentation.mailgun.com/en/latest/user_manual.html#smtp',
  aws_ses: 'https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html',
};

export class ConfigService {
  // =========================
  // API Configuration Methods
  // =========================

  /**
   * Get all API configurations
   */
  async getAllApiConfigs() {
    try {
      logger.info('[ConfigService] Getting all API configurations');
      const configs = await db.select().from(apiConfig).orderBy(apiConfig.apiSource);
      return configs;
    } catch (error: any) {
      logger.error('[ConfigService] Error getting API configs', { error: error.message });
      throw error;
    }
  }

  /**
   * Get API configuration by source
   */
  async getApiConfig(apiSource: string) {
    try {
      logger.info('[ConfigService] Getting API config', { apiSource });
      const result = await db
        .select()
        .from(apiConfig)
        .where(eq(apiConfig.apiSource, apiSource))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    } catch (error: any) {
      logger.error('[ConfigService] Error getting API config', { apiSource, error: error.message });
      throw error;
    }
  }

  /**
   * Get active API configurations only
   */
  async getActiveApiConfigs() {
    try {
      logger.info('[ConfigService] Getting active API configurations');
      const configs = await db
        .select()
        .from(apiConfig)
        .where(eq(apiConfig.isActive, true))
        .orderBy(apiConfig.apiSource);
      
      return configs;
    } catch (error: any) {
      logger.error('[ConfigService] Error getting active API configs', { error: error.message });
      throw error;
    }
  }

  /**
   * Create or update API configuration
   */
  async upsertApiConfig(data: {
    apiSource: string;
    apiKey?: string;
    apiSecret?: string;
    planName?: string;
    monthlyLimit?: number;
    costPerLead?: string;
    costPerAPICall?: string;
    isActive?: boolean;
    setupNotes?: string;
  }) {
    try {
      logger.info('[ConfigService] Upserting API config', { apiSource: data.apiSource });

      // Check if config already exists
      const existing = await this.getApiConfig(data.apiSource);

      const configData = {
        ...data,
        documentationUrl: API_DOCUMENTATION_URLS[data.apiSource] || null,
        updatedAt: new Date(),
      };

      if (existing) {
        // Update existing config
        const updated = await db
          .update(apiConfig)
          .set(configData)
          .where(eq(apiConfig.apiSource, data.apiSource))
          .returning();
        
        logger.info('[ConfigService] API config updated', { apiSource: data.apiSource });
        return updated[0];
      } else {
        // Create new config
        const created = await db
          .insert(apiConfig)
          .values(configData)
          .returning();
        
        logger.info('[ConfigService] API config created', { apiSource: data.apiSource });
        return created[0];
      }
    } catch (error: any) {
      logger.error('[ConfigService] Error upserting API config', {
        apiSource: data.apiSource,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete API configuration
   */
  async deleteApiConfig(apiSource: string) {
    try {
      logger.info('[ConfigService] Deleting API config', { apiSource });
      await db.delete(apiConfig).where(eq(apiConfig.apiSource, apiSource));
      logger.info('[ConfigService] API config deleted', { apiSource });
    } catch (error: any) {
      logger.error('[ConfigService] Error deleting API config', {
        apiSource,
        error: error.message,
      });
      throw error;
    }
  }

  // ==========================
  // SMTP Configuration Methods
  // ==========================

  /**
   * Get all SMTP configurations
   */
  async getAllSmtpConfigs() {
    try {
      logger.info('[ConfigService] Getting all SMTP configurations');
      const configs = await db
        .select()
        .from(smtpConfig)
        .orderBy(desc(smtpConfig.isPrimary), desc(smtpConfig.priority));
      
      return configs;
    } catch (error: any) {
      logger.error('[ConfigService] Error getting SMTP configs', { error: error.message });
      throw error;
    }
  }

  /**
   * Get SMTP configuration by ID
   */
  async getSmtpConfig(id: string) {
    try {
      logger.info('[ConfigService] Getting SMTP config', { id });
      const result = await db
        .select()
        .from(smtpConfig)
        .where(eq(smtpConfig.id, id))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    } catch (error: any) {
      logger.error('[ConfigService] Error getting SMTP config', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Get primary SMTP configuration
   */
  async getPrimarySmtpConfig() {
    try {
      logger.info('[ConfigService] Getting primary SMTP config');
      const result = await db
        .select()
        .from(smtpConfig)
        .where(and(eq(smtpConfig.isActive, true), eq(smtpConfig.isPrimary, true)))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    } catch (error: any) {
      logger.error('[ConfigService] Error getting primary SMTP config', { error: error.message });
      throw error;
    }
  }

  /**
   * Get active SMTP configurations ordered by priority
   */
  async getActiveSmtpConfigs() {
    try {
      logger.info('[ConfigService] Getting active SMTP configurations');
      const configs = await db
        .select()
        .from(smtpConfig)
        .where(eq(smtpConfig.isActive, true))
        .orderBy(desc(smtpConfig.isPrimary), desc(smtpConfig.priority));
      
      return configs;
    } catch (error: any) {
      logger.error('[ConfigService] Error getting active SMTP configs', { error: error.message });
      throw error;
    }
  }

  /**
   * Create SMTP configuration
   */
  async createSmtpConfig(data: {
    provider: string;
    providerName: string;
    host: string;
    port: number;
    secure?: boolean;
    username?: string;
    password?: string;
    fromEmail: string;
    fromName?: string;
    dailyLimit?: number;
    hourlyLimit?: number;
    isActive?: boolean;
    isPrimary?: boolean;
    priority?: number;
    setupNotes?: string;
  }) {
    try {
      logger.info('[ConfigService] Creating SMTP config', { provider: data.provider });

      // If this is set as primary, unset other primaries
      if (data.isPrimary) {
        await db
          .update(smtpConfig)
          .set({ isPrimary: false })
          .where(eq(smtpConfig.isPrimary, true));
      }

      const configData = {
        ...data,
        documentationUrl: SMTP_DOCUMENTATION_URLS[data.provider] || null,
        emailsSentToday: 0,
        emailsSentThisHour: 0,
        lastResetAt: new Date(),
      };

      const created = await db.insert(smtpConfig).values(configData).returning();
      
      logger.info('[ConfigService] SMTP config created', { id: created[0].id });
      return created[0];
    } catch (error: any) {
      logger.error('[ConfigService] Error creating SMTP config', {
        provider: data.provider,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update SMTP configuration
   */
  async updateSmtpConfig(
    id: string,
    data: {
      provider?: string;
      providerName?: string;
      host?: string;
      port?: number;
      secure?: boolean;
      username?: string;
      password?: string;
      fromEmail?: string;
      fromName?: string;
      dailyLimit?: number;
      hourlyLimit?: number;
      isActive?: boolean;
      isPrimary?: boolean;
      priority?: number;
      setupNotes?: string;
    }
  ) {
    try {
      logger.info('[ConfigService] Updating SMTP config', { id });

      // If this is being set as primary, unset other primaries
      if (data.isPrimary) {
        await db
          .update(smtpConfig)
          .set({ isPrimary: false })
          .where(eq(smtpConfig.isPrimary, true));
      }

      const updateData: any = {
        ...data,
        updatedAt: new Date(),
      };

      // Add documentation URL if provider changed
      if (data.provider) {
        updateData.documentationUrl = SMTP_DOCUMENTATION_URLS[data.provider] || null;
      }

      const updated = await db
        .update(smtpConfig)
        .set(updateData)
        .where(eq(smtpConfig.id, id))
        .returning();
      
      logger.info('[ConfigService] SMTP config updated', { id });
      return updated[0];
    } catch (error: any) {
      logger.error('[ConfigService] Error updating SMTP config', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Delete SMTP configuration
   */
  async deleteSmtpConfig(id: string) {
    try {
      logger.info('[ConfigService] Deleting SMTP config', { id });
      await db.delete(smtpConfig).where(eq(smtpConfig.id, id));
      logger.info('[ConfigService] SMTP config deleted', { id });
    } catch (error: any) {
      logger.error('[ConfigService] Error deleting SMTP config', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Increment email sent counter for SMTP config
   */
  async incrementEmailsSent(id: string) {
    try {
      const config = await this.getSmtpConfig(id);
      if (!config) {
        throw new Error('SMTP config not found');
      }

      // Check if we need to reset counters
      const now = new Date();
      const lastReset = new Date(config.lastResetAt || now);
      const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

      let updateData: any = {
        emailsSentThisHour: (config.emailsSentThisHour || 0) + 1,
      };

      // Reset hourly counter if more than 1 hour passed
      if (hoursSinceReset >= 1) {
        updateData.emailsSentThisHour = 1;
        updateData.lastResetAt = now;
      }

      // Reset daily counter if it's a new day
      const isDifferentDay = lastReset.toDateString() !== now.toDateString();
      if (isDifferentDay) {
        updateData.emailsSentToday = 1;
      } else {
        updateData.emailsSentToday = (config.emailsSentToday || 0) + 1;
      }

      await db.update(smtpConfig).set(updateData).where(eq(smtpConfig.id, id));

      logger.info('[ConfigService] Email counter incremented', {
        id,
        emailsSentToday: updateData.emailsSentToday,
        emailsSentThisHour: updateData.emailsSentThisHour,
      });
    } catch (error: any) {
      logger.error('[ConfigService] Error incrementing email counter', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Check if SMTP config has reached its limits
   */
  async isSmtpConfigAvailable(id: string): Promise<boolean> {
    try {
      const config = await this.getSmtpConfig(id);
      if (!config || !config.isActive) {
        return false;
      }

      // Check hourly limit
      if (config.hourlyLimit && (config.emailsSentThisHour || 0) >= config.hourlyLimit) {
        logger.warn('[ConfigService] SMTP hourly limit reached', { id, hourlyLimit: config.hourlyLimit });
        return false;
      }

      // Check daily limit
      if (config.dailyLimit && (config.emailsSentToday || 0) >= config.dailyLimit) {
        logger.warn('[ConfigService] SMTP daily limit reached', { id, dailyLimit: config.dailyLimit });
        return false;
      }

      return true;
    } catch (error: any) {
      logger.error('[ConfigService] Error checking SMTP availability', { id, error: error.message });
      return false;
    }
  }

  /**
   * Get next available SMTP configuration (with fallback logic)
   */
  async getNextAvailableSmtpConfig() {
    try {
      const configs = await this.getActiveSmtpConfigs();

      for (const config of configs) {
        const isAvailable = await this.isSmtpConfigAvailable(config.id);
        if (isAvailable) {
          logger.info('[ConfigService] Found available SMTP config', {
            id: config.id,
            provider: config.provider,
            isPrimary: config.isPrimary,
          });
          return config;
        }
      }

      logger.warn('[ConfigService] No available SMTP configs found');
      return null;
    } catch (error: any) {
      logger.error('[ConfigService] Error getting next available SMTP config', {
        error: error.message,
      });
      throw error;
    }
  }
}

export const configService = new ConfigService();
