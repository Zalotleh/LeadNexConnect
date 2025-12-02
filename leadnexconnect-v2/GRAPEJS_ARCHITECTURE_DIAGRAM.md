# GrapeJS Email Editor - System Architecture & Workflow

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js/React)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │              Email Variable Manager (Singleton)             │    │
│  │  - Manages all variables (lead, company, link, custom)     │    │
│  │  - Syncs with backend                                       │    │
│  │  - Provides variables to all components                     │    │
│  └────────────────────────────────────────────────────────────┘    │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │           Enhanced Email Editor (Wrapper Component)         │    │
│  │  ┌──────────────────┐  ┌──────────────────────────────┐   │    │
│  │  │  Simple Editor   │  │   Visual Editor (GrapeJS)    │   │    │
│  │  │  - Textarea      │  │   - Drag & drop components   │   │    │
│  │  │  - Variables     │  │   - Style manager            │   │    │
│  │  │  - Quick edits   │  │   - Device preview           │   │    │
│  │  └──────────────────┘  │   - Code editor              │   │    │
│  │         Toggle          │   - Variable blocks          │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  └────────────────────────────────────────────────────────────┘    │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    Integration Points                       │    │
│  │                                                              │    │
│  │  1. Workflows (/workflows/[id])                            │    │
│  │     - Create/edit workflow steps                            │    │
│  │     - Multi-step sequences                                  │    │
│  │     - Delay configuration                                   │    │
│  │                                                              │    │
│  │  2. Campaigns (/leads, CreateCampaignModal)                │    │
│  │     - Create campaigns with custom emails                   │    │
│  │     - OR select workflow                                    │    │
│  │                                                              │    │
│  │  3. AI Generation (/leads, handleGenerateAIContent)        │    │
│  │     - Generate subject + body                               │    │
│  │     - Load into visual editor                               │    │
│  │     - Further customization                                 │    │
│  │                                                              │    │
│  │  4. Settings (/settings/variables) - NEW                   │    │
│  │     - Manage custom variables                               │    │
│  │     - Edit link URLs                                        │    │
│  │     - Edit signature template                               │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │
                                    │ API Calls
                                    │
┌───────────────────────────────────▼───────────────────────────────────┐
│                         BACKEND (Node.js/Express)                     │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │           Email Generator Service                              │ │
│  │  - AI generation (Claude API)                                  │ │
│  │  - Template fallback                                           │ │
│  │  - Support HTML/text output                                    │ │
│  │  - Include additionalInstructions                              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           ▼                                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │           Campaign Controller                                  │ │
│  │  - Execute campaigns                                           │ │
│  │  - Execute workflow sequences                                  │ │
│  │  - Replace template variables                                  │ │
│  │  - Queue emails                                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           ▼                                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │           Variable Replacement Engine                          │ │
│  │                                                                 │ │
│  │  replaceTemplateVariables(text, lead, customVars)             │ │
│  │                                                                 │ │
│  │  1. Load lead data (companyName, email, etc.)                 │ │
│  │  2. Load custom variables from DB                             │ │
│  │  3. Replace {{variable}} patterns                             │ │
│  │  4. Generate signature HTML                                    │ │
│  │  5. Generate link HTML                                         │ │
│  │  6. Return final HTML/text                                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           ▼                                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │           Email Queue Service                                  │ │
│  │  - Queue emails for sending                                    │ │
│  │  - Schedule delayed emails                                     │ │
│  │  - Handle follow-ups                                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                         DATABASE (PostgreSQL)                          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  workflows                    workflow_steps                           │
│  ├─ id                        ├─ id                                    │
│  ├─ name                      ├─ workflowId (FK)                       │
│  ├─ description               ├─ stepNumber                            │
│  ├─ aiInstructions  ◄─────    ├─ subject                               │
│  ├─ industry                  ├─ body                                  │
│  └─ ...                       ├─ daysAfterPrevious                     │
│                               └─ ...                                    │
│                                                                         │
│  campaigns                    emails (queue)                           │
│  ├─ id                        ├─ id                                    │
│  ├─ name                      ├─ campaignId (FK)                       │
│  ├─ workflowId (FK)          ├─ leadId (FK)                           │
│  ├─ emailSubject             ├─ subject                               │
│  ├─ emailBody                ├─ bodyText                              │
│  ├─ scheduleType             ├─ bodyHtml                              │
│  └─ ...                       ├─ status                                │
│                               ├─ scheduledFor                          │
│                               └─ ...                                    │
│                                                                         │
│  custom_variables (NEW)       leads                                    │
│  ├─ id                        ├─ id                                    │
│  ├─ key                       ├─ companyName                           │
│  ├─ label                     ├─ contactName                           │
│  ├─ defaultValue              ├─ email                                 │
│  ├─ category                  ├─ industry                              │
│  ├─ description               ├─ city, country                         │
│  ├─ isActive                  └─ ...                                   │
│  └─ ...                                                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Complete Workflow Flow

### Scenario 1: Create Workflow with Visual Editor

