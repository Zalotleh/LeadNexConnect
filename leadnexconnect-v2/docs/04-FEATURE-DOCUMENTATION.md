# Feature Documentation & User Workflows

**Last Updated:** December 4, 2025

---

## 🎯 Core Features

### 1. Lead Generation System

#### 1.1 Multi-Source Lead Generation

**Purpose:** Generate leads from multiple B2B data sources with enrichment

**Sources:**
- Apollo.io (B2B company & contact data)
- Google Places (Local business information)
- People Data Labs (Professional contact database)
- LinkedIn CSV Import (Manual uploads)
- Hunter.io (Email verification)

**How It Works:**

1. **User Selects Source & Criteria**
   - Choose API source (Apollo, Google Places, PDL)
   - Enter target industry (e.g., "salon", "spa", "clinic")
   - Enter location (country, city)
   - Set maximum results (1-100 leads)
   - Enable/disable email enrichment
   - Enable/disable website analysis

2. **System Generates Leads**
   ```typescript
   // Service: apps/api/src/services/lead-generation/apollo.service.ts
   
   async searchCompanies(criteria) {
     // 1. Call Apollo.io API
     const companies = await apolloAPI.search(criteria);
     
     // 2. For each company:
     for (company of companies) {
       // 3. Enrich email if enabled
       if (enrichEmail) {
         email = await hunterService.findEmail(company.domain);
       }
       
       // 4. Analyze website if enabled
       if (analyzeWebsite) {
         analysis = await websiteAnalyzer.analyze(company.website);
         // Detects: booking keywords, current tools (Calendly, etc.),
         // appointment forms, digital maturity
       }
       
       // 5. Calculate quality score (0-100)
       qualityScore = calculateLeadScore({
         hasEmail: 25 points,
         emailVerified: 25 points,
         hasWebsite: 15 points,
         hasBookingKeywords: 10 points,
         hasPhone: 10 points,
         hasGoogleMaps: 5 points,
         hasLinkedIn: 5 points,
         otherFactors: 5 points
       });
       
       // 6. Classify tier
       tier = qualityScore >= 80 ? 'hot' 
            : qualityScore >= 60 ? 'warm' 
            : 'cold';
       
       // 7. Save to database
       await db.insert(leads).values(leadData);
     }
   }
   ```

3. **Results Displayed**
   - Total leads generated
   - Quality distribution (Hot/Warm/Cold)
   - Average quality score
   - Leads with verified emails
   - Batch ID for tracking

**User Workflow:**
```
Dashboard → Leads Page → "Generate Leads" Button
  → Select Source (Apollo/Google/PDL)
  → Enter Industry & Location
  → Configure Options (email enrichment, website analysis)
  → Click "Generate"
  → Progress dialog shows
  → Results dialog shows summary
  → New leads appear in Leads table
```

**Technical Details:**
- **Controllers:** `apps/api/src/controllers/scraping.controller.ts`
- **Services:** 
  - `apps/api/src/services/lead-generation/apollo.service.ts`
  - `apps/api/src/services/lead-generation/google-places.service.ts`
  - `apps/api/src/services/lead-generation/peopledatalabs.service.ts`
  - `apps/api/src/services/enrichment/hunter.service.ts`
  - `apps/api/src/services/analysis/website-analyzer.service.ts`
- **Routes:** `POST /api/scraping/apollo`, `/google-places`, `/peopledatalabs`

---

#### 1.2 LinkedIn CSV Import

**Purpose:** Import leads from LinkedIn Sales Navigator exports

**How It Works:**

1. **User Uploads CSV**
   - Drag & drop or select CSV file
   - Preview first 5 rows
   - Name the batch
   - Choose enrichment options

2. **System Processes File**
   ```typescript
   // Service: apps/api/src/services/lead-generation/linkedin-import.service.ts
   
   async processCSV(file, options) {
     const rows = parseCSV(file);
     
     for (row of rows) {
       // 1. Extract data (company name, LinkedIn URL, etc.)
       leadData = extractLinkedInData(row);
       
       // 2. Check for duplicates (by email, website, or company name)
       const existing = await findDuplicate(leadData);
       if (existing) {
         duplicatesSkipped++;
         continue;
       }
       
       // 3. Enrich with Hunter.io if enabled
       if (options.enrichEmail && leadData.domain) {
         email = await hunterService.findEmail(leadData.domain);
       }
       
       // 4. Analyze website if enabled
       if (options.analyzeWebsite && leadData.website) {
         analysis = await websiteAnalyzer.analyze(leadData.website);
       }
       
       // 5. Calculate quality score
       leadData.qualityScore = calculateScore(leadData);
       
       // 6. Save to database
       await db.insert(leads).values(leadData);
       successfulImports++;
     }
   }
   ```

