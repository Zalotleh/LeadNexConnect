# API Endpoints Documentation

**Last Updated:** December 4, 2025  
**Base URL:** `http://localhost:5000/api` (Development)  
**Total Endpoints:** 82+

---

## 📋 API Routes Overview

### Route Files Location
`apps/api/src/routes/`

- `leads.routes.ts` - Lead management (10 endpoints)
- `campaigns.routes.ts` - Campaign management (12 endpoints)
- `emails.routes.ts` - Email management (6 endpoints)
- `templates.routes.ts` - Template CRUD (6 endpoints)
- `workflows.routes.ts` - Workflow management (5 endpoints)
- `custom-variables.routes.ts` - Variable management (6 endpoints)
- `analytics.routes.ts` - Analytics & reporting (3 endpoints)
- `api-performance.routes.ts` - API performance (3 endpoints)
- `scraping.routes.ts` - Lead generation (6 endpoints)
- `settings.routes.ts` - System settings (5 endpoints)
- `config.routes.ts` - API & SMTP config (14 endpoints)
- `ai.routes.ts` - AI services (2 endpoints)
- `testing.routes.ts` - Testing utilities (6 endpoints)

---

## 👥 Leads API

### `GET /api/leads`
Get all leads with optional filters

**Query Parameters:**
```typescript
{
  status?: string           // new, contacted, follow_up_1, etc.
  source?: string          // apollo, hunter, google_places, linkedin
  industry?: string
  qualityScore?: number    // Minimum score
  tier?: string           // hot, warm, cold
  search?: string         // Search company name, email
  limit?: number
  offset?: number
}
```

