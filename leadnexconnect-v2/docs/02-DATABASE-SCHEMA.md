# Database Schema Documentation

**Last Updated:** December 4, 2025  
**Database:** PostgreSQL 15+  
**ORM:** Drizzle ORM  

---

## 📊 Schema Overview

**Total Tables:** 18  
**Total Relationships:** 12  
**Location:** `packages/database/src/schema/index.ts`

---

## 🗂️ Core Tables

### 1. `leads` - Lead Information & Scoring

**Purpose:** Central table storing all lead data, scoring, and engagement metrics

**Key Fields:**
```typescript
id: uuid (Primary Key)
companyName: varchar(255) NOT NULL
website: varchar(255)
email: varchar(255)
phone: varchar(50)
contactName: varchar(255)
jobTitle: varchar(255)
country: varchar(100)
city: varchar(100)
address: text
industry: varchar(100) NOT NULL
businessType: varchar(100)
companySize: varchar(50)

// Lead Source & Quality
source: varchar(50) NOT NULL           // apollo, hunter, google_places, linkedin, manual
sourceType: varchar(50)                // automated, manual_import
batchId: uuid                          // References leadBatches
qualityScore: integer (0-100)
verificationStatus: enum               // unverified, email_verified, phone_verified, fully_verified

// Outreach Status
status: enum                           // new, contacted, follow_up_1, follow_up_2, responded, interested, not_interested, invalid, converted
followUpStage: varchar(50)
lastContactedAt: timestamp
lastRespondedAt: timestamp

// Engagement Metrics
emailsSent: integer
emailsOpened: integer
emailsClicked: integer

// Digital Presence (Phase 1 Enhancement)
hasGoogleMapsListing: boolean
googleRating: decimal(3,2)
googleReviewCount: integer

// Website Analysis (Phase 2 Enhancement)
hasBookingKeywords: boolean
bookingKeywordScore: integer (0-10)
currentBookingTool: varchar(100)       // calendly, acuity, square, etc.
hasAppointmentForm: boolean
hasOnlineBooking: boolean
hasMultiLocation: boolean
servicesCount: integer

// Qualification Signals (Phase 2 Enhancement)
bookingPotential: varchar(20)          // low, medium, high
digitalMaturityScore: integer (0-100)
isDecisionMaker: boolean

// Business Intelligence
hasWeekendHours: boolean
responseTime: varchar(50)
priceLevel: integer (1-4)              // From Google Places

// Metadata
notes: text
tags: varchar(100)[]
customFields: jsonb
linkedinUrl: varchar(500)
linkedinSalesNavData: jsonb

createdAt: timestamp
updatedAt: timestamp
```

**Indexes:**
- Primary Key on `id`
- Index on `source` for filtering
- Index on `status` for campaign queries
- Index on `qualityScore` for tier filtering
- Index on `batchId` for batch analytics

**Relationships:**
- `emails` (one-to-many)
- `campaignLeads` (one-to-many)
- `leadSourceRoi` (one-to-many)
- `batch` (many-to-one via batchId)

---

### 2. `campaigns` - Campaign Configuration

**Purpose:** Store campaign settings, scheduling, and metrics

**Key Fields:**
```typescript
id: uuid (Primary Key)
name: varchar(255) NOT NULL
description: text
campaignType: varchar(50)              // automated, manual
batchId: uuid                          // Which batch generated leads

// Target Criteria
industry: varchar(100)
targetCountries: varchar(100)[]
targetCities: varchar(100)[]
companySize: varchar(50)

// Configuration
leadsPerDay: integer (default: 50)
emailTemplateId: uuid
workflowId: uuid                       // References workflows
followUpEnabled: boolean
followUp1DelayDays: integer (default: 3)
followUp2DelayDays: integer (default: 5)

// Scheduling
status: enum                           // draft, active, paused, completed, archived
scheduleType: enum                     // manual, immediate, scheduled, daily, weekly, custom
scheduleTime: varchar(10)              // HH:MM format
startDate: timestamp
endDate: timestamp

// Lead Sources
usesLinkedin: boolean
usesApollo: boolean
usesPeopleDL: boolean
usesGooglePlaces: boolean
usesWebScraping: boolean

// Metrics
leadsGenerated: integer
emailsSent: integer
emailsOpened: integer
emailsClicked: integer
responsesReceived: integer

lastRunAt: timestamp
createdAt: timestamp
updatedAt: timestamp
```

