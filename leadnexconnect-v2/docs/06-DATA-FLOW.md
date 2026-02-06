# Data Flow & System Architecture

**Last Updated:** December 4, 2025

---

## 🔄 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│                     (Next.js + React)                       │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Dashboard │  │  Leads   │  │Campaigns │  │ Settings │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │             │              │              │         │
│       └─────────────┴──────────────┴──────────────┘        │
│                          │                                  │
│                   TanStack Query                           │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │
                    HTTP/JSON (Port 3000)
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                          ▼                                  │
│                     API ROUTER                              │
│                   (Express.js)                              │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │              Route Handlers                         │   │
│  │  /leads  /campaigns  /emails  /templates  /config  │   │
│  └───┬─────────────┬──────────────┬──────────────┬────┘   │
│      │             │              │              │         │
│      ▼             ▼              ▼              ▼         │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Controllers Layer                       │  │
│  │  LeadsCtrl  CampaignsCtrl  EmailsCtrl  ConfigCtrl   │  │
│  └───┬─────────────┬──────────────┬──────────────┬──────┘ │
│      │             │              │              │         │
│      ▼             ▼              ▼              ▼         │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Services Layer                          │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │  Lead Gen  │  │  Outreach  │  │   CRM      │    │  │
│  │  │  Services  │  │  Services  │  │  Services  │    │  │
│  │  └────────────┘  └────────────┘  └────────────┘    │  │
│  └───┬─────────────┬──────────────┬──────────────┬──────┘ │
│      │             │              │              │         │
└──────┼─────────────┼──────────────┼──────────────┼─────────┘
       │             │              │              │
       ▼             ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │Apollo.io │ │Google API│ │Hunter.io │ │OpenAI GPT│      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────┘
       │             │              │              │
       └─────────────┴──────────────┴──────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                          ▼                                  │
│                  DATABASE LAYER                             │
│                (PostgreSQL + Drizzle ORM)                   │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │  leads  │ │campaigns│ │ emails  │ │templates│         │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │workflows│ │apiConfig│ │smtpConfig│ │settings │         │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
└─────────────────────────────────────────────────────────────┘
       ▲
       │
┌──────┴───────────────────────────────────────────────────────┐
│                   BACKGROUND JOBS                             │
│              (Node-cron Scheduled Tasks)                      │
│                                                               │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ Daily Lead Gen │  │ Daily Outreach │  │ Follow-up     │ │
│  │   (9 AM)       │  │   (Hourly)     │  │   (6 hours)   │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagrams

### 1. Lead Generation Flow

```
User Action: Click "Generate Leads"
    │
    ▼
Frontend: GenerateLeadsModal
    │ (Select source, industry, location)
    │
    ▼
API: POST /api/scraping/apollo (or /google-places, /peopledatalabs)
    │
    ▼
Controller: scrapingController.generateFromApollo()
    │
    ▼
Service: apolloService.searchCompanies()
    │
    ├─► External API: Apollo.io API call
    │   └─► Returns: Company data (name, website, phone, etc.)
    │
    ├─► Service: hunterService.findEmail() [If email enrichment enabled]
    │   └─► External API: Hunter.io API call
    │       └─► Returns: Email + verification status
    │
    ├─► Service: websiteAnalyzer.analyze() [If website analysis enabled]
    │   ├─► Fetch website HTML
    │   ├─► Parse with Cheerio
    │   ├─► Detect booking tools
    │   ├─► Count booking keywords
    │   └─► Calculate digital maturity
    │
    ├─► Service: leadScoringService.calculateScore()
    │   ├─► Score email quality (50 pts)
    │   ├─► Score website presence (15 pts)
    │   ├─► Score booking intent (10 pts)
    │   ├─► Score contact info (10 pts)
    │   └─► Returns: Quality score (0-100) + Tier (Hot/Warm/Cold)
    │
    ├─► Service: deduplicationService.checkDuplicate()
    │   └─► Check database for existing leads by email/website/company
    │
    └─► Database: Insert into leads table
        └─► Also insert into leadBatches table (if batch import)
            │
            ▼
        Database: Create batch record
            │
            ▼
Response: Return to frontend
    │ { batchId, leadsGenerated, avgScore, tierDistribution }
    │
    ▼
Frontend: Show ResultDialog with summary
    │
    ▼
Frontend: Refresh leads table
    │
    ▼
End: New leads visible in Leads page
```