**Response:**
```json
{
  "leads": [
    {
      "id": "uuid",
      "companyName": "Example Corp",
      "email": "contact@example.com",
      "qualityScore": 85,
      "status": "new",
      "source": "apollo",
      "industry": "salon",
      "bookingPotential": "high",
      "digitalMaturityScore": 78,
      "createdAt": "2025-12-01T10:00:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

---

### `GET /api/leads/:id`
Get single lead by ID

**Response:**
```json
{
  "id": "uuid",
  "companyName": "Example Corp",
  "website": "https://example.com",
  "email": "contact@example.com",
  "phone": "+1-555-0123",
  "contactName": "John Smith",
  "jobTitle": "Owner",
  "country": "USA",
  "city": "New York",
  "industry": "salon",
  "qualityScore": 85,
  "verificationStatus": "email_verified",
  "status": "contacted",
  "source": "apollo",
  "hasBookingKeywords": true,
  "currentBookingTool": "calendly",
  "bookingPotential": "high",
  "digitalMaturityScore": 78,
  "emailsSent": 2,
  "emailsOpened": 1,
  "createdAt": "2025-12-01T10:00:00Z",
  "updatedAt": "2025-12-02T14:30:00Z"
}
```

---

### `POST /api/leads`
Create a new lead manually

**Request Body:**
```json
{
  "companyName": "Example Corp",
  "website": "https://example.com",
  "email": "contact@example.com",
  "phone": "+1-555-0123",
  "contactName": "John Smith",
  "jobTitle": "Owner",
  "country": "USA",
  "city": "New York",
  "industry": "salon",
  "source": "manual",
  "notes": "Met at conference"
}
```

**Response:** Created lead object

---

### `PUT /api/leads/:id`
Update a lead

**Request Body:** Partial lead object

**Response:** Updated lead object

---

### `DELETE /api/leads/:id`
Delete a lead

**Response:**
```json
{
  "success": true,
  "message": "Lead deleted successfully"
}
```

---

### `POST /api/leads/generate`
Generate leads from API sources

**Request Body:**
```json
{
  "source": "apollo",           // apollo, google_places, peopledatalabs
  "industry": "salon",
  "country": "USA",
  "city": "New York",
  "maxResults": 50,
  "batchName": "NYC Salons - Dec 2025",
  "enrichEmail": true,
  "analyzeWebsite": true
}
```

**Response:**
```json
{
  "success": true,
  "batchId": "uuid",
  "leadsGenerated": 48,
  "leadsWithEmail": 42,
  "avgQualityScore": 72,
  "tierDistribution": {
    "hot": 15,
    "warm": 23,
    "cold": 10
  }
}
```

---

### `POST /api/leads/import`
Import leads from LinkedIn CSV

**Request Body:** `multipart/form-data`
```
file: CSV file
batchName: string
enrichEmail: boolean
analyzeWebsite: boolean
```

**Response:**
```json
{
  "success": true,
  "batchId": "uuid",
  "totalRows": 100,
  "successfulImports": 95,
  "failedImports": 2,
  "duplicatesSkipped": 3,
  "errors": [
    {
      "row": 5,
      "error": "Missing company name"
    }
  ]
}
```

---

### `GET /api/leads/batches`
Get all import batches

**Response:**
```json
{
  "batches": [
    {
      "id": "uuid",
      "name": "NYC Salons - Dec 2025",
      "sourceFile": "linkedin_export.csv",
      "totalLeads": 95,
      "successfulImports": 95,
      "failedImports": 0,
      "duplicatesSkipped": 0,
      "createdAt": "2025-12-01T10:00:00Z"
    }
  ]
}
```

---

### `GET /api/leads/batches/:id/analytics`
Get batch analytics

**Response:**
```json
{
  "batchId": "uuid",
  "name": "NYC Salons - Dec 2025",
  "totalLeads": 95,
  "qualityDistribution": {
    "hot": 28,
    "warm": 45,
    "cold": 22
  },
  "avgQualityScore": 68,
  "emailVerificationRate": 89,
  "statusBreakdown": {
    "new": 50,
    "contacted": 30,
    "responded": 10,
    "converted": 5
  },
  "campaignsCreated": 2
}
```

---

### `DELETE /api/leads/batches/:id`
Delete an entire batch and all its leads

**Response:**
```json
{
  "success": true,
  "leadsDeleted": 95
}
```

---

### `GET /api/leads/export`
Export leads to CSV

**Query Parameters:**
```typescript
{
  status?: string
  source?: string
  industry?: string
  batchId?: string
}
```

**Response:** CSV file download

---

## 📧 Campaigns API

### `GET /api/campaigns`
Get all campaigns

**Response:**
```json
{
  "campaigns": [
    {
      "id": "uuid",
      "name": "NYC Salons Outreach",
      "status": "active",
      "campaignType": "manual",
      "industry": "salon",
      "leadsPerDay": 50,
      "scheduleType": "daily",
      "scheduleTime": "09:00",
      "leadsGenerated": 95,
      "emailsSent": 150,
      "emailsOpened": 45,
      "responsesReceived": 8,
      "createdAt": "2025-12-01T10:00:00Z"
    }
  ]
}
```

---

### `GET /api/campaigns/:id`
Get single campaign

**Response:** Full campaign object with all details

---

### `POST /api/campaigns`
Create a new campaign

**Request Body:**
```json
{
  "name": "NYC Salons Outreach",
  "description": "Initial outreach to NYC salons",
  "industry": "salon",
  "targetCountries": ["USA"],
  "targetCities": ["New York"],
  "leadsPerDay": 50,
  "workflowId": "uuid",
  "followUpEnabled": true,
  "followUp1DelayDays": 3,
  "followUp2DelayDays": 5,
  "scheduleType": "daily",
  "scheduleTime": "09:00",
  "startDate": "2025-12-01T00:00:00Z"
}
```

**Response:** Created campaign object

---

### `POST /api/campaigns/from-batch`
Create campaign from an imported batch

**Request Body:**
```json
{
  "batchId": "uuid",
  "name": "NYC Salons Batch Campaign",
  "workflowId": "uuid",
  "scheduleType": "immediate"
}
```

**Response:** Created campaign with linked leads

---

### `POST /api/campaigns/:id/leads`
Add leads to a campaign

**Request Body:**
```json
{
  "leadIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "success": true,
  "leadsAdded": 3
}
```

---

### `GET /api/campaigns/:id/leads`
Get all leads in a campaign

**Response:**
```json
{
  "leads": [
    {
      "id": "uuid",
      "companyName": "Example Corp",
      "email": "contact@example.com",
      "status": "contacted",
      "addedAt": "2025-12-01T10:00:00Z",
      "processed": true,
      "processedAt": "2025-12-01T11:00:00Z"
    }
  ],
  "total": 95
}
```

---

### `PUT /api/campaigns/:id`
Update campaign

**Request Body:** Partial campaign object

**Response:** Updated campaign

---

### `POST /api/campaigns/:id/execute`
Execute campaign immediately (send emails now)

**Response:**
```json
{
  "success": true,
  "emailsQueued": 50,
  "leadsProcessed": 50
}
```

---

### `POST /api/campaigns/:id/start`
Start/activate a campaign

**Response:**
```json
{
  "success": true,
  "status": "active"
}
```

---

### `POST /api/campaigns/:id/pause`
Pause a campaign

**Response:**
```json
{
  "success": true,
  "status": "paused"
}
```

---

### `DELETE /api/campaigns/:id`
Delete a campaign

**Response:**
```json
{
  "success": true
}
```

---

### `GET /api/campaigns/:id/email-schedule`
Get email schedule for campaign (what emails will be sent when)

**Response:**
```json
{
  "schedule": [
    {
      "leadId": "uuid",
      "companyName": "Example Corp",
      "stepNumber": 1,
      "subject": "Initial Outreach",
      "scheduledFor": "2025-12-05T09:00:00Z",
      "status": "queued"
    },
    {
      "leadId": "uuid",
      "companyName": "Example Corp",
      "stepNumber": 2,
      "subject": "Follow-up #1",
      "scheduledFor": "2025-12-08T09:00:00Z",
      "status": "pending"
    }
  ]
}
```

---

## 📨 Emails API

### `GET /api/emails`
Get all emails with filters

**Query Parameters:**
```typescript
{
  leadId?: string
  campaignId?: string
  status?: string          // queued, sent, delivered, opened, clicked, bounced
  followUpStage?: string
  limit?: number
  offset?: number
}
```

**Response:**
```json
{
  "emails": [
    {
      "id": "uuid",
      "leadId": "uuid",
      "campaignId": "uuid",
      "subject": "Transform Your Salon Bookings",
      "status": "opened",
      "followUpStage": "initial",
      "sentAt": "2025-12-01T09:00:00Z",
      "openedAt": "2025-12-01T10:30:00Z",
      "openCount": 2,
      "clickCount": 1
    }
  ],
  "total": 150
}
```

---

### `GET /api/emails/:id`
Get single email

**Response:** Full email object with content

---

### `POST /api/emails/send`
Send an email immediately

**Request Body:**
```json
{
  "leadId": "uuid",
  "campaignId": "uuid",
  "templateId": "uuid",
  "subject": "Custom Subject",
  "bodyText": "Email content...",
  "bodyHtml": "<p>Email content...</p>",
  "followUpStage": "initial"
}
```

**Response:**
```json
{
  "success": true,
  "emailId": "uuid",
  "status": "sent"
}
```

---

### `GET /api/emails/track/open/:id`
Email open tracking pixel

**Response:** 1x1 transparent GIF

---

### `GET /api/emails/track/click/:id`
Email click tracking redirect

**Query Parameters:**
```
url: string (destination URL)
```

**Response:** HTTP 302 redirect to destination

---

## 📝 Templates API

### `GET /api/templates`
Get all templates

**Query Parameters:**
```typescript
{
  category?: string        // initial_outreach, follow_up, meeting_request, etc.
  industry?: string
  followUpStage?: string
  isActive?: boolean
}
```

**Response:**
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "Initial Salon Outreach",
      "category": "initial_outreach",
      "industry": "salon",
      "subject": "Transform Your {{companyName}} Bookings",
      "bodyText": "Hi {{contactName}}...",
      "isActive": true,
      "usageCount": 25,
      "createdAt": "2025-11-20T10:00:00Z"
    }
  ]
}
```