3. **Results Summary**
   - Total rows processed
   - Successful imports
   - Duplicates skipped
   - Failed imports (with error details)
   - Batch ID created

**Supported CSV Formats:**
- LinkedIn Sales Navigator export
- Custom CSV with columns: Company Name, Website, Email, Phone, Contact Name, Job Title, Location

**User Workflow:**
```
Leads Page → "Import CSV" Button
  → Upload file
  → Enter batch name
  → Enable enrichment options
  → Click "Import"
  → Progress shows
  → Results dialog with summary
  → Batch appears in "Batches" tab
```

---

### 2. Lead Scoring & Classification

#### 2.1 Quality Score Algorithm (100 Points)

**Purpose:** Automatically assess lead quality for prioritization

**Scoring Breakdown:**
```typescript
// Service: apps/api/src/services/crm/lead-scoring.service.ts

function calculateLeadScore(lead) {
  let score = 0;
  
  // Email Quality (50 points max)
  if (lead.email) score += 25;
  if (lead.verificationStatus === 'email_verified') score += 25;
  
  // Website & Digital Presence (15 points max)
  if (lead.website) score += 15;
  
  // Booking Intent Signals (10 points max)
  if (lead.hasBookingKeywords) score += 5;
  if (lead.bookingKeywordScore >= 5) score += 5;
  
  // Contact Information (10 points max)
  if (lead.phone) score += 10;
  
  // Online Presence (5 points max)
  if (lead.hasGoogleMapsListing) score += 5;
  
  // LinkedIn Profile (5 points max)
  if (lead.linkedinUrl) score += 5;
  
  return Math.min(score, 100);
}
```

**Tier Classification:**
- 🔥 **Hot** (80-100): Highest priority, immediate outreach
- ⚡ **Warm** (60-79): Good quality, standard outreach
- ❄️ **Cold** (<60): Lower priority, nurture campaigns

---

#### 2.2 Website Analysis

**Purpose:** Detect booking systems, digital maturity, and intent signals

**What It Analyzes:**
```typescript
// Service: apps/api/src/services/analysis/website-analyzer.service.ts

async analyzeWebsite(url) {
  const html = await fetchWebsite(url);
  const $ = cheerio.load(html);
  
  return {
    // Booking Tool Detection
    currentBookingTool: detectBookingTool($),
    // Detects: Calendly, Acuity, Square, Booksy, Fresha, 
    // Vagaro, Mindbody, Genbook
    
    // Booking Keywords (0-10 score)
    bookingKeywordScore: countBookingKeywords($),
    // Keywords: "book appointment", "schedule now", "book online",
    // "reserve now", "make appointment"
    
    // Forms & Features
    hasAppointmentForm: $('form[action*="appointment"]').length > 0,
    hasCalendar: detectCalendarWidget($),
    hasPricing: $('*:contains("price"), *:contains("$")').length > 10,
    hasGallery: $('img').length > 10,
    hasReviews: detectReviews($),
    hasContactForm: $('form[action*="contact"]').length > 0,
    
    // Business Intelligence
    multiLocation: detectMultipleLocations($),
    servicesCount: countServices($),
    
    // Digital Maturity Score (0-100)
    digitalMaturityScore: calculateMaturity({
      hasModernDesign,
      mobileResponsive,
      hasSSL,
      loadSpeed,
      hasOnlineBooking,
      hasSocialMedia
    })
  };
}
```

**Caching:**
- Results cached for 30 days in `websiteAnalysisCache` table
- Reduces API costs and improves performance

---

### 3. Smart Lead Routing

#### 3.1 Intelligent Campaign Assignment

**Purpose:** Automatically assign leads to appropriate campaigns based on characteristics

**Routing Scenarios:**