**Relationships:**
- `emails` (one-to-many)
- `campaignLeads` (one-to-many)
- `workflow` (many-to-one)

---

### 3. `emails` - Email Tracking

**Purpose:** Track all sent emails with delivery and engagement metrics

**Key Fields:**
```typescript
id: uuid (Primary Key)
leadId: uuid NOT NULL                  // References leads
campaignId: uuid                       // References campaigns

// Content
subject: varchar(500) NOT NULL
bodyText: text NOT NULL
bodyHtml: text

// Classification
followUpStage: varchar(50)             // initial, follow_up_1, follow_up_2

// Status & Tracking
status: enum                           // queued, sent, delivered, opened, clicked, bounced, failed, spam
sentAt: timestamp
deliveredAt: timestamp
openedAt: timestamp
clickedAt: timestamp
bouncedAt: timestamp

errorMessage: text
externalId: varchar(255)               // Email provider's message ID
openCount: integer
clickCount: integer

metadata: jsonb                        // Additional tracking data

createdAt: timestamp
```

**Relationships:**
- `lead` (many-to-one)
- `campaign` (many-to-one)

---

### 4. `campaignLeads` - Campaign-Lead Many-to-Many

**Purpose:** Link leads to campaigns for manual campaign management

**Key Fields:**
```typescript
id: uuid (Primary Key)
campaignId: uuid NOT NULL
leadId: uuid NOT NULL
addedAt: timestamp
processed: boolean
processedAt: timestamp
```

---

### 5. `emailTemplates` - Email Templates

**Purpose:** Reusable email templates with variables

**Key Fields:**
```typescript
id: uuid (Primary Key)
name: varchar(255) NOT NULL
description: text
category: enum                         // initial_outreach, follow_up, meeting_request, introduction, product_demo, partnership, general, other
industry: varchar(100)
followUpStage: varchar(50)

// Content
subject: varchar(500) NOT NULL
bodyText: text NOT NULL
bodyHtml: text
variables: jsonb                       // Available variables for this template

isActive: boolean
isDefault: boolean
usageCount: integer

createdAt: timestamp
updatedAt: timestamp
```

---

### 6. `workflows` - Multi-Step Email Sequences

**Purpose:** Define email workflows with multiple steps

**Key Fields:**
```typescript
id: uuid (Primary Key)
name: varchar(255) NOT NULL
description: text
stepsCount: integer                    // Number of emails in sequence
industry: varchar(100)
country: varchar(100)
aiInstructions: text                   // For AI-generated content

isActive: boolean
usageCount: integer

createdAt: timestamp
updatedAt: timestamp
```

**Relationships:**
- `steps` (one-to-many to workflowSteps)
- `campaigns` (one-to-many)

---

### 7. `workflowSteps` - Individual Workflow Emails

**Purpose:** Define each email step in a workflow

**Key Fields:**
```typescript
id: uuid (Primary Key)
workflowId: uuid NOT NULL
stepNumber: integer NOT NULL           // 1, 2, 3, etc.
daysAfterPrevious: integer             // 0 for first, N days for follow-ups
subject: varchar(500) NOT NULL
body: text NOT NULL

createdAt: timestamp
```

**Relationships:**
- `workflow` (many-to-one)

---

## 📈 Enhancement Tables (Phase 1-3)

### 8. `apiPerformance` - API Performance Tracking

**Purpose:** Monthly performance metrics per API source