---

### `GET /api/templates/:id`
Get single template

**Response:** Full template object

---

### `POST /api/templates`
Create template

**Request Body:**
```json
{
  "name": "Initial Salon Outreach",
  "description": "First contact for salon owners",
  "category": "initial_outreach",
  "industry": "salon",
  "followUpStage": "initial",
  "subject": "Transform Your {{companyName}} Bookings",
  "bodyText": "Hi {{contactName}}...",
  "bodyHtml": "<p>Hi {{contactName}}...</p>",
  "variables": ["companyName", "contactName", "industry"]
}
```

**Response:** Created template

---

### `PUT /api/templates/:id`
Update template

**Request Body:** Partial template object

**Response:** Updated template

---

### `DELETE /api/templates/:id`
Delete template

**Response:**
```json
{
  "success": true
}
```

---

### `POST /api/templates/:id/use`
Increment usage count (called when template is used)

**Response:**
```json
{
  "success": true,
  "usageCount": 26
}
```

---

## 🔄 Workflows API

### `GET /api/workflows`
Get all workflows

**Response:**
```json
{
  "workflows": [
    {
      "id": "uuid",
      "name": "Salon 3-Step Sequence",
      "description": "Initial + 2 follow-ups",
      "stepsCount": 3,
      "industry": "salon",
      "isActive": true,
      "usageCount": 5,
      "createdAt": "2025-11-25T10:00:00Z"
    }
  ]
}
```