```typescript
// Service: apps/api/src/services/outreach/lead-routing.service.ts

function determineRoutingScenario(lead) {
  // Scenario 1: No Website → QR Code Campaign
  if (!lead.website || lead.hasPhoneOnly) {
    return {
      scenario: 'no_website_qr_code',
      campaignType: 'qr_code_pitch',
      priority: 'medium',
      reasoning: 'Needs digital presence, QR code is quick solution'
    };
  }
  
  // Scenario 2: Using Competitor → Switch Campaign
  if (lead.currentBookingTool && 
      lead.currentBookingTool !== 'BookNex') {
    return {
      scenario: 'competitor_tool',
      campaignType: 'competitor_switch',
      priority: 'high',
      reasoning: `Currently using ${lead.currentBookingTool}, show better features`
    };
  }
  
  // Scenario 3: Multi-Location → Enterprise Pitch
  if (lead.hasMultiLocation || lead.companySize === 'large') {
    return {
      scenario: 'multi_location',
      campaignType: 'enterprise_pitch',
      priority: 'high',
      reasoning: 'Multi-location needs centralized booking system'
    };
  }
  
  // Scenario 4: High Booking Intent → Fast Track
  if (lead.bookingPotential === 'high' && 
      lead.qualityScore >= 80) {
    return {
      scenario: 'hot_lead_fast_track',
      campaignType: 'premium_outreach',
      priority: 'urgent',
      reasoning: 'Hot lead with high intent, immediate personalized outreach'
    };
  }
  
  // Scenario 5: Phone-Only → Education First
  if (lead.phone && !lead.email) {
    return {
      scenario: 'phone_only_education',
      campaignType: 'educational_content',
      priority: 'low',
      reasoning: 'Needs email capture and education about online booking'
    };
  }
  
  // Scenario 6: High Quality → Standard Premium
  if (lead.qualityScore >= 60) {
    return {
      scenario: 'standard_outreach',
      campaignType: 'general_outreach',
      priority: 'medium',
      reasoning: 'Good quality lead, standard outreach sequence'
    };
  }
  
  // Default: Nurture Campaign
  return {
    scenario: 'low_quality_nurture',
    campaignType: 'long_term_nurture',
    priority: 'low',
    reasoning: 'Lower quality, needs nurturing over time'
  };
}
```

**How It's Used:**
- Daily outreach job checks new leads
- Routes them to appropriate campaigns
- Sends personalized first email based on scenario
- Schedules follow-ups based on engagement

---

### 4. Email Campaign Management

#### 4.1 Campaign Creation

**Two Types:**

**Manual Campaign:**
```
User selects specific leads
  → Creates campaign
  → Chooses workflow (email sequence)
  → Sets schedule
  → Campaign executes
```

**Automated Campaign:**
```
User sets criteria (industry, location)
  → Campaign generates leads daily
  → Applies smart routing
  → Sends emails automatically
  → Tracks engagement
```

**User Workflow:**
```
Campaigns Page → "Create Campaign" Button
  → Enter campaign name & description
  → Choose type (Manual/Automated)
  
  For Manual:
    → Select leads from list or batch
    → Choose workflow
    → Set schedule (immediate/scheduled/daily)
    
  For Automated:
    → Set lead generation criteria
    → Set leads per day limit
    → Choose lead sources (Apollo, Google, etc.)
    → Choose workflow
    → Set daily schedule time
  
  → Click "Create"
  → Campaign created with "Draft" status
  → Click "Start" to activate
```

---

#### 4.2 Multi-Step Workflows

**Purpose:** Automated email sequences with follow-ups

**How It Works:**

1. **User Creates Workflow**
   ```
   Workflows Page → "Create Workflow" Button
     → Enter workflow name
     → Choose number of steps (1-5)
     → For each step:
       - Enter email subject
       - Write email body (with variables)
       - Set days after previous (0 for first, 3/5/7 for follow-ups)
     → Save workflow
   ```

2. **AI-Generated Workflows** (Optional)
   ```
   Workflows Page → "Generate with AI" Button
     → Enter industry (salon, spa, clinic)
     → Enter country/region
     → Choose number of steps
     → Add special instructions
     → AI generates complete sequence
     → User can edit before saving
   ```