```
1. User navigates to /workflows/[id]
   │
   ├─▶ 2. Clicks "Add Step" or "Edit Step"
   │    │
   │    ├─▶ 3. EnhancedEmailEditor component loads
   │    │    │
   │    │    ├─▶ 4. User toggles to "Visual" mode
   │    │    │    │
   │    │    │    ├─▶ 5. Clicks "Open Visual Editor"
   │    │    │    │    │
   │    │    │    │    ├─▶ 6. GrapeJSEmailEditor modal opens
   │    │    │    │    │    │
   │    │    │    │    │    ├─▶ 7. User drags components
   │    │    │    │    │    ├─▶ 8. Inserts variables {{companyName}}
   │    │    │    │    │    ├─▶ 9. Styles fonts, colors
   │    │    │    │    │    ├─▶ 10. Previews desktop/mobile
   │    │    │    │    │    │
   │    │    │    │    │    └─▶ 11. Clicks "Save & Close"
   │    │    │    │    │         │
   │    │    │    │    │         └─▶ 12. HTML saved to step.body
   │    │    │    │    │
   │    │    │    │    └─▶ 13. Step saved to workflow_steps table
   │    │    │    │
   │    │    │    └─▶ 14. Workflow ready to use in campaigns
```

### Scenario 2: Create Campaign with AI Generation

```
1. User clicks "Create Campaign" on /leads
   │
   ├─▶ 2. Fills campaign name, description
   │    │
   │    ├─▶ 3. Clicks "Generate with AI" button
   │    │    │
   │    │    ├─▶ 4. Frontend calls AI API
   │    │    │    │
   │    │    │    └─▶ Backend: EmailGeneratorService.generateWithAI()
   │    │    │         │
   │    │    │         ├─▶ Builds AI prompt with industry pain points
   │    │    │         ├─▶ Includes additionalInstructions
   │    │    │         ├─▶ Calls Claude API
   │    │    │         ├─▶ Parses response (subject + body)
   │    │    │         │
   │    │    │         └─▶ Returns { subject, body }
   │    │    │
   │    │    └─▶ 5. Content loaded into EnhancedEmailEditor
   │    │         │
   │    │         ├─▶ 6. User can edit in simple mode
   │    │         │    OR
   │    │         ├─▶ 7. Switch to visual editor
   │    │         │    │
   │    │         │    └─▶ Further customize design
   │    │         │
   │    │         └─▶ 8. Save campaign
   │    │              │
   │    │              └─▶ Campaign stored in DB
   │    │
   │    └─▶ 9. Campaign execution scheduled
```

### Scenario 3: Execute Campaign & Send Emails

```
1. ScheduledCampaignsJob runs (every minute)
   │
   ├─▶ 2. Finds campaigns where startDate <= now
   │    │
   │    ├─▶ 3. Calls campaigns.execute()
   │    │    │
   │    │    ├─▶ 4. Load campaign data
   │    │    │    │
   │    │    │    ├─▶ If workflowId: Load workflow steps
   │    │    │    └─▶ If custom email: Use emailSubject/emailBody
   │    │    │
   │    │    ├─▶ 5. Load selected leads
   │    │    │
   │    │    ├─▶ 6. For each lead:
   │    │    │    │
   │    │    │    ├─▶ 7. For each workflow step (or single email):
   │    │    │    │    │
   │    │    │    │    ├─▶ 8. Get email template (subject + body HTML)
   │    │    │    │    │
   │    │    │    │    ├─▶ 9. replaceTemplateVariables(body, lead)
   │    │    │    │    │    │
   │    │    │    │    │    ├─▶ Replace {{companyName}} → lead.companyName
   │    │    │    │    │    ├─▶ Replace {{contactName}} → lead.contactName
   │    │    │    │    │    ├─▶ Replace {{signUpLink}} → HTML link
   │    │    │    │    │    ├─▶ Replace {{signature}} → signature HTML
   │    │    │    │    │    ├─▶ Replace custom variables from DB
   │    │    │    │    │    │
   │    │    │    │    │    └─▶ Return final HTML
   │    │    │    │    │
   │    │    │    │    ├─▶ 10. Check for duplicate emails
   │    │    │    │    │
   │    │    │    │    └─▶ 11. Queue email
   │    │    │    │         │
   │    │    │    │         └─▶ emailQueueService.addEmail() or scheduleEmail()
   │    │    │    │              │
   │    │    │    │              └─▶ Stored in emails table
   │    │    │    │
   │    │    │    └─▶ 12. Mark campaign as executed
   │    │    │
   │    │    └─▶ 13. Email sender service processes queue
   │    │         │
   │    │         └─▶ Sends actual emails via SMTP
```

### Scenario 4: Edit Email Anywhere