---

### 2. Campaign Execution Flow

```
User Action: Click "Execute Campaign" or Scheduled Time Reached
    │
    ▼
API: POST /api/campaigns/:id/execute
    │
    ▼
Controller: campaignsController.executeCampaignEndpoint()
    │
    ▼
Service: Get campaign details + workflow
    │
    ├─► Database: SELECT campaign + workflow + steps
    │   └─► Returns: Campaign config, workflow with 3 steps
    │
    ├─► Database: SELECT leads linked to campaign
    │   └─► Returns: Array of leads to contact
    │
    └─► For each lead:
        │
        ├─► Service: leadRoutingService.determineRoutingScenario()
        │   ├─► Analyze lead characteristics
        │   ├─► Determine best campaign type
        │   └─► Returns: Routing decision
        │
        ├─► Service: emailGeneratorService.generateEmail()
        │   ├─► Get workflow step 1
        │   ├─► Substitute variables:
        │   │   - {{companyName}} → "Example Salon"
        │   │   - {{contactName}} → "John"
        │   │   - {{industry}} → "salon"
        │   ├─► Add tracking pixel
        │   ├─► Add unsubscribe link
        │   └─► Returns: Personalized email
        │
        ├─► Service: emailQueueService.queueEmail()
        │   ├─► Create email record (status: queued)
        │   ├─► Schedule step 2 for +3 days
        │   ├─► Schedule step 3 for +5 days after step 2
        │   └─► Database: INSERT into emails table
        │
        └─► Service: emailSenderService.sendEmail()
            │
            ├─► Service: selectSMTPProvider()
            │   ├─► Get active SMTP configs
            │   ├─► Check daily/hourly limits
            │   └─► Returns: Best available SMTP provider
            │
            ├─► External: SMTP provider sends email
            │   └─► Gmail/SendGrid/Mailgun/etc.
            │
            ├─► Update email status: sent
            │   └─► Database: UPDATE emails SET status='sent', sentAt=now
            │
            ├─► Update lead status: contacted
            │   └─► Database: UPDATE leads SET status='contacted', lastContactedAt=now
            │
            └─► Update campaign metrics
                └─► Database: UPDATE campaigns SET emailsSent++
                    │
                    ▼
Response: Return to frontend
    │ { success: true, emailsQueued: 50, leadsProcessed: 50 }
    │
    ▼
Frontend: Show success message
    │
    ▼
End: Emails sent, follow-ups scheduled
```

---

### 3. Email Tracking Flow

#### Open Tracking:
```
Email Sent → Recipient opens email
    │
    ▼
Email client loads tracking pixel
    │ <img src="https://app.booknex.com/api/emails/track/open/abc123" />
    │
    ▼
API: GET /api/emails/track/open/:id
    │
    ▼
Controller: emailsController.trackOpen()
    │
    ├─► Database: UPDATE emails
    │   SET status='opened', openedAt=now, openCount++
    │
    ├─► Database: UPDATE leads
    │   SET emailsOpened++
    │
    └─► Database: UPDATE campaigns
        SET emailsOpened++
        │
        ▼
Response: Return 1x1 transparent GIF
    │
    ▼
End: Open tracked, metrics updated
```

#### Click Tracking:
```
Email Sent → Recipient clicks link
    │ <a href="https://app.booknex.com/api/emails/track/click/abc123?url=https://booknex.com/demo">
    │
    ▼
API: GET /api/emails/track/click/:id?url=...
    │
    ▼
Controller: emailsController.trackClick()
    │
    ├─► Database: UPDATE emails
    │   SET status='clicked', clickedAt=now, clickCount++
    │
    ├─► Database: UPDATE leads
    │   SET emailsClicked++
    │
    └─► Database: UPDATE campaigns
        SET emailsClicked++
        │
        ▼
Response: HTTP 302 Redirect to actual URL
    │
    ▼
End: Click tracked, user redirected to destination
```

---

### 4. Background Jobs Flow

#### Daily Lead Generation Job:
```
Cron: Every day at 9 AM
    │
    ▼
Job: daily-lead-generation.job.execute()
    │
    ├─► Database: SELECT campaigns
    │   WHERE status='active' AND campaignType='automated' AND scheduleType='daily'
    │   └─► Returns: Active automated campaigns
    │
    └─► For each campaign:
        │
        ├─► Determine lead sources (Apollo, Google, PDL)
        │
        ├─► Call appropriate API services
        │   └─► generateLeads(industry, location, maxResults=leadsPerDay)
        │
        ├─► Database: INSERT leads
        │
        ├─► Database: INSERT campaignLeads (link leads to campaign)
        │
        └─► Database: UPDATE campaigns SET leadsGenerated++
            │
            ▼
End: New leads generated and linked to campaigns
```