3. **Workflow Execution**
   ```typescript
   // Job: apps/api/src/jobs/daily-outreach.job.ts
   
   async executeWorkflow(campaign, lead) {
     const workflow = await getWorkflow(campaign.workflowId);
     const steps = workflow.steps.sort(by => stepNumber);
     
     for (step of steps) {
       // Calculate send time
       const sendAt = step.daysAfterPrevious === 0 
         ? now 
         : lastEmailSentAt + step.daysAfterPrevious days;
       
       // Substitute variables in email
       const email = {
         subject: substituteVariables(step.subject, lead),
         body: substituteVariables(step.body, lead),
         followUpStage: `follow_up_${step.stepNumber}`
       };
       
       // Queue email
       await emailQueueService.queueEmail(lead, email, sendAt);
     }
   }
   ```

**Example Workflow:**
```
Step 1 (Day 0): "Transform Your Salon Bookings"
  - Introduce BookNex
  - Highlight main benefits
  - CTA: Schedule demo

Step 2 (Day 3): "Quick Follow-up"
  - Check if they saw previous email
  - Share case study
  - CTA: Watch video demo

Step 3 (Day 7): "Last Chance"
  - Urgency: Limited offer
  - Social proof: testimonials
  - CTA: Book consultation
```

---

#### 4.3 Email Template System

**Purpose:** Reusable email templates with variable substitution

**Available Variables:**
```typescript
// Built-in Variables
{
  // Lead Info
  "{{companyName}}": "Example Salon",
  "{{contactName}}": "John",
  "{{email}}": "john@example.com",
  "{{phone}}": "+1-555-0123",
  "{{website}}": "https://example.com",
  "{{industry}}": "salon",
  "{{city}}": "New York",
  "{{country}}": "USA",
  
  // Company Info
  "{{yourCompanyName}}": "BookNex Solutions",
  "{{yourWebsite}}": "https://booknex.com",
  "{{yourPhone}}": "+1-800-BOOKNEX",
  
  // Dynamic Links
  "{{unsubscribeLink}}": "https://app.booknex.com/unsubscribe/...",
  "{{trackingPixel}}": "<img src='https://app.booknex.com/track/open/...' />",
  "{{demoBookingLink}}": "https://booknex.com/demo",
  
  // Custom Variables (user-defined)
  "{{customVariable}}": "Custom Value"
}
```

**Template Editor:**
- TinyMCE rich text editor
- Visual + HTML mode
- Variable insertion dropdown
- Live preview with sample data
- Save as reusable template

**User Workflow:**
```
Settings → Templates → "Create Template"
  → Enter template name
  → Choose category (Initial Outreach, Follow-up, etc.)
  → Choose industry (optional)
  → Write subject with variables
  → Write body in TinyMCE editor
    - Use toolbar to format
    - Insert variables from dropdown
    - Add images, links, tables
  → Preview with sample lead data
  → Save template
```

---

### 5. Email Delivery System

#### 5.1 Multi-SMTP Configuration

**Purpose:** Use multiple SMTP providers with automatic failover

**How It Works:**

1. **User Configures SMTP Providers**
   ```
   Settings → SMTP → "Add SMTP Provider"
     → Choose provider (Gmail, Outlook, SendGrid, Mailgun, SES, Custom)
     → Enter SMTP settings:
       - Host, Port, Security
       - Username, Password
       - From Email, From Name
     → Set limits (daily, hourly)
     → Set priority (1 = primary, 2 = backup)
     → Test connection
     → Save
   ```

2. **Smart SMTP Selection**
   ```typescript
   // Service: apps/api/src/services/outreach/email-sender.service.ts
   
   async selectSMTPProvider() {
     // Get all active SMTP configs, ordered by priority
     const providers = await getActiveSMTPProviders();
     
     for (provider of providers) {
       // Check if within limits
       if (provider.emailsSentToday < provider.dailyLimit &&
           provider.emailsSentThisHour < provider.hourlyLimit) {
         return provider;
       }
     }
     
     // All providers at limit
     throw new Error('All SMTP providers at daily/hourly limit');
   }
   ```

