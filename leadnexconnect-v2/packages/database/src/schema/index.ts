import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  decimal,
  date,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const leadStatusEnum = pgEnum('lead_status', [
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

export const verificationStatusEnum = pgEnum('verification_status', [
  'unverified',
  'email_verified',
  'phone_verified',
  'fully_verified',
]);

export const emailStatusEnum = pgEnum('email_status', [
  'queued',
  'sent',
  'delivered',
  'opened',
  'clicked',
  'bounced',
  'failed',
  'spam',
]);

export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft',
  'active',
  'paused',
  'completed',
  'archived',
]);

export const scheduleTypeEnum = pgEnum('schedule_type', [
  'manual',
  'immediate',
  'scheduled',
  'daily',
  'weekly',
  'custom',
]);

export const scrapingStatusEnum = pgEnum('scraping_status', [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

export const templateCategoryEnum = pgEnum('template_category', [
  'initial_outreach',
  'follow_up',
  'meeting_request',
  'introduction',
  'product_demo',
  'partnership',
  'general',
  'other',
]);

// Main Tables

export const leads = pgTable('leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Company Information
  companyName: varchar('company_name', { length: 255 }).notNull(),
  website: varchar('website', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  
  // Contact Information
  contactName: varchar('contact_name', { length: 255 }),
  jobTitle: varchar('job_title', { length: 255 }),
  
  // Location
  country: varchar('country', { length: 100 }),
  city: varchar('city', { length: 100 }),
  address: text('address'),
  
  // Classification
  industry: varchar('industry', { length: 100 }).notNull(),
  businessType: varchar('business_type', { length: 100 }),
  companySize: varchar('company_size', { length: 50 }),
  
  // Lead Quality
  source: varchar('source', { length: 50 }).notNull(),
  sourceType: varchar('source_type', { length: 50 }).default('automated'), // 'automated' or 'manual_import'
  batchId: uuid('batch_id'), // References leadBatches for manual imports
  qualityScore: integer('quality_score').default(0),
  verificationStatus: verificationStatusEnum('verification_status').default('unverified'),
  
  // Outreach Status
  status: leadStatusEnum('status').default('new'),
  followUpStage: varchar('follow_up_stage', { length: 50 }).default('initial'),
  lastContactedAt: timestamp('last_contacted_at'),
  lastRespondedAt: timestamp('last_responded_at'),
  
  // Engagement Metrics
  emailsSent: integer('emails_sent').default(0),
  emailsOpened: integer('emails_opened').default(0),
  emailsClicked: integer('emails_clicked').default(0),
  
  // Metadata
  notes: text('notes'),
  tags: varchar('tags', { length: 100 }).array(),
  customFields: jsonb('custom_fields'),
  
  // LinkedIn Data
  linkedinUrl: varchar('linkedin_url', { length: 500 }),
  linkedinSalesNavData: jsonb('linkedin_sales_nav_data'),
  
  // NEW: Digital Presence Indicators
  hasGoogleMapsListing: boolean('has_google_maps_listing').default(false),
  googleRating: decimal('google_rating', { precision: 3, scale: 2 }),
  googleReviewCount: integer('google_review_count').default(0),
  
  // NEW: Website Analysis
  hasBookingKeywords: boolean('has_booking_keywords').default(false),
  bookingKeywordScore: integer('booking_keyword_score').default(0),
  currentBookingTool: varchar('current_booking_tool', { length: 100 }),
  hasAppointmentForm: boolean('has_appointment_form').default(false),
  hasOnlineBooking: boolean('has_online_booking').default(false),
  hasMultiLocation: boolean('has_multi_location').default(false),
  servicesCount: integer('services_count').default(0),
  
  // NEW: Qualification Signals
  bookingPotential: varchar('booking_potential', { length: 20 }).default('medium'), // low, medium, high
  digitalMaturityScore: integer('digital_maturity_score').default(0),
  isDecisionMaker: boolean('is_decision_maker').default(false),
  
  // NEW: Business Intelligence
  hasWeekendHours: boolean('has_weekend_hours'),
  responseTime: varchar('response_time', { length: 50 }),
  priceLevel: integer('price_level'), // From Google Places (1-4)
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const campaigns = pgTable('campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Basic Info
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  // NEW: Campaign Type Classification (PROMPT 1)
  // Values: 'lead_generation' | 'outreach' | 'fully_automated'
  campaignType: varchar('campaign_type', { length: 50 }).notNull().default('outreach'),

  // DEPRECATED: Old batchId - replaced by batchIds array
  batchId: uuid('batch_id'), // Keep for backward compatibility

  // NEW: Lead Generation Config (for lead_generation & fully_automated types)
  leadSources: jsonb('lead_sources').$type<string[]>(), // ['apollo', 'google_places', 'hunter']
  maxResultsPerRun: integer('max_results_per_run'),

  // NEW: Outreach Config (for outreach & fully_automated types)
  batchIds: jsonb('batch_ids').$type<string[]>(), // Multiple batches support
  useWorkflow: boolean('use_workflow').default(false),

  // NEW: Automation Config (for fully_automated type)
  isRecurring: boolean('is_recurring').default(false),
  recurringInterval: varchar('recurring_interval', { length: 50 }), // 'daily' | 'every_2_days' | 'weekly' | 'monthly'
  nextRunAt: timestamp('next_run_at'),
  outreachDelayDays: integer('outreach_delay_days').default(0), // Days to wait after lead gen before outreach

  // Target Criteria
  industry: varchar('industry', { length: 100 }),
  targetCountries: varchar('target_countries', { length: 100 }).array(),
  targetCities: varchar('target_cities', { length: 100 }).array(),
  companySize: varchar('company_size', { length: 50 }),

  // Configuration
  leadsPerDay: integer('leads_per_day').default(50),
  emailTemplateId: uuid('email_template_id'),
  workflowId: uuid('workflow_id').references(() => workflows.id, { onDelete: 'set null' }),
  followUpEnabled: boolean('follow_up_enabled').default(true),
  followUp1DelayDays: integer('follow_up_1_delay_days').default(3),
  followUp2DelayDays: integer('follow_up_2_delay_days').default(5),

  // NEW: Enhanced Status Management (PROMPT 1)
  // Values: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed'
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  startType: varchar('start_type', { length: 20 }).default('manual'), // 'manual' | 'scheduled'
  scheduledStartAt: timestamp('scheduled_start_at'),
  actualStartedAt: timestamp('actual_started_at'),
  pausedAt: timestamp('paused_at'),
  resumedAt: timestamp('resumed_at'),
  completedAt: timestamp('completed_at'),
  failedAt: timestamp('failed_at'),
  failureReason: text('failure_reason'),

  // OLD: Scheduling (kept for backward compatibility)
  scheduleType: scheduleTypeEnum('schedule_type').default('manual'),
  scheduleTime: varchar('schedule_time', { length: 10 }),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),

  // Lead Sources
  usesLinkedin: boolean('uses_linkedin').default(false),
  usesApollo: boolean('uses_apollo').default(false),
  usesPeopleDL: boolean('uses_people_dl').default(false),
  usesGooglePlaces: boolean('uses_google_places').default(false),
  usesWebScraping: boolean('uses_web_scraping').default(false),

  // NEW: Enhanced Metrics (PROMPT 1)
  totalLeadsTargeted: integer('total_leads_targeted').default(0),
  emailsSentCount: integer('emails_sent_count').default(0),
  emailsScheduledCount: integer('emails_scheduled_count').default(0),
  emailsFailedCount: integer('emails_failed_count').default(0),
  currentWorkflowStep: integer('current_workflow_step').default(1),

  // OLD: Metrics (kept for backward compatibility)
  leadsGenerated: integer('leads_generated').default(0),
  emailsSent: integer('emails_sent').default(0),
  emailsOpened: integer('emails_opened').default(0),
  emailsClicked: integer('emails_clicked').default(0),
  responsesReceived: integer('responses_received').default(0),

  // Timestamps
  lastRunAt: timestamp('last_run_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const emails = pgTable('emails', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // References
  leadId: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  
  // Content
  subject: varchar('subject', { length: 500 }).notNull(),
  bodyText: text('body_text').notNull(),
  bodyHtml: text('body_html'),
  
  // Classification
  followUpStage: varchar('follow_up_stage', { length: 50 }).default('initial'),
  
  // Status
  status: emailStatusEnum('status').default('queued'),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  openedAt: timestamp('opened_at'),
  clickedAt: timestamp('clicked_at'),
  bouncedAt: timestamp('bounced_at'),
  
  // Tracking
  errorMessage: text('error_message'),
  externalId: varchar('external_id', { length: 255 }),
  openCount: integer('open_count').default(0),
  clickCount: integer('click_count').default(0),
  
  // Metadata
  metadata: jsonb('metadata'),
  
  createdAt: timestamp('created_at').defaultNow(),
});

// NEW: Scheduled Emails (PROMPT 1 - KEY to fixing campaign completion bug)
// This table stores all future emails that need to be sent
// Campaign only completes when all scheduled emails are sent/failed
export const scheduledEmails = pgTable('scheduled_emails', {
  id: uuid('id').defaultRandom().primaryKey(),

  // References
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  leadId: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').notNull().references(() => emailTemplates.id),
  workflowId: uuid('workflow_id').references(() => workflows.id),
  workflowStepNumber: integer('workflow_step_number').default(1),

  // Scheduling
  scheduledFor: timestamp('scheduled_for').notNull(), // When this email should be sent

  // Execution
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  // Values: 'pending' | 'sent' | 'failed' | 'skipped' | 'cancelled'
  sentAt: timestamp('sent_at'),
  failedAt: timestamp('failed_at'),
  failureReason: text('failure_reason'),
  retryCount: integer('retry_count').default(0),

  // Result tracking (links to emails table after sent)
  emailId: uuid('email_id').references(() => emails.id),

  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Campaign Leads (Many-to-Many relationship for manual campaigns)
export const campaignLeads = pgTable('campaign_leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // References
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  leadId: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  
  // Status
  addedAt: timestamp('added_at').defaultNow(),
  processed: boolean('processed').default(false),
  processedAt: timestamp('processed_at'),
});

export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Basic Info
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: templateCategoryEnum('category').default('general'),
  
  // Classification
  industry: varchar('industry', { length: 100 }),
  followUpStage: varchar('follow_up_stage', { length: 50 }).default('initial'),
  
  // Content
  subject: varchar('subject', { length: 500 }).notNull(),
  bodyText: text('body_text').notNull(),
  bodyHtml: text('body_html'),
  
  // Variables
  variables: jsonb('variables'),
  
  // Status
  isActive: boolean('is_active').default(true),
  isDefault: boolean('is_default').default(false),
  usageCount: integer('usage_count').default(0),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const scrapingJobs = pgTable('scraping_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Configuration
  source: varchar('source', { length: 50 }).notNull(),
  industry: varchar('industry', { length: 100 }),
  country: varchar('country', { length: 100 }),
  city: varchar('city', { length: 100 }),
  
  // Filters
  maxResults: integer('max_results').default(100),
  filters: jsonb('filters'),
  
  // Status
  status: scrapingStatusEnum('status').default('queued'),
  progress: integer('progress').default(0),
  leadsFound: integer('leads_found').default(0),
  leadsImported: integer('leads_imported').default(0),
  
  // Results
  errorMessage: text('error_message'),
  resultsJson: jsonb('results_json'),
  
  // Timestamps
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const apiUsage = pgTable('api_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Service Info
  service: varchar('service', { length: 50 }).notNull(),
  
  // Usage Tracking
  requestsMade: integer('requests_made').default(0),
  requestsLimit: integer('requests_limit'),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  
  // Cost (if applicable)
  cost: integer('cost').default(0),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const settings = pgTable('settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const activityLog = pgTable('activity_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Activity Info
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  
  // Details
  description: text('description'),
  metadata: jsonb('metadata'),
  
  createdAt: timestamp('created_at').defaultNow(),
});

// API Performance Tracking
export const apiPerformance = pgTable('api_performance', {
  id: uuid('id').defaultRandom().primaryKey(),
  apiSource: varchar('api_source', { length: 50 }).notNull(), // apollo, hunter, google_places, linkedin
  
  // Metrics
  leadsGenerated: integer('leads_generated').default(0),
  leadsConverted: integer('leads_converted').default(0),
  emailsFound: integer('emails_found').default(0),
  emailsVerified: integer('emails_verified').default(0),
  
  // Quality Metrics
  avgLeadScore: decimal('avg_lead_score', { precision: 5, scale: 2 }),
  hotLeadsPercent: decimal('hot_leads_percent', { precision: 5, scale: 2 }),
  warmLeadsPercent: decimal('warm_leads_percent', { precision: 5, scale: 2 }),
  
  // Conversion Tracking
  demosBooked: integer('demos_booked').default(0),
  trialsStarted: integer('trials_started').default(0),
  customersConverted: integer('customers_converted').default(0),
  
  // Cost Analysis
  apiCallsUsed: integer('api_calls_used').default(0),
  apiCallsLimit: integer('api_calls_limit'),
  costPerLead: decimal('cost_per_lead', { precision: 10, scale: 2 }),
  
  // Time Period
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  
  createdAt: timestamp('created_at').defaultNow(),
});

// Lead Source ROI Tracking
export const leadSourceRoi = pgTable('lead_source_roi', {
  id: uuid('id').defaultRandom().primaryKey(),
  leadId: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  source: varchar('source', { length: 50 }).notNull(),
  
  // Journey Tracking
  firstContactAt: timestamp('first_contact_at'),
  demoBookedAt: timestamp('demo_booked_at'),
  trialStartedAt: timestamp('trial_started_at'),
  convertedAt: timestamp('converted_at'),
  
  // Revenue
  planType: varchar('plan_type', { length: 50 }), // basic, business, premium
  mrr: decimal('mrr', { precision: 10, scale: 2 }),
  lifetimeValue: decimal('lifetime_value', { precision: 10, scale: 2 }),
  
  // Attribution
  attributedSource: varchar('attributed_source', { length: 50 }),
  conversionTimeDays: integer('conversion_time_days'),
  
  createdAt: timestamp('created_at').defaultNow(),
});

// Website Analysis Cache
export const websiteAnalysisCache = pgTable('website_analysis_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  domain: varchar('domain', { length: 255 }).notNull().unique(),
  
  // Analysis Results
  hasBookingKeywords: boolean('has_booking_keywords'),
  bookingKeywordScore: integer('booking_keyword_score'),
  currentBookingTool: varchar('current_booking_tool', { length: 100 }),
  hasAppointmentForm: boolean('has_appointment_form'),
  hasCalendar: boolean('has_calendar'),
  hasPricing: boolean('has_pricing'),
  hasGallery: boolean('has_gallery'),
  hasReviews: boolean('has_reviews'),
  hasContactForm: boolean('has_contact_form'),
  hasPhoneOnly: boolean('has_phone_only'),
  multiLocation: boolean('multi_location'),
  servicesCount: integer('services_count'),
  languageSupport: varchar('language_support', { length: 255 }).array(),
  
  // Raw Data
  analysisData: jsonb('analysis_data'),
  
  // Cache Control
  lastAnalyzedAt: timestamp('last_analyzed_at').defaultNow(),
  expiresAt: timestamp('expires_at'), // Cache for 30 days
  
  createdAt: timestamp('created_at').defaultNow(),
});

// Lead Batches (CSV Upload Tracking)
export const leadBatches = pgTable('lead_batches', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Batch Information
  name: varchar('name', { length: 255 }).notNull(),
  sourceFile: varchar('source_file', { length: 255 }),
  uploadedBy: varchar('uploaded_by', { length: 255 }),

  // Metrics
  totalLeads: integer('total_leads').default(0),
  successfulImports: integer('successful_imports').default(0),
  failedImports: integer('failed_imports').default(0),
  duplicatesSkipped: integer('duplicates_skipped').default(0),

  // NEW: Campaign Usage Tracking (PROMPT 1)
  activeCampaignId: uuid('active_campaign_id').references(() => campaigns.id),
  // If not null, this batch is currently being used by this campaign
  // Prevents multiple campaigns from using same batch simultaneously

  campaignHistory: jsonb('campaign_history').$type<Array<{
    campaignId: string;
    campaignName: string;
    startedAt: string;
    completedAt: string;
  }>>(),
  // Track all campaigns that have used this batch

  // Metadata
  importSettings: jsonb('import_settings'), // Stores enrichment flags, mapping config
  notes: text('notes'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Workflows - Multi-step email sequences
export const workflows = pgTable('workflows', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Basic Information
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Configuration
  stepsCount: integer('steps_count').default(1), // Number of emails in sequence
  industry: varchar('industry', { length: 100 }), // Target industry
  country: varchar('country', { length: 100 }), // Target country
  aiInstructions: text('ai_instructions'), // Extra instructions for AI generation
  
  // Metadata
  isActive: boolean('is_active').default(true),
  usageCount: integer('usage_count').default(0), // How many campaigns use this
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Workflow Steps - Individual emails in a workflow sequence
export const workflowSteps = pgTable('workflow_steps', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Relationships
  workflowId: uuid('workflow_id')
    .references(() => workflows.id, { onDelete: 'cascade' })
    .notNull(),

  // NEW: Email Template Reference (PROMPT 1)
  emailTemplateId: uuid('email_template_id')
    .notNull()
    .references(() => emailTemplates.id),

  // Step Configuration
  stepNumber: integer('step_number').notNull(), // 1, 2, 3, etc.
  daysAfterPrevious: integer('days_after_previous').default(0), // 0 for first email, N days for subsequent

  // DEPRECATED: Inline Email Content (kept for backward compatibility)
  // Use emailTemplateId instead
  subject: varchar('subject', { length: 500 }),
  body: text('body'),

  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Custom Variables - User-defined email variables
export const customVariables = pgTable('custom_variables', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Variable Identification
  key: varchar('key', { length: 100 }).notNull().unique(), // e.g., 'companyRevenue'
  label: varchar('label', { length: 255 }).notNull(), // e.g., 'Company Revenue'
  value: varchar('value', { length: 255 }).notNull(), // e.g., '{{companyRevenue}}'
  
  // Classification
  category: varchar('category', { length: 50 }).notNull().default('custom'), // 'lead', 'company', 'link', 'custom'
  description: text('description'), // Help text explaining what this variable does
  
  // Usage
  usageCount: integer('usage_count').default(0), // How many templates/workflows use this
  isActive: boolean('is_active').default(true), // Can be deactivated without deleting
  
  // Default Value
  defaultValue: varchar('default_value', { length: 500 }), // Fallback if variable not populated
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// API Configuration (User-defined API keys, limits, and costs)
export const apiConfig = pgTable('api_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  apiSource: varchar('api_source', { length: 50 }).notNull().unique(), // apollo, hunter, google_places, peopledatalabs
  
  // API Credentials
  apiKey: varchar('api_key', { length: 500 }),
  apiSecret: varchar('api_secret', { length: 500 }),
  
  // Plan Details
  planName: varchar('plan_name', { length: 100 }),
  monthlyLimit: integer('monthly_limit').default(0),
  costPerLead: decimal('cost_per_lead', { precision: 10, scale: 2 }).default('0'),
  costPerAPICall: decimal('cost_per_api_call', { precision: 10, scale: 2 }).default('0'),
  
  // Status
  isActive: boolean('is_active').default(true),
  
  // Documentation & Setup
  documentationUrl: varchar('documentation_url', { length: 500 }),
  setupNotes: text('setup_notes'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// SMTP Configuration (User-defined SMTP providers)
export const smtpConfig = pgTable('smtp_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Provider Info
  provider: varchar('provider', { length: 100 }).notNull(), // gmail, outlook, sendgrid, mailgun, ses, custom
  providerName: varchar('provider_name', { length: 100 }).notNull(),
  
  // SMTP Settings
  host: varchar('host', { length: 255 }).notNull(),
  port: integer('port').notNull(),
  secure: boolean('secure').default(true), // Use TLS
  username: varchar('username', { length: 255 }),
  password: varchar('password', { length: 500 }),
  fromEmail: varchar('from_email', { length: 255 }).notNull(),
  fromName: varchar('from_name', { length: 255 }),
  
  // Limits
  dailyLimit: integer('daily_limit').default(0),
  hourlyLimit: integer('hourly_limit').default(0),
  
  // Status & Priority
  isActive: boolean('is_active').default(true),
  isPrimary: boolean('is_primary').default(false), // Primary SMTP to use
  priority: integer('priority').default(0), // For fallback order
  
  // Documentation & Setup
  documentationUrl: varchar('documentation_url', { length: 500 }),
  setupNotes: text('setup_notes'),
  
  // Usage Tracking
  emailsSentToday: integer('emails_sent_today').default(0),
  emailsSentThisHour: integer('emails_sent_this_hour').default(0),
  lastResetAt: timestamp('last_reset_at').defaultNow(),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const leadsRelations = relations(leads, ({ many, one }) => ({
  emails: many(emails),
  roiTracking: many(leadSourceRoi),
  campaignLeads: many(campaignLeads),
  batch: one(leadBatches, {
    fields: [leads.batchId],
    references: [leadBatches.id],
  }),
}));

export const leadBatchesRelations = relations(leadBatches, ({ many }) => ({
  leads: many(leads),
}));

export const campaignsRelations = relations(campaigns, ({ many, one }) => ({
  emails: many(emails),
  campaignLeads: many(campaignLeads),
  scheduledEmails: many(scheduledEmails),
  workflow: one(workflows, {
    fields: [campaigns.workflowId],
    references: [workflows.id],
  }),
}));

export const campaignLeadsRelations = relations(campaignLeads, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignLeads.campaignId],
    references: [campaigns.id],
  }),
  lead: one(leads, {
    fields: [campaignLeads.leadId],
    references: [leads.id],
  }),
}));

export const emailsRelations = relations(emails, ({ one }) => ({
  lead: one(leads, {
    fields: [emails.leadId],
    references: [leads.id],
  }),
  campaign: one(campaigns, {
    fields: [emails.campaignId],
    references: [campaigns.id],
  }),
}));

export const scheduledEmailsRelations = relations(scheduledEmails, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [scheduledEmails.campaignId],
    references: [campaigns.id],
  }),
  lead: one(leads, {
    fields: [scheduledEmails.leadId],
    references: [leads.id],
  }),
  template: one(emailTemplates, {
    fields: [scheduledEmails.templateId],
    references: [emailTemplates.id],
  }),
  workflow: one(workflows, {
    fields: [scheduledEmails.workflowId],
    references: [workflows.id],
  }),
  sentEmail: one(emails, {
    fields: [scheduledEmails.emailId],
    references: [emails.id],
  }),
}));

export const leadSourceRoiRelations = relations(leadSourceRoi, ({ one }) => ({
  lead: one(leads, {
    fields: [leadSourceRoi.leadId],
    references: [leads.id],
  }),
}));

export const workflowsRelations = relations(workflows, ({ many }) => ({
  steps: many(workflowSteps),
  campaigns: many(campaigns),
}));

export const workflowStepsRelations = relations(workflowSteps, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowSteps.workflowId],
    references: [workflows.id],
  }),
  emailTemplate: one(emailTemplates, {
    fields: [workflowSteps.emailTemplateId],
    references: [emailTemplates.id],
  }),
}));
