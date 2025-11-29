import { Request, Response } from 'express';
import { settingsService } from '../services/settings.service';
import { emailSenderService } from '../services/outreach/email-sender.service';
import { logger } from '../utils/logger';

export class SettingsController {
  async getSettings(req: Request, res: Response) {
    try {
      logger.info('[SettingsController] Getting all settings');
      const settings = await settingsService.getAllMasked();
      res.json({ success: true, data: settings });
    } catch (error: any) {
      logger.error('[SettingsController] Error getting settings', { error: error.message });
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  async updateSettings(req: Request, res: Response) {
    try {
      const settingsData = req.body;
      logger.info('[SettingsController] Updating settings', { keys: Object.keys(settingsData) });
      await settingsService.updateMany(settingsData);
      
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

  async testSMTP(req: Request, res: Response) {
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

  async clearCache(req: Request, res: Response) {
    try {
      logger.info('[SettingsController] Clearing settings cache');
      settingsService.clearCache();
      res.json({ success: true, message: 'Settings cache cleared' });
    } catch (error: any) {
      logger.error('[SettingsController] Error clearing cache', { error: error.message });
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }
}

export const settingsController = new SettingsController();