3. **Automatic Failover**
   ```typescript
   async sendEmail(emailData) {
     let lastError;
     
     // Try primary provider
     try {
       await primarySMTP.send(emailData);
       return success;
     } catch (error) {
       lastError = error;
       logger.warn('Primary SMTP failed, trying backup');
     }
     
     // Try backup providers
     for (backup of backupProviders) {
       try {
         await backup.send(emailData);
         return success;
       } catch (error) {
         lastError = error;
         continue;
       }
     }
     
     // All failed
     throw new Error(`All SMTP providers failed: ${lastError}`);
   }
   ```

**Rate Limiting:**
- Per-provider daily limits
- Per-provider hourly limits
- Automatic cooldown when limits reached
- Resets at midnight (daily) and top of hour (hourly)

---

#### 5.2 Email Tracking

**Implemented:**

**Open Tracking:**
```typescript
// 1x1 transparent pixel in email body
<img src="https://app.booknex.com/api/emails/track/open/{{emailId}}" 
     width="1" height="1" style="display:none" />

// Endpoint: GET /api/emails/track/open/:id
async trackOpen(req, res) {
  const { id } = req.params;
  
  // Update email record
  await db.update(emails)
    .set({
      status: 'opened',
      openedAt: new Date(),
      openCount: sql`open_count + 1`
    })
    .where(eq(emails.id, id));
  
  // Update lead engagement
  await updateLeadEngagement(emailId);
  
  // Return 1x1 transparent GIF
  res.setHeader('Content-Type', 'image/gif');
  res.send(trackingPixelBuffer);
}
```

**Click Tracking:**
```typescript
// Replace links in email with tracking URLs
Original: <a href="https://booknex.com/demo">Book Demo</a>
Tracked:  <a href="https://app.booknex.com/api/emails/track/click/{{emailId}}?url=https://booknex.com/demo">Book Demo</a>

// Endpoint: GET /api/emails/track/click/:id
async trackClick(req, res) {
  const { id } = req.params;
  const { url } = req.query;
  
  // Update email record
  await db.update(emails)
    .set({
      status: 'clicked',
      clickedAt: new Date(),
      clickCount: sql`click_count + 1`
    })
    .where(eq(emails.id, id));
  
  // Update lead engagement
  await updateLeadEngagement(emailId);
  
  // Redirect to actual URL
  res.redirect(302, url);
}
```

**Delivery Status:**
- Queued → Sent → Delivered → Opened → Clicked
- Bounced (hard/soft)
- Failed (with error message)
- Spam (reported)

**Not Implemented:**
- Reply detection (requires IMAP integration)
- Sentiment analysis (requires AI)
- Advanced engagement scoring

---

### 6. Analytics & Reporting

#### 6.1 Dashboard Metrics

**Real-Time Stats:**
```typescript
// Displayed on Dashboard page
{
  totalLeads: 1250,
  newLeadsToday: 48,
  newLeadsThisWeek: 285,
  activeCampaigns: 3,
  emailsSentToday: 120,
  emailsSentThisWeek: 650,
  
  // Tier Distribution
  tierDistribution: {
    hot: { count: 315, percent: 25.2 },
    warm: { count: 625, percent: 50.0 },
    cold: { count: 310, percent: 24.8 }
  },
  
  // Status Breakdown
  statusBreakdown: {
    new: 450,
    contacted: 380,
    follow_up_1: 180,
    follow_up_2: 95,
    responded: 95,
    interested: 45,
    converted: 15,
    not_interested: 120,
    invalid: 70
  },
  
  // Top Industries
  topIndustries: [
    { industry: 'salon', count: 420, percent: 33.6 },
    { industry: 'spa', count: 285, percent: 22.8 },
    { industry: 'clinic', count: 195, percent: 15.6 }
  ],
  
  // Recent Activity
  recentLeads: [...], // Last 10 leads
  recentCampaigns: [...], // Last 5 campaigns
  recentEmails: [...] // Last 10 emails sent
}
```

**Visualizations:**
- Lead generation timeline (Recharts line chart)
- Tier distribution (pie chart)
- Status breakdown (bar chart)
- Industry breakdown (bar chart)
- Campaign performance (table with metrics)

---

#### 6.2 Campaign Analytics