---

### `GET /api/workflows/:id`
Get workflow with all steps

**Response:**
```json
{
  "id": "uuid",
  "name": "Salon 3-Step Sequence",
  "stepsCount": 3,
  "steps": [
    {
      "id": "uuid",
      "stepNumber": 1,
      "daysAfterPrevious": 0,
      "subject": "Transform Your Bookings",
      "body": "Hi {{contactName}}..."
    },
    {
      "id": "uuid",
      "stepNumber": 2,
      "daysAfterPrevious": 3,
      "subject": "Quick Follow-up",
      "body": "Just checking in..."
    }
  ]
}
```

---

### `POST /api/workflows/generate`
Generate workflow using AI

**Request Body:**
```json
{
  "name": "Spa Outreach Sequence",
  "stepsCount": 3,
  "industry": "spa",
  "country": "USA",
  "aiInstructions": "Focus on wellness and relaxation benefits"
}
```

**Response:** Created workflow with AI-generated steps

---

### `PUT /api/workflows/:id`
Update workflow

**Request Body:** Workflow object with steps

**Response:** Updated workflow

---

### `DELETE /api/workflows/:id`
Delete workflow

**Response:**
```json
{
  "success": true
}
```

---

## 🔧 Custom Variables API

### `GET /api/custom-variables`
Get all custom variables

**Response:**
```json
{
  "variables": [
    {
      "id": "uuid",
      "key": "companyRevenue",
      "label": "Company Revenue",
      "value": "{{companyRevenue}}",
      "category": "company",
      "description": "Estimated annual revenue",
      "usageCount": 12,
      "isActive": true,
      "defaultValue": "N/A"
    }
  ]
}
```

---

### `GET /api/custom-variables/:id`
Get single variable

---

### `POST /api/custom-variables`
Create variable

**Request Body:**
```json
{
  "key": "companyRevenue",
  "label": "Company Revenue",
  "category": "company",
  "description": "Estimated annual revenue",
  "defaultValue": "N/A"
}
```

---

### `PUT /api/custom-variables/:id`
Update variable

---

### `DELETE /api/custom-variables/:id`
Delete variable

---

### `POST /api/custom-variables/:id/use`
Increment usage count

---

## 📊 Analytics API

### `GET /api/analytics/dashboard`
Get dashboard statistics

**Response:**
```json
{
  "totalLeads": 1250,
  "newLeadsToday": 48,
  "activeCampaigns": 3,
  "emailsSentToday": 120,
  "tierDistribution": {
    "hot": 315,
    "warm": 625,
    "cold": 310
  },
  "statusBreakdown": {
    "new": 450,
    "contacted": 380,
    "responded": 95,
    "interested": 45,
    "converted": 15
  },
  "topIndustries": [
    { "industry": "salon", "count": 420 },
    { "industry": "spa", "count": 285 }
  ]
}
```

---

### `GET /api/analytics/campaigns/:id`
Get campaign analytics

**Response:**
```json
{
  "campaignId": "uuid",
  "name": "NYC Salons Outreach",
  "leadsTargeted": 95,
  "emailsSent": 150,
  "emailsDelivered": 148,
  "emailsOpened": 45,
  "emailsClicked": 12,
  "responsesReceived": 8,
  "deliveryRate": 98.7,
  "openRate": 30.4,
  "clickRate": 8.1,
  "responseRate": 5.4,
  "timeline": [
    {
      "date": "2025-12-01",
      "emailsSent": 50,
      "emailsOpened": 15,
      "responses": 2
    }
  ]
}
```

---

### `GET /api/analytics/leads/timeline`
Get leads generation timeline

**Query Parameters:**
```typescript
{
  startDate?: string
  endDate?: string
  groupBy?: string       // day, week, month
}
```

**Response:**
```json
{
  "timeline": [
    {
      "date": "2025-12-01",
      "leadsGenerated": 48,
      "avgQualityScore": 72,
      "hotLeads": 15,
      "warmLeads": 23,
      "coldLeads": 10
    }
  ]
}
```