**Key Fields:**
```typescript
id: uuid (Primary Key)
apiSource: varchar(50) NOT NULL        // apollo, hunter, google_places, linkedin

// Lead Metrics
leadsGenerated: integer
leadsConverted: integer
emailsFound: integer
emailsVerified: integer

// Quality Metrics
avgLeadScore: decimal(5,2)
hotLeadsPercent: decimal(5,2)
warmLeadsPercent: decimal(5,2)

// Conversion Tracking
demosBooked: integer
trialsStarted: integer
customersConverted: integer

// Cost Analysis
apiCallsUsed: integer
apiCallsLimit: integer
costPerLead: decimal(10,2)

// Time Period
periodStart: date NOT NULL
periodEnd: date NOT NULL

createdAt: timestamp
```

---

### 9. `leadSourceRoi` - Lead Source ROI Tracking

**Purpose:** Track individual lead journey and revenue

**Key Fields:**
```typescript
id: uuid (Primary Key)
leadId: uuid NOT NULL
source: varchar(50) NOT NULL

// Journey Tracking
firstContactAt: timestamp
demoBookedAt: timestamp
trialStartedAt: timestamp
convertedAt: timestamp

// Revenue
planType: varchar(50)                  // basic, business, premium
mrr: decimal(10,2)
lifetimeValue: decimal(10,2)

// Attribution
attributedSource: varchar(50)
conversionTimeDays: integer

createdAt: timestamp
```

**Relationships:**
- `lead` (many-to-one)

---

### 10. `websiteAnalysisCache` - Website Analysis Cache

**Purpose:** Cache website analysis results (30-day TTL)

**Key Fields:**
```typescript
id: uuid (Primary Key)
domain: varchar(255) NOT NULL UNIQUE

// Analysis Results
hasBookingKeywords: boolean
bookingKeywordScore: integer
currentBookingTool: varchar(100)
hasAppointmentForm: boolean
hasCalendar: boolean
hasPricing: boolean
hasGallery: boolean
hasReviews: boolean
hasContactForm: boolean
hasPhoneOnly: boolean
multiLocation: boolean
servicesCount: integer
languageSupport: varchar(255)[]

analysisData: jsonb                    // Raw scraped data

// Cache Control
lastAnalyzedAt: timestamp
expiresAt: timestamp                   // 30 days from analysis

createdAt: timestamp
```

---

### 11. `leadBatches` - CSV Import Tracking

**Purpose:** Track batch imports from CSV/LinkedIn

**Key Fields:**
```typescript
id: uuid (Primary Key)
name: varchar(255) NOT NULL
sourceFile: varchar(255)
uploadedBy: varchar(255)

// Metrics
totalLeads: integer
successfulImports: integer
failedImports: integer
duplicatesSkipped: integer

importSettings: jsonb                  // Enrichment flags, mapping config
notes: text

createdAt: timestamp
completedAt: timestamp
```

**Relationships:**
- `leads` (one-to-many)

---

## ⚙️ Configuration Tables

### 12. `customVariables` - Custom Email Variables

**Purpose:** User-defined variables for email personalization

**Key Fields:**
```typescript
id: uuid (Primary Key)
key: varchar(100) NOT NULL UNIQUE      // e.g., 'companyRevenue'
label: varchar(255) NOT NULL           // e.g., 'Company Revenue'
value: varchar(255) NOT NULL           // e.g., '{{companyRevenue}}'
category: varchar(50)                  // lead, company, link, custom
description: text
usageCount: integer
isActive: boolean
defaultValue: varchar(500)

createdAt: timestamp
updatedAt: timestamp
```

---

### 13. `apiConfig` - API Configuration

**Purpose:** User-defined API keys and limits

**Key Fields:**
```typescript
id: uuid (Primary Key)
apiSource: varchar(50) NOT NULL UNIQUE // apollo, hunter, google_places, peopledatalabs

apiKey: varchar(500)
apiSecret: varchar(500)
planName: varchar(100)
monthlyLimit: integer
costPerLead: decimal(10,2)
costPerAPICall: decimal(10,2)

isActive: boolean
documentationUrl: varchar(500)
setupNotes: text

createdAt: timestamp
updatedAt: timestamp
```