#### Daily Outreach Job:
```
Cron: Every hour (checks campaign schedules)
    │
    ▼
Job: daily-outreach.job.execute()
    │
    ├─► Database: SELECT campaigns
    │   WHERE status='active' AND scheduleType='daily'
    │   └─► Returns: Active daily campaigns
    │
    └─► For each campaign:
        │
        ├─► Check if current hour matches campaign.scheduleTime
        │   └─► If not, skip to next campaign
        │
        ├─► Database: SELECT leads
        │   WHERE campaignId = campaign.id AND status='new'
        │   └─► Returns: Leads needing initial contact
        │
        └─► For each lead:
            │
            ├─► Determine routing scenario
            │
            ├─► Get workflow
            │
            ├─► Generate personalized emails
            │
            ├─► Queue emails for all workflow steps
            │
            └─► Send first email immediately
                │
                ▼
End: Outreach emails sent, follow-ups scheduled
```

#### Follow-Up Checker Job:
```
Cron: Every 6 hours
    │
    ▼
Job: follow-up-checker.job.execute()
    │
    ├─► Check Follow-up 1 (3 days after initial)
    │   │
    │   ├─► Database: SELECT leads
    │   │   WHERE status='contacted' AND lastContactedAt <= now - 3 days
    │   │   └─► Returns: Leads due for follow-up 1
    │   │
    │   └─► For each lead:
    │       ├─► Get follow-up email template
    │       ├─► Generate personalized email
    │       ├─► Send email
    │       └─► Update lead status to 'follow_up_1'
    │
    ├─► Check Follow-up 2 (5 days after follow-up 1)
    │   │
    │   ├─► Database: SELECT leads
    │   │   WHERE status='follow_up_1' AND lastContactedAt <= now - 5 days
    │   │   └─► Returns: Leads due for follow-up 2
    │   │
    │   └─► For each lead:
    │       ├─► Get follow-up email template
    │       ├─► Generate personalized email
    │       ├─► Send email
    │       └─► Update lead status to 'follow_up_2'
    │
    ▼
End: Follow-up emails sent
```

---

## 🔄 State Management

### Frontend State (React)

**Page-Level State:**
- Local React state for UI (modals open/closed, selected items)
- Form state managed by React Hook Form
- No global state management (no Redux/Zustand)

**Server State:**
- TanStack Query (React Query) for all API data
- Automatic caching, refetching, and synchronization
- Query keys for cache invalidation

Example:
```typescript
// useLeadsData.ts hook
const { data: leads, isLoading, refetch } = useQuery({
  queryKey: ['leads', filters],
  queryFn: () => api.getLeads(filters),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// After creating a lead, invalidate cache
await api.createLead(data);
queryClient.invalidateQueries({ queryKey: ['leads'] });
```

---

### Backend State

**No In-Memory State:**
- All state stored in PostgreSQL
- Stateless API (no sessions)
- Can scale horizontally

**Job State:**
- Cron jobs track last run time in database
- Email queue managed in database
- SMTP provider limits tracked in database

---

## 📦 Service Layer Architecture

### Service Categories:

**1. Lead Generation Services** (`apps/api/src/services/lead-generation/`)
- `apollo.service.ts` - Apollo.io integration
- `google-places.service.ts` - Google Places API
- `peopledatalabs.service.ts` - People Data Labs API
- `linkedin-import.service.ts` - CSV import processing

**2. Enrichment Services** (`apps/api/src/services/enrichment/`)
- `hunter.service.ts` - Email finding & verification
- `email-verification.service.ts` - Email validation logic

**3. Analysis Services** (`apps/api/src/services/analysis/`)
- `website-analyzer.service.ts` - Website scraping & analysis
- Detects booking tools, keywords, forms, maturity score

**4. CRM Services** (`apps/api/src/services/crm/`)
- `lead-scoring.service.ts` - Quality score calculation
- `deduplication.service.ts` - Duplicate detection
- `lead-manager.service.ts` - CRUD operations

