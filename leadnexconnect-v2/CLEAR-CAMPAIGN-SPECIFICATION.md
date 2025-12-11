# 🎯 CRYSTAL CLEAR CAMPAIGN SPECIFICATION

## 🚨 READ THIS FIRST - NO HALLUCINATIONS ALLOWED

This document provides **exact, unambiguous specifications** for the 3 campaign types. Follow this **exactly as written**.

---

## 📋 Current Problem

**What exists now:** Campaigns are confusing - lead generation and email sending are mixed together in one flow.

**What we need:** Complete separation into 3 distinct campaign types, each with its own tab and purpose.

---

## 🎯 THE 3 CAMPAIGN TYPES (EXACT DEFINITIONS)

### **Type 1: Lead Generation Campaigns**

**Purpose:** Generate leads and save them to batches. **THAT'S IT. NO EMAILS SENT.**

**What it does:**
1. User configures: industry, location, sources (Apollo, Google Places, etc.)
2. User sets: max leads per run, schedule (one-time or recurring)
3. Campaign runs → generates leads → saves to `leadBatches` table
4. Campaign creates a **batch record** with generated leads
5. Batch appears in:
   - Leads → Batches tab
   - This campaign's details page
6. **NO EMAILS ARE SENT** - this is only for lead generation

**Database:**
```typescript
// Campaign record
{
  campaignType: 'lead_generation',
  name: 'Spa Leads Generator - New York',
  industry: 'spa',
  country: 'United States',
  city: 'New York',
  leadSources: ['apollo', 'google_places'],
  maxResultsPerRun: 100,
  isRecurring: true,
  recurringInterval: 'daily',
  endDate: '2025-12-31',
  
  // NO email-related fields
  workflowId: null,
  emailTemplateId: null,
  batchIds: null,  // This campaign CREATES batches, doesn't use them
}
```

**UI Location:** `/pages/campaigns/index.tsx` - Tab 1: "Lead Generation"

**What user sees:**
- List of lead generation campaigns
- Each campaign shows:
  - Name
  - Industry & location
  - Sources used
  - Total leads generated
  - Number of batches created
  - Schedule (if recurring)
  - Status (draft, running, paused, completed)
- Buttons: Create, Start/Pause, View Batches, Settings

**API Endpoints:**
- `GET /api/campaigns?type=lead_generation` - List all lead gen campaigns
- `POST /api/campaigns` with `campaignType: 'lead_generation'` - Create new
- `POST /api/campaigns/:id/start` - Start generating leads
- `POST /api/campaigns/:id/pause` - Pause recurring generation

**Key Point:** This type NEVER touches emails. It only creates lead batches.

---

### **Type 2: Outreach Campaigns**

**Purpose:** Send emails to existing leads/batches. **NO LEAD GENERATION HERE.**

**What it does:**
1. User selects EXISTING leads:
   - Option A: Select one or more batches from `leadBatches` table
   - Option B: Select individual leads manually (filter by industry, score, etc.)
2. User chooses email strategy:
   - Option A: Single email template
   - Option B: Multi-step workflow (existing workflow from `workflows` table)
3. User sets: campaign name, start type (manual/scheduled), start date/time
4. Campaign starts → schedules emails → sends via `scheduled_emails` table
5. **NO LEAD GENERATION** - only sends emails to leads that already exist

**Database:**
```typescript
// Campaign record
{
  campaignType: 'outreach',
  name: 'Spa Outreach - Batch #123',
  
  // Lead source (MUST have one of these)
  batchIds: ['batch-uuid-1', 'batch-uuid-2'],  // Selected batches
  // OR
  leadIds: ['lead-uuid-1', 'lead-uuid-2'],     // Manually selected leads
  
  // Email strategy (MUST have one of these)
  useWorkflow: true,
  workflowId: 'workflow-uuid',
  // OR
  useWorkflow: false,
  emailTemplateId: 'template-uuid',
  
  startType: 'scheduled',
  scheduledStartAt: '2025-12-15T09:00:00Z',
  
  // NO lead generation fields
  leadSources: null,
  maxResultsPerRun: null,
  isRecurring: null,  // Outreach campaigns run once
}
```

**UI Location:** `/pages/campaigns/index.tsx` - Tab 2: "Outreach"

**What user sees:**
- List of outreach campaigns
- Each campaign shows:
  - Name
  - Batches/leads targeted
  - Workflow or template used
  - Progress: X/Y emails sent
  - Stats: opens, clicks, replies
  - Status (draft, scheduled, running, paused, completed)
- Buttons: Create, Start/Pause/Resume, View Details, Analytics

**Create Outreach Campaign Flow:**