---

## 📈 API Performance API

### `GET /api/api-performance/report`
Get monthly API performance report

**Query Parameters:**
```typescript
{
  month?: number         // 1-12
  year?: number         // 2025
}
```

**Response:**
```json
{
  "month": 12,
  "year": 2025,
  "sources": [
    {
      "apiSource": "apollo",
      "leadsGenerated": 450,
      "emailsFound": 395,
      "avgLeadScore": 74,
      "hotLeadsPercent": 32,
      "apiCallsUsed": 450,
      "apiCallsLimit": 1000,
      "costPerLead": 0.25,
      "totalCost": 112.50
    }
  ]
}
```

---

### `POST /api/api-performance/conversion`
Update conversion data for ROI tracking

**Request Body:**
```json
{
  "leadId": "uuid",
  "demoBooked": true,
  "trialStarted": true,
  "converted": false
}
```

---

### `GET /api/api-performance/roi`
Get ROI summary

**Response:**
```json
{
  "totalLeadsGenerated": 1250,
  "totalCost": 450.00,
  "demosBooked": 85,
  "trialsStarted": 45,
  "customersConverted": 15,
  "avgMRR": 199.00,
  "totalRevenue": 2985.00,
  "roi": 563.33
}
```

---

## ⚙️ Settings & Config APIs

### Settings API (`/api/settings`)

- `GET /api/settings` - Get all settings
- `GET /api/settings/unmasked/:key` - Get unmasked value
- `PUT /api/settings` - Update settings
- `POST /api/settings/test-smtp` - Test SMTP connection
- `POST /api/settings/clear-cache` - Clear cache

### Config API (`/api/config`)

**API Configuration:**
- `GET /api/config/apis` - Get all API configs
- `GET /api/config/apis/:apiSource` - Get config (masked)
- `GET /api/config/apis/:apiSource/unmasked` - Get config (unmasked)
- `POST /api/config/apis` - Create/update API config
- `DELETE /api/config/apis/:apiSource` - Delete API config

**SMTP Configuration:**
- `GET /api/config/smtp` - Get all SMTP configs
- `GET /api/config/smtp/:id` - Get SMTP config (masked)
- `GET /api/config/smtp/:id/unmasked` - Get config (unmasked)
- `POST /api/config/smtp` - Create SMTP config
- `PUT /api/config/smtp/:id` - Update SMTP config
- `DELETE /api/config/smtp/:id` - Delete SMTP config
- `POST /api/config/smtp/test` - Test SMTP connection

---

## 🤖 AI API

### `POST /api/ai/generate-email`
Generate email content using AI

**Request Body:**
```json
{
  "leadData": {
    "companyName": "Example Spa",
    "industry": "spa",
    "contactName": "Jane",
    "bookingPotential": "high"
  },
  "instructions": "Focus on relaxation benefits",
  "followUpStage": "initial"
}
```

**Response:**
```json
{
  "subject": "Transform How Clients Book at Example Spa",
  "bodyText": "Hi Jane...",
  "bodyHtml": "<p>Hi Jane...</p>"
}
```

---

### `GET /api/ai/test`
Test AI connection

**Response:**
```json
{
  "status": "connected",
  "model": "gpt-4",
  "working": true
}
```

---

## 🧪 Testing API (`/api/testing`)

**Development/Testing Endpoints:**
- `POST /api/testing/generate-test-leads` - Generate fake leads
- `POST /api/testing/preview-email` - Preview email with variable substitution
- `POST /api/testing/dry-run-workflow` - Simulate workflow execution
- `POST /api/testing/send-test-email` - Send test email
- `GET /api/testing/email-schedule/:campaignId` - View email schedule
- `DELETE /api/testing/cleanup-test-data` - Delete test data

---

## 🔒 Security & Rate Limiting

**Implemented:**
- Helmet.js for security headers
- CORS configuration
- Rate limiting (100 requests/15 minutes per IP)
- API key validation for external API calls
- Input validation (basic)

**Not Implemented:**
- User authentication (no login system)
- API key authentication
- Role-based access control
- Advanced input sanitization

---

## 📝 Response Format

**Success Response:**
```json
{
  "data": { ... },
  "success": true
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "success": false,
  "details": { ... }
}
```

**HTTP Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request
- 404: Not Found
- 500: Server Error
