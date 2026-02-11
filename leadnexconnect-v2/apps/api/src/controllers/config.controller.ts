import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { configService } from '../services/config.service';
import { logger } from '../utils/logger';

export class ConfigController {
  // =========================
  // API Configuration Routes
  // =========================

  async getAllApiConfigs(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      logger.info('[ConfigController] Getting all API configurations');
      const configs = await configService.getAllApiConfigs(userId);
      
      // Mask sensitive data (API keys)
      const maskedConfigs = configs.map((config) => ({
        ...config,
        apiKey: config.apiKey ? this.maskApiKey(config.apiKey) : null,
        apiSecret: config.apiSecret ? this.maskApiKey(config.apiSecret) : null,
      }));
      
      res.json({ success: true, data: maskedConfigs });
    } catch (error: any) {
      logger.error('[ConfigController] Error getting API configs', { error: error.message });
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  async getApiConfig(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { apiSource } = req.params;
      logger.info('[ConfigController] Getting API config', { apiSource });
      
      const config = await configService.getApiConfig(userId, apiSource);
      
      if (!config) {
        return res.status(404).json({ success: false, error: { message: 'API configuration not found' } });
      }
      
      // Mask sensitive data
      const maskedConfig = {
        ...config,
        apiKey: config.apiKey ? this.maskApiKey(config.apiKey) : null,
        apiSecret: config.apiSecret ? this.maskApiKey(config.apiSecret) : null,
      };
      
      res.json({ success: true, data: maskedConfig });
    } catch (error: any) {
      logger.error('[ConfigController] Error getting API config', { error: error.message });
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  async getUnmaskedApiConfig(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { apiSource } = req.params;
      logger.info('[ConfigController] Getting unmasked API config', { apiSource });
      
      const config = await configService.getApiConfig(userId, apiSource);
      
      if (!config) {
        return res.status(404).json({ success: false, error: { message: 'API configuration not found' } });
      }
      
      res.json({ success: true, data: config });
    } catch (error: any) {
      logger.error('[ConfigController] Error getting unmasked API config', { error: error.message });
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  async upsertApiConfig(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const configData = req.body;
      logger.info('[ConfigController] Upserting API config', { apiSource: configData.apiSource });
      
      if (!configData.apiSource) {
        return res.status(400).json({ success: false, error: { message: 'apiSource is required' } });
      }
      
      const config = await configService.upsertApiConfig(userId, configData);
      
      // Mask sensitive data in response
      const maskedConfig = {
        ...config,
        apiKey: config.apiKey ? this.maskApiKey(config.apiKey) : null,
        apiSecret: config.apiSecret ? this.maskApiKey(config.apiSecret) : null,
      };
      
      res.json({ success: true, data: maskedConfig, message: 'API configuration saved successfully' });
    } catch (error: any) {
      logger.error('[ConfigController] Error upserting API config', { error: error.message });
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  async deleteApiConfig(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { apiSource } = req.params;
      logger.info('[ConfigController] Deleting API config', { apiSource });
      
      await configService.deleteApiConfig(userId, apiSource);
      
      res.json({ success: true, message: 'API configuration deleted successfully' });
    } catch (error: any) {
      logger.error('[ConfigController] Error deleting API config', { error: error.message });
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  // ==========================
  // SMTP Configuration Routes
  // ==========================

  async getAllSmtpConfigs(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      logger.info('[ConfigController] Getting all SMTP configurations');
      const configs = await configService.getAllSmtpConfigs(userId);
      
      // Mask sensitive data (passwords)
      const maskedConfigs = configs.map((config) => ({
        ...config,
        password: config.password ? this.maskApiKey(config.password) : null,
      }));
      
      res.json({ success: true, data: maskedConfigs });
    } catch (error: any) {
      logger.error('[ConfigController] Error getting SMTP configs', { error: error.message });
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  async getSmtpConfig(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      logger.info('[ConfigController] Getting SMTP config', { id });
      
      const config = await configService.getSmtpConfig(userId, id);
      
      if (!config) {
        return res.status(404).json({ success: false, error: { message: 'SMTP configuration not found' } });
      }
      
      // Mask sensitive data
      const maskedConfig = {
        ...config,
        password: config.password ? this.maskApiKey(config.password) : null,
      };
      
      res.json({ success: true, data: maskedConfig });
    } catch (error: any) {
      logger.error('[ConfigController] Error getting SMTP config', { error: error.message });
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  async getUnmaskedSmtpConfig(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      logger.info('[ConfigController] Getting unmasked SMTP config', { id });
      
      const config = await configService.getSmtpConfig(userId, id);
      
      if (!config) {
        return res.status(404).json({ success: false, error: { message: 'SMTP configuration not found' } });
      }
      
      res.json({ success: true, data: config });
    } catch (error: any) {
      logger.error('[ConfigController] Error getting unmasked SMTP config', { error: error.message });
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  async createSmtpConfig(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const configData = req.body;
      logger.info('[ConfigController] Creating SMTP config', { provider: configData.provider });
      
      // Validate required fields
      if (!configData.provider || !configData.host || !configData.port || !configData.fromEmail) {
        return res.status(400).json({
          success: false,
          error: { message: 'provider, host, port, and fromEmail are required' },
        });
      }
      
      const config = await configService.createSmtpConfig(userId, configData);
      
      // Mask sensitive data in response
      const maskedConfig = {
        ...config,
        password: config.password ? this.maskApiKey(config.password) : null,
      };
      
      res.json({ success: true, data: maskedConfig, message: 'SMTP configuration created successfully' });
    } catch (error: any) {
      logger.error('[ConfigController] Error creating SMTP config', { error: error.message });
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  async updateSmtpConfig(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const configData = req.body;
      logger.info('[ConfigController] Updating SMTP config', { id });
      
      const config = await configService.updateSmtpConfig(userId, id, configData);
      
      // Mask sensitive data in response
      const maskedConfig = {
        ...config,
        password: config.password ? this.maskApiKey(config.password) : null,
      };
      
      res.json({ success: true, data: maskedConfig, message: 'SMTP configuration updated successfully' });
    } catch (error: any) {
      logger.error('[ConfigController] Error updating SMTP config', { error: error.message });
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  async deleteSmtpConfig(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      logger.info('[ConfigController] Deleting SMTP config', { id });
      
      await configService.deleteSmtpConfig(userId, id);
      
      res.json({ success: true, message: 'SMTP configuration deleted successfully' });
    } catch (error: any) {
      logger.error('[ConfigController] Error deleting SMTP config', { error: error.message });
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  async testSmtpConnection(req: AuthRequest, res: Response) {
    try {
      const { host, port, secure, username, password } = req.body;
      logger.info('[ConfigController] Testing SMTP connection', { host, port });
      
      if (!host || !port) {
        return res.status(400).json({ success: false, error: { message: 'host and port are required' } });
      }
      
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port),
        secure: secure !== undefined ? secure : port === 465,
        auth: username && password ? { user: username, pass: password } : undefined,
      });
      
      await transporter.verify();
      
      res.json({ success: true, message: 'SMTP connection successful' });
    } catch (error: any) {
      logger.error('[ConfigController] SMTP connection test failed', { error: error.message });
      res.status(400).json({
        success: false,
        error: { message: 'SMTP connection failed: ' + error.message },
      });
    }
  }

  // =========================
  // Helper Methods
  // =========================

  private maskApiKey(key: string): string {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  }
}

export const configController = new ConfigController();