**Path 1: From Campaigns Tab**
1. Click "New Outreach Campaign" in Outreach tab
2. Step 1: Select leads
   - Radio buttons: "Select Batches" OR "Select Individual Leads"
   - If batches: Show list of available batches (from `leadBatches` table)
   - If individual: Show lead filters (industry, status, score, etc.)
3. Step 2: Choose email strategy
   - Radio buttons: "Single Email" OR "Multi-Step Workflow"
   - If single: Dropdown of email templates (from `emailTemplates` table)
   - If workflow: Dropdown of workflows (from `workflows` table)
4. Step 3: Campaign settings
   - Name
   - Start type: Manual or Scheduled
   - If scheduled: Date & time picker
5. Step 4: Review & Create
   - Show summary: X leads, Y emails will be sent
   - Button: "Create Campaign"

**Path 2: From Batch Detail Page**
1. In `/pages/leads/batches/[id].tsx`
2. Click "Create Outreach Campaign" button
3. Opens campaign creation with THIS batch pre-selected (skip step 1)
4. Continue from step 2 (choose email strategy)

**API Endpoints:**
- `GET /api/campaigns?type=outreach` - List all outreach campaigns
- `GET /api/lead-batches` - List available batches (for campaign creation)
- `POST /api/campaigns` with `campaignType: 'outreach'` - Create new
- `POST /api/campaigns/:id/start` - Start sending emails
- `POST /api/campaigns/:id/pause` - Pause sending
- `POST /api/campaigns/:id/resume` - Resume paused campaign

**Key Point:** This type NEVER generates leads. It only sends emails to existing leads.

---

### **Type 3: Fully Automated Campaigns**

**Purpose:** Do BOTH lead generation AND email outreach automatically on a schedule.

**What it does:**
1. User configures BOTH:
   - Lead generation settings (industry, location, sources, max leads)
   - Email outreach settings (workflow or template, delay after generation)
2. User sets schedule: daily, every 2 days, etc. + end date
3. Campaign runs on schedule:
   - **Step A:** Generate leads → save to batch
   - **Step B:** Wait X days (configurable delay, 0 = immediate)
   - **Step C:** Start outreach campaign for that batch
4. Repeat until end date reached
5. Each run creates:
   - New batch in `leadBatches` table
   - New outreach campaign linked to that batch

**Database:**
```typescript
// Campaign record
{
  campaignType: 'fully_automated',
  name: 'Spa Full Auto - Daily',
  
  // PART 1: Lead Generation Config
  industry: 'spa',
  country: 'United States',
  city: 'New York',
  leadSources: ['apollo', 'google_places'],
  maxResultsPerRun: 50,
  
  // PART 2: Outreach Config
  outreachDelayDays: 0,  // 0 = send immediately, 1 = wait 1 day, etc.
  useWorkflow: true,
  workflowId: 'workflow-uuid',
  // OR
  useWorkflow: false,
  emailTemplateId: 'template-uuid',
  
  // PART 3: Automation Schedule
  isRecurring: true,
  recurringInterval: 'daily',
  nextRunAt: '2025-12-15T09:00:00Z',
  endDate: '2025-12-31T23:59:59Z',
  
  // Tracking
  totalRunsCompleted: 5,
  totalLeadsGenerated: 250,
  totalEmailsSent: 750,  // If 3-step workflow
}
```

**Additional Table: `automated_campaign_runs`**
Track each individual run of the automated campaign:

```typescript
CREATE TABLE automated_campaign_runs (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  run_number INTEGER,
  
  -- Lead generation results
  batch_id UUID REFERENCES lead_batches(id),
  leads_generated INTEGER,
  
  -- Outreach campaign created
  outreach_campaign_id UUID REFERENCES campaigns(id),
  
  -- Status
  status VARCHAR(20), -- 'pending', 'generating_leads', 'outreach_started', 'completed', 'failed'
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**UI Location:** `/pages/campaigns/index.tsx` - Tab 3: "Fully Automated"

**What user sees:**
- List of automated campaigns
- Each campaign shows:
  - Name
  - Industry & schedule (e.g., "Spa - Daily")
  - Lead gen: X leads/run from Y sources
  - Outreach: Workflow or template
  - Total stats: Runs completed, total leads, total emails
  - Next run time
  - Status (draft, running, paused, completed)
- Buttons: Create, Start/Pause, View Run History, Settings

**Create Fully Automated Campaign Flow:**
1. Click "New Automated Campaign"
2. Step 1: Lead Generation Settings
   - Industry, location
   - Sources (checkboxes: Apollo, Google Places, etc.)
   - Max leads per run
3. Step 2: Outreach Settings
   - Delay after generation: 0, 1, 2, 3... days
   - Email strategy: Single template OR Workflow
4. Step 3: Schedule
   - Frequency: Daily, Every 2 days, Every 3 days, Weekly
   - Start date & time
   - End date (required)
5. Step 4: Review & Create
   - Show summary of full automation
   - Example timeline of what will happen
   - Button: "Create Automated Campaign"

**API Endpoints:**
- `GET /api/campaigns?type=fully_automated` - List all automated campaigns
- `POST /api/campaigns` with `campaignType: 'fully_automated'` - Create new
- `POST /api/campaigns/:id/start` - Start automation
- `POST /api/campaigns/:id/pause` - Pause (stops future runs)
- `GET /api/campaigns/:id/runs` - Get run history

**Key Point:** This type does BOTH - generates leads AND sends emails, automatically.

---

## 🗂️ File Structure (Pages Router)

```
pages/
├── campaigns/
│   ├── index.tsx                          # Main page with 3 tabs
│   ├── create-lead-generation.tsx         # Form to create Type 1
│   ├── create-outreach.tsx                # Form to create Type 2
│   ├── create-automated.tsx               # Form to create Type 3
│   └── [id]/
│       ├── index.tsx                      # Campaign detail page
│       └── edit.tsx                       # Edit campaign
├── workflows/
│   ├── index.tsx                          # Workflows list
│   ├── create.tsx                         # Create workflow
│   └── [id]/
│       └── edit.tsx                       # Edit workflow
└── leads/
    └── batches/
        ├── index.tsx                      # Batches list
        └── [id].tsx                       # Batch detail + "Create Outreach" button

components/
├── campaigns/
│   ├── LeadGenerationTab.tsx              # Tab 1 content
│   ├── OutreachTab.tsx                    # Tab 2 content
│   ├── FullyAutomatedTab.tsx              # Tab 3 content
│   ├── CreateLeadGenerationForm.tsx       # Form for Type 1
│   ├── CreateOutreachForm.tsx             # Form for Type 2
│   └── CreateAutomatedForm.tsx            # Form for Type 3
└── workflows/
    ├── WorkflowList.tsx
    ├── WorkflowBuilder.tsx                # Manual workflow builder
    └── WorkflowStepEditor.tsx
```

---

## 🔧 Manual Workflow Builder - Template Selection Fix

**Current Problem:** Workflow builder doesn't connect to existing templates

**Solution:**

```typescript
// components/workflows/WorkflowBuilder.tsx

import { useQuery } from '@tanstack/react-query';

export function WorkflowBuilder() {
  // Fetch existing email templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const res = await fetch('/api/email-templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      const json = await res.json();
      return json.data;
    }
  });

  return (
    <div>
      {/* For each workflow step */}
      <select>
        <option value="">Select Email Template</option>
        {templates?.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
            {template.category && ` (${template.category})`}
          </option>
        ))}
      </select>
      
      {/* Show template preview when selected */}
      {selectedTemplateId && (
        <div className="template-preview">
          <strong>Subject:</strong> {selectedTemplate.subject}
          <p>{selectedTemplate.bodyText.substring(0, 200)}...</p>
        </div>
      )}
    </div>
  );
}
```

**API Endpoint Required:**
```typescript
// pages/api/email-templates.ts (should already exist)

