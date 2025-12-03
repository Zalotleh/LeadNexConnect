import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface ApiConfig {
  id: string;
  apiSource: string;
  apiKey?: string;
  apiSecret?: string;
  planName?: string;
  monthlyLimit?: number;
  costPerLead?: string;
  costPerAPICall?: string;
  isActive?: boolean;
  documentationUrl?: string;
  setupNotes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SmtpConfig {
  id: string;
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
  documentationUrl?: string;
  setupNotes?: string;
  emailsSentToday?: number;
  emailsSentThisHour?: number;
  lastResetAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

class ConfigService {
  // =========================
  // API Configuration Methods
  // =========================

  async getAllApiConfigs(): Promise<ApiConfig[]> {
    const response = await axios.get(`${API_URL}/api/config/apis`);
    return response.data.data;
  }

  async getApiConfig(apiSource: string, unmasked: boolean = false): Promise<ApiConfig> {
    const url = unmasked
      ? `${API_URL}/api/config/apis/${apiSource}/unmasked`
      : `${API_URL}/api/config/apis/${apiSource}`;
    const response = await axios.get(url);
    return response.data.data;
  }

  async upsertApiConfig(data: Partial<ApiConfig>): Promise<ApiConfig> {
    const response = await axios.post(`${API_URL}/api/config/apis`, data);
    return response.data.data;
  }

  async deleteApiConfig(apiSource: string): Promise<void> {
    await axios.delete(`${API_URL}/api/config/apis/${apiSource}`);
  }

  // ==========================
  // SMTP Configuration Methods
  // ==========================

  async getAllSmtpConfigs(): Promise<SmtpConfig[]> {
    const response = await axios.get(`${API_URL}/api/config/smtp`);
    return response.data.data;
  }

  async getSmtpConfig(id: string, unmasked: boolean = false): Promise<SmtpConfig> {
    const url = unmasked
      ? `${API_URL}/api/config/smtp/${id}/unmasked`
      : `${API_URL}/api/config/smtp/${id}`;
    const response = await axios.get(url);
    return response.data.data;
  }

  async createSmtpConfig(data: Partial<SmtpConfig>): Promise<SmtpConfig> {
    const response = await axios.post(`${API_URL}/api/config/smtp`, data);
    return response.data.data;
  }

  async updateSmtpConfig(id: string, data: Partial<SmtpConfig>): Promise<SmtpConfig> {
    const response = await axios.put(`${API_URL}/api/config/smtp/${id}`, data);
    return response.data.data;
  }

  async deleteSmtpConfig(id: string): Promise<void> {
    await axios.delete(`${API_URL}/api/config/smtp/${id}`);
  }

  async testSmtpConnection(data: {
    host: string;
    port: number;
    secure?: boolean;
    username?: string;
    password?: string;
  }): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${API_URL}/api/config/smtp/test`, data);
    return response.data;
  }
}

export const configService = new ConfigService();