```
┌──────────────────────────────────────────────────────────────┐
│                    Edit Email Locations                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Workflow Step Editor (/workflows/[id])                   │
│     └─▶ Edit button on each step                             │
│         └─▶ Opens EmailEditModal                             │
│             └─▶ EnhancedEmailEditor inside                   │
│                 └─▶ Save updates workflow_steps              │
│                                                               │
│  2. Campaign Creation (/leads, CreateCampaignModal)          │
│     └─▶ Email subject/body fields                            │
│         └─▶ Uses EnhancedEmailEditor                         │
│             └─▶ Toggle simple/visual                         │
│                 └─▶ Save creates campaign                    │
│                                                               │
│  3. Campaign Edit (future)                                   │
│     └─▶ Edit campaign email before execution                 │
│         └─▶ Opens EmailEditModal                             │
│             └─▶ Updates campaign.emailSubject/emailBody      │
│                                                               │
│  4. Email Queue Edit (future)                                │
│     └─▶ Edit queued emails before sending                    │
│         └─▶ Opens EmailEditModal                             │
│             └─▶ Updates emails.bodyText/bodyHtml             │
│                                                               │
│  5. Email Template Library (future)                          │
│     └─▶ Create reusable email templates                      │
│         └─▶ Visual editor                                    │
│             └─▶ Save to templates table                      │
│                 └─▶ Reuse in workflows/campaigns             │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## 🎨 Variable System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Variable Lifecycle                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. DEFINITION (Settings)                                        │
│     │                                                            │
│     ├─▶ Built-in Variables (code)                              │
│     │   ├─ Lead: companyName, contactName, email, etc.         │
│     │   ├─ Company: ourCompanyName, ourEmail, ourWebsite       │
│     │   └─ Links: signUpLink, featuresLink, pricingLink        │
│     │                                                            │
│     └─▶ Custom Variables (database)                            │
│         ├─ User creates in /settings/variables                 │
│         ├─ Stored in custom_variables table                    │
│         └─ Available across all emails                         │
│                                                                  │
│  2. INSERTION (Editor)                                          │
│     │                                                            │
│     ├─▶ Simple Editor                                          │
│     │   └─ Dropdown menu → Insert {{variable}}                 │
│     │                                                            │
│     └─▶ Visual Editor (GrapeJS)                                │
│         ├─ Variable blocks in left panel                       │
│         ├─ Drag block to canvas                                │
│         └─ Or type {{variable}} manually                       │
│                                                                  │
│  3. STORAGE (Database)                                          │
│     │                                                            │
│     ├─▶ workflow_steps.body                                    │
│     │   "Hi {{contactName}}, I noticed {{companyName}}..."     │
│     │                                                            │
│     ├─▶ campaigns.emailBody                                    │
│     │   "Check out our features at {{featuresLink}}"           │
│     │                                                            │
│     └─▶ emails.bodyText / emails.bodyHtml                      │
│         (Stored with variables, replaced before sending)       │
│                                                                  │
│  4. REPLACEMENT (Execution)                                     │
│     │                                                            │
│     └─▶ replaceTemplateVariables(text, lead, customVars)       │
│         │                                                        │
│         ├─▶ Load lead data from database                       │
│         │   lead.companyName = "Acme Corp"                     │
│         │   lead.contactName = "John Smith"                    │
│         │                                                        │
│         ├─▶ Load custom variables from database                │
│         │   customVars = { promoCode: "SAVE50" }               │
│         │                                                        │
│         ├─▶ Replace patterns                                   │
│         │   "Hi {{contactName}}" → "Hi John Smith"             │
│         │   "{{companyName}}" → "Acme Corp"                    │
│         │   "{{signUpLink}}" → <a href="...">Sign Up</a>      │
│         │   "{{signature}}" → <signature HTML>                 │
│         │                                                        │
│         └─▶ Return final HTML/text                             │
│                                                                  │
│  5. RENDERING (Email Client)                                   │
│     │                                                            │
│     └─▶ Final email sent to recipient                          │
│         ├─ All variables replaced with actual data             │
│         ├─ Links are clickable                                 │
│         ├─ Signature renders with logo                         │
│         └─ Responsive design works on mobile                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🔐 Key Integration Points

### 1. Variable Manager ↔️ All Components
- **EmailVariableManager** provides variables to:
  - Simple Editor (dropdown)
  - GrapeJS Editor (blocks)
  - Settings page (management)
  - Backend (sync)

### 2. AI Generator ↔️ Visual Editor
- AI generates content
- Content loaded into editor
- User can further customize
- Save to workflow/campaign

### 3. Workflows ↔️ Campaigns
- Workflows define email sequences
- Campaigns execute workflows
- OR campaigns use custom emails
- Both support visual editor

### 4. Frontend ↔️ Backend
- Frontend: Create/edit emails
- Backend: Replace variables
- Backend: Queue & send emails
- Variables synced both ways

### 5. Database ↔️ All Systems
- Workflows stored
- Campaigns stored
- Custom variables stored
- Emails queued
- Lead data retrieved

---

This architecture ensures:
✅ Seamless integration with existing workflow  
✅ Variables work everywhere  
✅ AI generation supported  
✅ Edit anywhere capability  
✅ Custom variables manageable  
✅ No breaking changes  
✅ Scalable and maintainable  