---

### 14. `smtpConfig` - SMTP Configuration

**Purpose:** Multiple SMTP providers with failover

**Key Fields:**
```typescript
id: uuid (Primary Key)
provider: varchar(100) NOT NULL        // gmail, outlook, sendgrid, mailgun, ses, custom
providerName: varchar(100) NOT NULL

// SMTP Settings
host: varchar(255) NOT NULL
port: integer NOT NULL
secure: boolean                        // Use TLS
username: varchar(255)
password: varchar(500)
fromEmail: varchar(255) NOT NULL
fromName: varchar(255)

// Limits
dailyLimit: integer
hourlyLimit: integer

// Status & Priority
isActive: boolean
isPrimary: boolean                     // Primary SMTP
priority: integer                      // Failover order

documentationUrl: varchar(500)
setupNotes: text

// Usage Tracking
emailsSentToday: integer
emailsSentThisHour: integer
lastResetAt: timestamp

createdAt: timestamp
updatedAt: timestamp
```

---

## 🔧 System Tables

### 15. `scrapingJobs` - Web Scraping Jobs

```typescript
id: uuid (Primary Key)
source: varchar(50) NOT NULL           // yelp, yellow_pages, etc.
industry: varchar(100)
country: varchar(100)
city: varchar(100)
maxResults: integer
filters: jsonb

status: enum                           // queued, running, completed, failed, cancelled
progress: integer
leadsFound: integer
leadsImported: integer

errorMessage: text
resultsJson: jsonb

startedAt: timestamp
completedAt: timestamp
createdAt: timestamp
```

---

### 16. `apiUsage` - API Usage Tracking

```typescript
id: uuid (Primary Key)
service: varchar(50) NOT NULL
requestsMade: integer
requestsLimit: integer
periodStart: timestamp NOT NULL
periodEnd: timestamp NOT NULL
cost: integer

createdAt: timestamp
updatedAt: timestamp
```

---

### 17. `settings` - System Settings

```typescript
id: uuid (Primary Key)
key: varchar(100) NOT NULL UNIQUE
value: jsonb NOT NULL
updatedAt: timestamp
```

---

### 18. `activityLog` - Activity Logging

```typescript
id: uuid (Primary Key)
entityType: varchar(50) NOT NULL       // lead, campaign, email, etc.
entityId: uuid NOT NULL
action: varchar(100) NOT NULL          // created, updated, deleted, sent, opened, etc.
description: text
metadata: jsonb

createdAt: timestamp
```

---

## 🔗 Relationships Summary

```
leads
  ├── emails (1:N)
  ├── campaignLeads (1:N)
  ├── leadSourceRoi (1:N)
  └── batch (N:1) → leadBatches

campaigns
  ├── emails (1:N)
  ├── campaignLeads (1:N)
  └── workflow (N:1) → workflows

workflows
  ├── steps (1:N) → workflowSteps
  └── campaigns (1:N)

campaignLeads
  ├── campaign (N:1)
  └── lead (N:1)

emails
  ├── lead (N:1)
  └── campaign (N:1)

leadSourceRoi
  └── lead (N:1)

workflowSteps
  └── workflow (N:1)

leadBatches
  └── leads (1:N)
```

---

## 🎯 Key Design Decisions

1. **UUID Primary Keys**: Better for distributed systems, harder to predict
2. **JSONB Fields**: Flexible metadata storage without schema migrations
3. **Enum Types**: Enforce valid status values at database level
4. **Timestamp Tracking**: All entities have `createdAt`, most have `updatedAt`
5. **Soft Deletes**: Consider adding `deletedAt` for audit trail (not implemented)
6. **Denormalization**: Some metrics duplicated for performance (e.g., campaign metrics)

---

## 📝 Migration Files

Location: `packages/database/src/migrations/`

**Apply Migrations:**
```bash
cd packages/database
npm run db:push
```

**Generate New Migration:**
```bash
npm run db:generate
```