import { db } from '@leadnex/database';
import { emailTemplates } from '@leadnex/database/schema';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const templates = await db.query.emailTemplates.findMany({
      where: eq(emailTemplates.isActive, true),
      orderBy: [emailTemplates.name]
    });
    
    return res.json({
      success: true,
      data: templates
    });
  }
}
```

---

## ✅ Implementation Checklist

### **Phase 1: Backend**
- [ ] Update `campaigns` table with `campaignType` field
- [ ] Create `scheduled_emails` table
- [ ] Create `automated_campaign_runs` table
- [ ] Update `leadBatches` table with `activeCampaignId`
- [ ] Create campaign email scheduler service
- [ ] Create email sender service
- [ ] Update API routes to filter by `campaignType`
- [ ] Test: Campaign `a3b8bae3-4e31-48d1-b25f-97aaa3ef9c72` completes properly

### **Phase 2: Lead Generation Tab**
- [ ] Create `/pages/campaigns/create-lead-generation.tsx`
- [ ] Create `components/campaigns/LeadGenerationTab.tsx`
- [ ] Connect to `GET /api/campaigns?type=lead_generation`
- [ ] Test: Can create lead gen campaign, generates batch

### **Phase 3: Outreach Tab**
- [ ] Create `/pages/campaigns/create-outreach.tsx`
- [ ] Create `components/campaigns/OutreachTab.tsx`
- [ ] Add "Create Outreach" button to batch detail page
- [ ] Connect to `GET /api/campaigns?type=outreach`
- [ ] Test: Can create outreach from batch, sends emails

### **Phase 4: Fully Automated Tab**
- [ ] Create `/pages/campaigns/create-automated.tsx`
- [ ] Create `components/campaigns/FullyAutomatedTab.tsx`
- [ ] Create `automated_campaign_runs` table
- [ ] Implement automation cron job
- [ ] Connect to `GET /api/campaigns?type=fully_automated`
- [ ] Test: Campaign runs on schedule, creates batches + sends emails

### **Phase 5: Workflow Builder**
- [ ] Create `/pages/workflows/create.tsx`
- [ ] Create `/pages/workflows/[id]/edit.tsx`
- [ ] Fix template selection in `WorkflowBuilder.tsx`
- [ ] Connect to `GET /api/email-templates`
- [ ] Test: Can create workflow, select templates, save, edit

---

## 🚨 CRITICAL RULES

1. **Lead Generation campaigns:** NEVER send emails, only create batches
2. **Outreach campaigns:** NEVER generate leads, only send to existing leads
3. **Fully Automated campaigns:** Do BOTH, but in sequence (gen → delay → send)
4. **Workflow Builder:** MUST fetch and display existing email templates
5. **Campaign Types:** MUST be completely separate - no mixing logic
6. **Pages Router:** Use `pages/` directory, NOT `app/` directory
7. **No Hallucinations:** If something is unclear, ASK - don't guess

---

## 📝 Example User Flows

### **Flow 1: Generate Leads Only**
1. Go to Campaigns → Lead Generation tab
2. Click "Create Lead Generation Campaign"
3. Select: Industry=Spa, Location=New York, Sources=Apollo+Google
4. Set: Max 100 leads, Run daily, End date = Dec 31
5. Click "Create & Start"
6. Campaign runs → Creates batch → Batch appears in Batches page
7. **NO EMAILS SENT** ✅

### **Flow 2: Send Emails to Existing Batch**
1. Go to Leads → Batches
2. Click batch #123 (50 spa leads)
3. Click "Create Outreach Campaign"
4. Select: 3-step workflow "Spa Follow-Up Sequence"
5. Set: Start immediately
6. Click "Create & Start"
7. Campaign starts → Schedules 150 emails (50 leads × 3 steps)
8. Emails send according to workflow timing
9. **NO NEW LEADS GENERATED** ✅

### **Flow 3: Fully Automated Daily Flow**
1. Go to Campaigns → Fully Automated tab
2. Click "Create Automated Campaign"
3. Configure lead gen: Spa, New York, 50 leads/day
4. Configure outreach: Use workflow, send immediately (0 days delay)
5. Set schedule: Daily at 9am, ends Dec 31
6. Click "Create & Start"
7. **Day 1, 9am:** Generates 50 leads → Creates batch #200 → Starts outreach → Sends first email
8. **Day 2, 9am:** Generates 50 leads → Creates batch #201 → Starts outreach → Sends first email
   - Meanwhile: Batch #200 leads get 2nd email (1 day after first)
9. **Day 3, 9am:** Generates 50 leads → Creates batch #202 → Starts outreach → Sends first email
   - Meanwhile: Batch #200 leads get 3rd email, Batch #201 leads get 2nd email
10. Continues until end date ✅

---

## 🎯 Success Criteria

**You'll know it's working when:**

1. **Lead Generation Tab:**
   - Shows only campaigns with `campaignType = 'lead_generation'`
   - Each campaign has "Batches Created" count
   - No mention of emails anywhere

2. **Outreach Tab:**
   - Shows only campaigns with `campaignType = 'outreach'`
   - Each campaign shows batch names or lead count
   - Shows email stats (sent, opened, clicked)
   - No mention of lead generation

3. **Fully Automated Tab:**
   - Shows only campaigns with `campaignType = 'fully_automated'`
   - Shows both lead gen config AND outreach config
   - Shows total runs, total leads, total emails

4. **Workflow Builder:**
   - Dropdown lists ALL email templates from database
   - Shows template name, category, subject
   - Can select different template for each step
   - Saves workflow with correct template IDs

5. **Campaign Bug Fixed:**
   - Campaign `a3b8bae3-4e31-48d1-b25f-97aaa3ef9c72` completes only after ALL emails sent
   - `scheduled_emails` table shows all pending emails
   - Resume works without losing emails

---

**END OF SPECIFICATION**

This is the EXACT implementation required. No ambiguity, no hallucinations.
