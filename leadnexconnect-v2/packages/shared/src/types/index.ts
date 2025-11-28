import { z } from 'zod';

// Lead Types
export const LeadSourceEnum = z.enum([
  'linkedin',
  'apollo',
  'peopledatalabs',
  'google_places',
  'yelp_scrape',
  'yellowpages_scrape',
  'tripadvisor_scrape',
  'manual_import',
]);

export type LeadSource = z.infer<typeof LeadSourceEnum>;

export const LeadStatusEnum = z.enum([
  'new',
  'contacted',
  'follow_up_1',
  'follow_up_2',
  'responded',
  'interested',
  'not_interested',
  'invalid',
  'converted',
]);

export type LeadStatus = z.infer<typeof LeadStatusEnum>;

export interface Lead {
  id: string;
  companyName: string;
  website?: string;
  email?: string;
  phone?: string;
  contactName?: string;
  jobTitle?: string;
  country?: string;
  city?: string;
  address?: string;
  industry: string;
  businessType?: string;
  companySize?: string;
  source: LeadSource;
  qualityScore: number;
  verificationStatus: string;
  status: LeadStatus;
  followUpStage: string;
  lastContactedAt?: Date;
  lastRespondedAt?: Date;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  linkedinUrl?: string;
  linkedinSalesNavData?: Record<string, any>;
  
  // Digital Presence Indicators
  hasGoogleMapsListing?: boolean;
  googleRating?: string;
  googleReviewCount?: number;
  
  // Website Analysis
  hasBookingKeywords?: boolean;
  bookingKeywordScore?: number;
  currentBookingTool?: string;
  hasAppointmentForm?: boolean;
  hasOnlineBooking?: boolean;
  hasMultiLocation?: boolean;
  servicesCount?: number;
  
  // Qualification Signals
  bookingPotential?: 'high' | 'medium' | 'low';
  digitalMaturityScore?: number;
  isDecisionMaker?: boolean;
  
  // Business Intelligence
  hasWeekendHours?: boolean;
  responseTime?: string;
  priceLevel?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

// Campaign Types
export interface Campaign {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  targetCountries?: string[];
  targetCities?: string[];
  companySize?: string;
  leadsPerDay: number;
  emailTemplateId?: string;
  followUpEnabled: boolean;
  followUp1DelayDays: number;
  followUp2DelayDays: number;
  status: string;
  scheduleType: string;
  scheduleTime?: string;
  startDate?: Date;
  endDate?: Date;
  usesLinkedin: boolean;
  usesApollo: boolean;
  usesPeopleDL: boolean;
  usesGooglePlaces: boolean;
  usesWebScraping: boolean;
  leadsGenerated: number;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  responsesReceived: number;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Email Types
export interface Email {
  id: string;
  leadId: string;
  campaignId?: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  followUpStage: string;
  status: string;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  errorMessage?: string;
  externalId?: string;
  openCount: number;
  clickCount: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// API Request/Response Types
export interface GenerateLeadsRequest {
  industry: string;
  country?: string;
  city?: string;
  maxResults: number;
  sources: LeadSource[];
  enrichEmail?: boolean;
  enrichPhone?: boolean;
}

export interface GenerateLeadsResponse {
  leads: Lead[];
  summary: {
    total: number;
    bySource: Record<string, number>;
    duplicatesSkipped: number;
    newLeads: number;
  };
}

export interface ImportLinkedInRequest {
  csvData: string;
  enrichEmail?: boolean;
  enrichPhone?: boolean;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  industry?: string;
  targetCountries?: string[];
  targetCities?: string[];
  companySize?: string;
  leadsPerDay: number;
  emailTemplateId?: string;
  followUpEnabled: boolean;
  followUp1DelayDays?: number;
  followUp2DelayDays?: number;
  scheduleType: 'manual' | 'daily' | 'weekly' | 'custom';
  scheduleTime?: string;
  startDate?: Date;
  endDate?: Date;
  sources: {
    linkedin?: boolean;
    apollo?: boolean;
    peopleDL?: boolean;
    googlePlaces?: boolean;
    webScraping?: boolean;
  };
}

export interface DashboardMetrics {
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  respondedLeads: number;
  totalEmailsSent: number;
  emailOpenRate: number;
  emailClickRate: number;
  responseRate: number;
  activeCampaigns: number;
  leadsGeneratedToday: number;
  emailsSentToday: number;
  topIndustries: Array<{ industry: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: Date;
  }>;
}

// API Response Wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Filter Types
export interface LeadFilters extends PaginationParams {
  industry?: string;
  country?: string;
  city?: string;
  status?: LeadStatus;
  source?: LeadSource;
  minQualityScore?: number;
  maxQualityScore?: number;
  hasEmail?: boolean;
  hasPhone?: boolean;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
}

// Import industry constants from constants folder
import { INDUSTRIES as INDUSTRY_OPTIONS } from '../constants/industries';

// Re-export for backward compatibility - Industry is now a string (the value field)
export type Industry = string;

export const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Norway',
  'Sweden',
  'Denmark',
  'Finland',
  'Iceland',
  'Maldives',
  'United Arab Emirates',
  'Singapore',
] as const;

export const COMPANY_SIZES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1000+',
] as const;

export type Country = (typeof COUNTRIES)[number];
export type CompanySize = (typeof COMPANY_SIZES)[number];