**5. Outreach Services** (`apps/api/src/services/outreach/`)
- `email-generator.service.ts` - Email content generation
- `email-sender.service.ts` - SMTP delivery
- `email-queue.service.ts` - Email queue management
- `lead-routing.service.ts` - Smart routing logic

**6. AI Services** (`apps/api/src/services/ai/`)
- `openai.service.ts` - GPT-4 integration for email generation
- `content-generator.service.ts` - AI content utilities

**7. Tracking Services** (`apps/api/src/services/tracking/`)
- `api-performance.service.ts` - API usage tracking
- `roi-calculator.service.ts` - ROI analysis

---

## 🔒 Error Handling

### API Error Responses:
```typescript
try {
  // Operation
  const result = await someOperation();
  res.json({ success: true, data: result });
} catch (error) {
  logger.error('Operation failed:', error);
  res.status(500).json({
    success: false,
    error: error.message,
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
}
```

### Frontend Error Handling:
```typescript
// useQuery error handling
const { data, error, isError } = useQuery({
  queryKey: ['leads'],
  queryFn: api.getLeads,
  retry: 3,
  onError: (error) => {
    toast.error(`Failed to load leads: ${error.message}`);
  }
});

// Mutation error handling
const mutation = useMutation({
  mutationFn: api.createLead,
  onError: (error) => {
    setInlineError(`Failed to create lead: ${error.message}`);
  },
  onSuccess: () => {
    toast.success('Lead created successfully');
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  }
});
```

---

## 🚀 Performance Optimizations

### Database:
- Indexes on frequently queried columns (status, source, qualityScore)
- JSONB columns for flexible metadata
- Drizzle ORM with prepared statements

### Caching:
- Website analysis cached for 30 days
- API config cached in memory (ConfigService)
- Frontend TanStack Query caching (5 min staleTime)

### API:
- Rate limiting to prevent abuse
- Pagination on list endpoints
- Selective field queries (only fetch needed data)

### Frontend:
- Next.js SSR for initial page load
- Code splitting per route
- Image optimization with Next/Image
- TanStack Query for request deduplication

---

## 📝 Logging

**Winston Logger:**
```typescript
// apps/api/src/utils/logger.ts

logger.info('Lead generated', { leadId, source, qualityScore });
logger.warn('Email verification failed', { email, error });
logger.error('SMTP delivery failed', { error, leadId });
```

**Log Levels:**
- `error` - Errors that need attention
- `warn` - Warning conditions
- `info` - Informational messages
- `http` - HTTP request logs
- `debug` - Debug messages (development only)

**Log Files:**
- `logs/error.log` - Errors only
- `logs/combined.log` - All logs
- Console output in development

---

## 🔌 External API Integration

### API Configuration:
```typescript
// Stored in apiConfig table
{
  apiSource: 'apollo',
  apiKey: 'sk-...',
  planName: 'Professional',
  monthlyLimit: 1000,
  costPerLead: 0.25,
  isActive: true
}
```

### Usage Tracking:
```typescript
// Before API call
await checkApiLimit('apollo'); // Throws if over limit

// Make API call
const results = await apolloAPI.search(criteria);

// After API call
await trackApiUsage('apollo', results.length);
```

### Error Handling:
- Retry logic (3 attempts with exponential backoff)
- Fallback to alternative sources if available
- Log all API failures for debugging

---

## 📊 Database Connection

**Connection Pool:**
```typescript
// packages/database/src/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool);
```

**Migration Management:**
```bash
# Apply migrations
npm run db:push

# Generate new migration
npm run db:generate

# Seed database
npm run db:seed
```

---

## 🔄 Request/Response Cycle

### Typical API Request:
```
1. Client: axios.post('/api/leads/generate', { data })
2. Frontend: TanStack Query handles request
3. Next.js API Proxy: /api route forwards to Express
4. Express Router: Matches /api/leads/generate route
5. Rate Limiter: Checks request count
6. Controller: leadsController.generateLeads()
7. Service: apolloService.searchCompanies()
8. External API: Apollo.io API call
9. Service: Process and enrich data
10. Database: Insert leads
11. Controller: Return response
12. Express: Send JSON response
13. Frontend: TanStack Query caches response
14. Component: Re-renders with new data
```

**Average Response Times:**
- Database queries: 10-50ms
- External API calls: 500-2000ms
- Total API response: <3000ms for lead generation
- Frontend page load: <2000ms initial, <500ms navigation
