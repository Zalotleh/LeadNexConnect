import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { settingsService } from '../services/settings.service';
import { emailSenderService } from '../services/outreach/email-sender.service';
import { logger } from '../utils/logger';

export class SettingsController {
  async getSettings(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      logger.info('[SettingsController] Getting all settings', { userId });
      const settings = await settingsService.getAllMasked(userId);
      res.json({ success: true, data: settings });
    } catch (error: any) {
      logger.error('[SettingsController] Error getting settings', { error: error.message });
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  async getUnmaskedSetting(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { key } = req.params;
      logger.info('[SettingsController] Getting unmasked setting', { key, userId });
      
      const value = await settingsService.get(key, undefined, userId);
      res.json({ success: true, data: { key, value } });
    } catch (error: any) {
      logger.error('[SettingsController] Error getting unmasked setting', { error: error.message });
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  async updateSettings(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const settingsData = req.body;
      logger.info('[SettingsController] Updating settings', { keys: Object.keys(settingsData), userId });
      await settingsService.updateMany(settingsData, userId);
      
      // Check if any SMTP settings were updated
      const smtpKeys = ['smtpProvider', 'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpSecure', 'fromName', 'fromEmail'];
      const hasSmtpUpdate = Object.keys(settingsData).some(key => smtpKeys.includes(key));
      
      if (hasSmtpUpdate) {
        logger.info('[SettingsController] SMTP settings updated, resetting email transporter');
        emailSenderService.resetTransporter();
      }
      
      res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error: any) {
      logger.error('[SettingsController] Error updating settings', { error: error.message });
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  async testSMTP(req: AuthRequest, res: Response) {
    try {
      const { smtpHost, smtpPort, smtpUser, smtpPass } = req.body;
      logger.info('[SettingsController] Testing SMTP connection', { host: smtpHost, port: smtpPort });
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: smtpPort === '465',
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.verify();
      res.json({ success: true, message: 'SMTP connection successful' });
    } catch (error: any) {
      logger.error('[SettingsController] SMTP test failed', { error: error.message });
      res.status(400).json({ success: false, error: { message: 'SMTP connection failed: ' + error.message } });
    }
  }

  async clearCache(req: AuthRequest, res: Response) {
    try {
      logger.info('[SettingsController] Clearing settings cache');
      settingsService.clearCache();
      res.json({ success: true, message: 'Settings cache cleared' });
    } catch (error: any) {
      logger.error('[SettingsController] Error clearing cache', { error: error.message });
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * GET /api/settings/company-profile
   * Readable by all authenticated users (used read-only on Signature page).
   */
  async getCompanyProfile(req: AuthRequest, res: Response) {
    try {
      const profile = await settingsService.get('company_profile');
      res.json({ success: true, data: profile ?? {} });
    } catch (error: any) {
      logger.error('[SettingsController] Error fetching company profile', { error: error.message });
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * PUT /api/settings/company-profile
   * Admin only — updates the global company_profile settings key.
   */
  async updateCompanyProfile(req: AuthRequest, res: Response) {
    try {
      const {
        companyName, productName, productDescription,
        websiteUrl, signUpLink, featuresLink, pricingLink,
        demoLink, integrationsLink, supportEmail,
      } = req.body;

      await settingsService.updateMany(
        { company_profile: {
          companyName, productName, productDescription,
          websiteUrl, signUpLink, featuresLink, pricingLink,
          demoLink, integrationsLink, supportEmail,
        }},
      );

      logger.info('[SettingsController] Company profile updated');
      res.json({ success: true, message: 'Company profile updated successfully' });
    } catch (error: any) {
      logger.error('[SettingsController] Error updating company profile', { error: error.message });
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }
}

export const settingsController = new SettingsController();