**Per-Campaign Metrics:**
```typescript
{
  campaignId: "uuid",
  name: "NYC Salons Outreach",
  
  // Core Metrics
  leadsTargeted: 95,
  emailsSent: 150,           // Initial + follow-ups
  emailsDelivered: 148,
  emailsOpened: 45,
  emailsClicked: 12,
  responsesReceived: 8,
  
  // Calculated Rates
  deliveryRate: 98.7,        // delivered / sent * 100
  openRate: 30.4,            // opened / delivered * 100
  clickRate: 8.1,            // clicked / opened * 100
  responseRate: 5.4,         // responded / sent * 100
  
  // Timeline Data
  timeline: [
    {
      date: "2025-12-01",
      emailsSent: 50,
      emailsOpened: 15,
      emailsClicked: 3,
      responses: 2
    },
    // ... daily breakdown
  ],
  
  // Lead Status Distribution
  leadStatusBreakdown: {
    new: 20,
    contacted: 45,
    follow_up_1: 15,
    responded: 8,
    converted: 2,
    not_interested: 5
  }
}
```

---

#### 6.3 API Performance Tracking

**Purpose:** Track ROI and efficiency of each lead generation source

**Monthly Reports:**
```typescript
{
  month: 12,
  year: 2025,
  sources: [
    {
      apiSource: "apollo",
      
      // Volume Metrics
      leadsGenerated: 450,
      emailsFound: 395,
      emailsVerified: 350,
      
      // Quality Metrics
      avgLeadScore: 74.5,
      hotLeadsPercent: 32.0,
      warmLeadsPercent: 48.0,
      coldLeadsPercent: 20.0,
      
      // Conversion Funnel
      demosBooked: 38,
      trialsStarted: 22,
      customersConverted: 8,
      
      // Cost Analysis
      apiCallsUsed: 450,
      apiCallsLimit: 1000,
      usagePercent: 45.0,
      costPerLead: 0.25,        // From user config
      totalCost: 112.50,
      
      // ROI Calculation (if conversions tracked)
      avgMRR: 199.00,           // Average MRR per converted customer
      totalRevenue: 1592.00,    // 8 customers × $199
      roi: 1315.56,             // (revenue - cost) / cost × 100
      
      // Status
      quotaStatus: "green"      // green (<70%), yellow (70-90%), red (>90%)
    },
    // ... other sources (google_places, peopledatalabs, hunter, linkedin)
  ],
  
  // Aggregated Totals
  totals: {
    leadsGenerated: 1250,
    totalCost: 450.00,
    avgCostPerLead: 0.36,
    customersConverted: 15,
    totalRevenue: 2985.00,
    overallROI: 563.33
  }
}
```

**User Workflow:**
```
Dashboard → API Performance Tab
  → View current month report
  → See usage vs limits (with color coding)
  → View ROI funnel visualization
  → Compare sources side-by-side
  → Click source to see detailed breakdown
  → Export report to CSV
```

---

### 7. Automation Jobs

#### 7.1 Daily Lead Generation Job

**Schedule:** Daily at configured time (default 9 AM)

**Purpose:** Automatically generate leads for active automated campaigns

```typescript
// Job: apps/api/src/jobs/daily-lead-generation.job.ts

async execute() {
  // 1. Get all active automated campaigns
  const campaigns = await getActiveCampaigns({ 
    campaignType: 'automated',
    scheduleType: 'daily'
  });
  
  for (campaign of campaigns) {
    // 2. Generate leads based on campaign criteria
    const leads = await generateLeads({
      sources: getEnabledSources(campaign),
      industry: campaign.industry,
      countries: campaign.targetCountries,
      cities: campaign.targetCities,
      maxResults: campaign.leadsPerDay
    });
    
    // 3. Link leads to campaign
    await linkLeadsToCampaign(leads, campaign);
    
    // 4. Update campaign metrics
    await updateCampaignMetrics(campaign);
  }
}
```

---

#### 7.2 Daily Outreach Job

**Schedule:** Hourly (checks campaign schedules)

**Purpose:** Send scheduled emails based on campaign configuration

```typescript
// Job: apps/api/src/jobs/daily-outreach.job.ts

async execute() {
  // 1. Get active campaigns with daily schedule
  const campaigns = await getActiveCampaigns({
    scheduleType: 'daily'
  });
  
  for (campaign of campaigns) {
    // 2. Check if it's time to run (match schedule hour)
    if (!shouldRunNow(campaign.scheduleTime)) continue;
    
    // 3. Get leads that need emails sent
    const leadsToContact = await getLeadsToContact(campaign);
    
    // 4. Apply smart routing
    for (lead of leadsToContact) {
      const routing = determineRoutingScenario(lead);
      
      // 5. Get appropriate workflow
      const workflow = await getWorkflowForScenario(routing);
      
      // 6. Generate and queue emails
      await executeWorkflow(campaign, lead, workflow);
    }
    
    // 7. Update campaign last run time
    await updateCampaignLastRun(campaign);
  }
}
```

