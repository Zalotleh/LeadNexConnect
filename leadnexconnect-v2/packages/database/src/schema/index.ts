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
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const campaigns = pgTable('campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Basic Info
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Target Criteria
  industry: varchar('industry', { length: 100 }),
  targetCountries: varchar('target_countries', { length: 100 }).array(),
  targetCities: varchar('target_cities', { length: 100 }).array(),
  companySize: varchar('company_size', { length: 50 }),
  
  // Configuration
  leadsPerDay: integer('leads_per_day').default(50),
  emailTemplateId: uuid('email_template_id'),
  followUpEnabled: boolean('follow_up_enabled').default(true),
  followUp1DelayDays: integer('follow_up_1_delay_days').default(3),
  followUp2DelayDays: integer('follow_up_2_delay_days').default(5),
  
  // Scheduling
  status: campaignStatusEnum('status').default('draft'),
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
  
  // Metrics
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

export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Basic Info
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
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

// Relations
export const leadsRelations = relations(leads, ({ many }) => ({
  emails: many(emails),
}));

export const campaignsRelations = relations(campaigns, ({ many }) => ({
  emails: many(emails),
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