---

#### 7.3 Follow-Up Checker Job

**Schedule:** Every 6 hours

**Purpose:** Send scheduled follow-up emails

```typescript
// Job: apps/api/src/jobs/follow-up-checker.job.ts

async execute() {
  const now = new Date();
  
  // 1. Find leads due for follow-up 1 (3 days after initial contact)
  const followUp1Leads = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.status, 'contacted'),
        lte(leads.lastContactedAt, now - 3 days)
      )
    );
  
  for (lead of followUp1Leads) {
    await sendFollowUpEmail(lead, 'follow_up_1');
    await updateLeadStatus(lead.id, 'follow_up_1');
  }
  
  // 2. Find leads due for follow-up 2 (5 days after follow-up 1)
  const followUp2Leads = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.status, 'follow_up_1'),
        lte(leads.lastContactedAt, now - 5 days)
      )
    );
  
  for (lead of followUp2Leads) {
    await sendFollowUpEmail(lead, 'follow_up_2');
    await updateLeadStatus(lead.id, 'follow_up_2');
  }
}
```

---

#### 7.4 Scheduled Campaigns Job

**Schedule:** Every 15 minutes

**Purpose:** Execute campaigns scheduled for specific date/time

```typescript
// Job: apps/api/src/jobs/scheduled-campaigns.job.ts

async execute() {
  const now = new Date();
  
  // Find campaigns scheduled to start now
  const scheduledCampaigns = await db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.status, 'draft'),
        eq(campaigns.scheduleType, 'scheduled'),
        lte(campaigns.startDate, now)
      )
    );
  
  for (campaign of scheduledCampaigns) {
    // Execute campaign
    await executeCampaign(campaign);
    
    // Update status to active
    await updateCampaignStatus(campaign.id, 'active');
  }
}
```

---

#### 7.5 API Performance Report Job

**Schedule:** First day of each month at 12 AM

**Purpose:** Generate monthly API performance reports

```typescript
// Job: apps/api/src/jobs/api-performance-report.job.ts

async execute() {
  const lastMonth = getLastMonth();
  
  // Calculate performance metrics for each API source
  const sources = ['apollo', 'google_places', 'peopledatalabs', 'hunter'];
  
  for (source of sources) {
    const metrics = await calculateMonthlyMetrics(source, lastMonth);
    
    await db.insert(apiPerformance).values({
      apiSource: source,
      ...metrics,
      periodStart: lastMonth.startDate,
      periodEnd: lastMonth.endDate
    });
  }
  
  // Send report email (if configured)
  await emailReportToAdmin();
}
```

---

## 🎨 User Experience Enhancements

### Inline Validation
- Real-time field validation in forms
- Error messages appear below fields
- Success indicators for valid inputs

### Progress Indicators
- Loading spinners for API calls
- Progress dialogs for long operations
- Percentage completion for batch processing

### Result Dialogs
- Summary dialogs after operations complete
- Success/error states clearly indicated
- Quick actions (view results, create campaign)

### Mobile Responsiveness
- All pages responsive on screens down to 375px (iPhone SE)
- Hamburger menu for mobile navigation
- Modal dialogs fit on small screens
- Touch-friendly button sizes

---

## 🔒 Security Features

### Input Validation
- Basic validation on API endpoints
- SQL injection prevention (via Drizzle ORM)
- XSS prevention (HTML escaping)

### Rate Limiting
- 100 requests per 15 minutes per IP
- Prevents API abuse

### Secure Headers
- Helmet.js for security headers
- CORS configuration
- CSP (Content Security Policy)

### Credential Management
- API keys encrypted in database
- SMTP passwords encrypted
- Sensitive data masked in UI

---

## 🚧 Limitations & Known Issues

See `09-KNOWN-ISSUES.md` for detailed list of:
- Missing features
- Bugs to fix
- Performance optimizations needed
- Testing gaps
