LeadNexConnect — AI Feature Brainstorm
Working Summary  ·  v1.0  ·  Feb 2026


1  What We're Building
A unified, conversational AI interface layered on top of the existing LeadNexConnect app — so any user can type a plain-English instruction and the system handles the rest. No forms, no steps, no manual config.

The core idea, in one sentence:
"I want to create an outreach campaign for spa salons in Madrid"  →  campaign created, reviewed, launched.


2  Scope — Three Flows, One Interface
The AI interface covers all three core creation flows. Same chat shell, same approval pattern, different entities:

Flow
Example user message
Existing API called
Lead Generation
"Find 50 spa salons in Madrid"
POST /api/scraping/google-places
Workflow Creation
"Write a 3-step email sequence for wellness businesses"
POST /api/workflows
Campaign (new leads)
"Run outreach for spa salons in Madrid"
POST /api/campaigns
Campaign (existing batch)
"Campaign from the Madrid Spas batch I generated"
POST /api/campaigns/from-batch
Campaign (existing workflow)
"Use the Wellness 3-Step workflow"
resolves ID → POST /api/campaigns


3  Key Questions Answered
Can the user reference an existing workflow?
Yes. The AI fetches current workflows before responding, so it can resolve names like "Wellness 3-Step" to a workflowId and pre-fill it in the campaign draft. No manual ID needed.
Can the user reference an existing leads batch?
Yes. Same approach — the AI fetches recent leadBatches, matches the name mentioned ("the Madrid Spas batch"), and calls the existing POST /api/campaigns/from-batch endpoint with the correct batchId resolved automatically.
Does the same interface work for Lead Batches and Workflows too?
Yes. All three flows share the same conversational shell and the same approval pattern. Intent detection routes the message to the right handler.


4  How It Works — The Flow
#
Step
Detail
1
User opens AI interface
Single page — works for leads, workflows & campaigns
2
User types in plain English
"Find spas in Madrid and create an outreach campaign"
3
Backend fetches context
Loads existing workflows + recent batches to inject into prompt
4
Claude parses intent
Extracts: entity type, industry, location, references to existing items
5
Draft returned to frontend
Structured preview card with all config fields populated
6
User reviews & edits
Can tweak any field before committing
7
User approves
Hits 'Create & Launch' — calls existing API endpoints, nothing new written
8
Redirect to detail page
Full continuity — user sees the result immediately


5  Multi-Turn Conversation Example
The interface supports continuity across multiple turns in a session. Context — industry, location, IDs — carries forward automatically so the user never repeats themselves:

User:  "Find yoga studios in Barcelona"
AI:   → Intent detected: Lead Generation
       → Suggests: source = Google Places, industry = Health & Wellness, city = Barcelona, country = Spain
       → Shows draft card → user approves
       → Calls POST /api/scraping/google-places → batch saved as "Barcelona Yoga Studios" (batchId stored in session)

User:  "Now write a 3-step email sequence for these yoga studios"
AI:   → Intent detected: Workflow Creation
       → Carries forward: industry = Health & Wellness, location = Barcelona (from previous turn)
       → Generates: "Barcelona Yoga Outreach" — 3 steps tailored to yoga studios in Spain
       → Shows draft card → user approves
       → Calls POST /api/workflows → workflowId stored in session

User:  "Great, create a campaign using that workflow for the batch we just made"
AI:   → Intent detected: Campaign Creation
       → Resolves: batchId = "Barcelona Yoga Studios" (from session), workflowId = "Barcelona Yoga Outreach" (from session)
       → Campaign name auto-set: "Barcelona Yoga Studios Outreach"
       → Shows draft card → user approves
       → Calls POST /api/campaigns/from-batch → redirect to campaign detail page

Key: the AI never asks the user to repeat the industry or location. The session's resolvedEntities carry that context automatically.


6  What Needs to Be Built
New files (3 backend + 1 frontend page)
    • apps/api/src/services/ai/campaign-parser.service.ts  — calls Claude API, parses intent, resolves entity IDs
    • apps/api/src/controllers/ai-campaigns.controller.ts  — orchestrates context fetch + parser call
    • apps/api/src/routes/ai-campaigns.routes.ts  — POST /api/campaigns/ai-create
    • apps/web/src/pages/campaigns/new.tsx  — the chat UI page

New concept: Conversation State (frontend only)
A lightweight session object held in React state — carries resolved entity IDs and last-known context (industry, location) between turns.
    • lastBatchId, lastWorkflowId, lastCampaignId
    • lastIndustry, lastLocation  — so follow-up messages don't need to repeat context
    • messages[]  — full history passed to Claude each turn

Nothing changes in the existing API
The AI interface is a smarter front door — it ultimately calls the same existing endpoints. No DB migrations, no breaking changes.


7  Recommendations
Build order
    • 1.  campaign-parser.service.ts first — get Claude parsing text → JSON correctly. Test with 10+ varied inputs.
    • 2.  Wire up the API route — POST /api/campaigns/ai-create returns the draft JSON.
    • 3.  Build the frontend chat page — mostly UI work once backend is solid.
    • 4.  Extend to workflows and lead generation — same pattern, different entities.
    • 5.  Add multi-turn session state — carry context across turns.

Design principles to keep
    • Never write to the DB without user approval — always show a draft card first.
    • AI interface doesn't replace the existing forms — they stay for power users.
    • Inject existing data (workflows, batches) into every Claude prompt — so it can resolve references by name.
    • Keep the Claude system prompt industry-aware — map keywords to standard industry enum values.
    • Claude should explain its reasoning in the preview card (e.g. "I chose Google Places because local spas are
      best found via maps") — this builds trust and helps users learn the system's logic.
    • Propagate campaign context into aiInstructions on the workflow — when a campaign is created via AI, write
      the parsed industry and location into the workflow's aiInstructions field (e.g. "Outreach for spa salons
      in Madrid, Spain — wellness/beauty industry, Spanish market"). This ensures all subsequent email generation
      from that workflow produces personalised copy ("your spa in Madrid") instead of generic templates.

Smart defaults the AI should apply
Condition
Default
Reason
Local service business (spa, salon, clinic)
Google Places as lead source
Better local coverage than Apollo
B2B / company targeting
Apollo as lead source
Better for company-level data
Any new campaign
30 leads/day
Conservative start, avoids spam flags
Any new campaign
Follow-ups enabled (Day 3 + Day 7)
Proven better response rates
Schedule
Daily at 09:00
Best open rates in morning


4b  Visual User Flow — Campaign Creation
This is the end-to-end journey for the AI campaign creation path:

    User opens app
          ↓
    Dashboard — "Create Campaign with AI" button
          ↓
    /campaigns/new  (or unified /ai-create page)
          ↓
    Chat UI: "What kind of outreach would you like to run?"
          ↓
    User types: "spa salons in Madrid"
          ↓
    POST /api/ai-campaigns/parse  { message: "spa salons in Madrid", conversationHistory: [...] }
          ↓
    Claude API parses → returns structured JSON draft
          ↓
    Frontend renders Campaign Preview Card:

    ┌─────────────────────────────────────────┐
    │  🎯 Campaign Draft                      │
    │  Name: Spa Salons Madrid Outreach       │
    │  Industry: Spa & Wellness               │
    │  Target: Madrid, Spain                  │
    │  Leads/day: 30 · Daily at 09:00         │
    │  Lead source: Google Places             │
    │  Workflow: [Select existing ▾]          │
    │  Follow-ups: Day 3 + Day 7              │
    │                                         │
    │  💡 I chose Google Places because local │
    │     spas are best found via maps rather │
    │     than LinkedIn or Apollo.            │
    │                                         │
    │  [Edit details]   [Create & Launch →]   │
    └─────────────────────────────────────────┘
          ↓  (user clicks "Create & Launch")
    POST /api/campaigns  (existing endpoint — no changes)
          ↓
    Campaign created in DB → redirect to campaign detail page

Note: The "Workflow" field in the card shows a dropdown of the user's existing workflows.
If they want a new workflow generated, a "Generate emails for this campaign" button fires
the optional second Claude call on demand — it does not happen automatically.


8  Claude API Call Architecture
A key architectural decision: how many Claude API calls happen per user message?

Scenario A — User references an existing workflow
"Create a campaign for spa salons in Madrid using the Wellness 3-Step workflow"
    • 1 Claude API call total.
    • Claude parses intent, resolves the existing workflow by name to a workflowId, returns the full campaign draft.
    • Fast, simple, no chaining.

Scenario B — User doesn't mention a workflow
"Create an outreach campaign for spa salons in Madrid"
Two options were considered:

Option
How it works
API calls
Decision
Option 1 — Campaign only
Campaign draft returned. Workflow selector shown in review card — user picks existing or clicks 'Generate emails' on demand to trigger a second call.
1 call (+ optional 2nd on demand)
✅ Chosen
Option 2 — Auto campaign + workflow
Always fire 2 Claude calls automatically: (1) campaign draft, (2) generate new email workflow. User sees both in one review card.
Always 2 calls
❌ Rejected

Why Option 1
    • Keeps the system fast and predictable — no automatic call chaining.
    • Respects that the user may already have a workflow they want to reuse.
    • The second call (workflow generation) is available on demand via a 'Generate emails for this campaign' button in the review card.
    • Avoids wasting API credits generating email sequences the user doesn't need.
    • Simpler to debug — one call, one result, one review.


9  UI Architecture Decision — Command Center (A2)
Decided: February 25, 2026

We evaluated 4 UI options (A through D) and chose a combination of Option A and Option B:

9a  Option A2 — "Command Center" as App Entry Point
The app's root page (/) becomes the AI Command Center. The existing /dashboard is kept but
no longer the default landing page after login. The sidebar remains for all sub-pages.

Layout behaviour:
    • Default state (no message sent): single column, clean hero input, quick-start tiles, recent activity feed
    • Triggered state (message sent): page smoothly splits into two panels via 300ms CSS transition
      - Left (60%): conversation thread — messages + streaming reasoning steps appear here
      - Right (40%): live draft card — fields light up progressively as JSON streams in from Claude
    • After approval/dismiss: collapses back to single column

Visual mockup of triggered (split) state:

    ┌──────────────────────────────────┬────────────────────────────────────────┐
    │  Conversation                    │  Live Draft Preview                    │
    │──────────────────────────────────│────────────────────────────────────────│
    │  User: spa salons in Madrid      │  ┌──────────────────────────────────┐  │
    │                                  │  │  🎯 Campaign Draft               │  │
    │  ✅ Intent: Campaign creation    │  │  Name: Spa Salons Madrid ✓       │  │
    │  ✅ Industry: Spa & Wellness     │  │  Industry: Spa & Wellness ✓      │  │
    │  ✅ Location: Madrid, Spain      │  │  Target: Madrid, Spain ✓         │  │
    │  ✅ Source: Google Places        │  │  Leads/day: 30 ✓                 │  │
    │     (local service → maps)       │  │  Source: Google Places ✓         │  │
    │  ⏳ Workflow: needs selection    │  │  Workflow: [Select ▾]  ⏳         │  │
    │  ✅ Schedule: Daily 09:00        │  │  Schedule: Daily 09:00 ✓         │  │
    │                                  │  │                                  │  │
    │                                  │  │  💡 I chose Google Places...     │  │
    │                                  │  │                                  │  │
    │                                  │  │  [Edit]   [Create & Launch →]   │  │
    │                                  │  └──────────────────────────────────┘  │
    │──────────────────────────────────│                                        │
    │  [Type your next message…] [↵]   │                                        │
    └──────────────────────────────────┴────────────────────────────────────────┘

Key: the draft card fields light up one by one as Claude streams the JSON — not all at once.
The reasoning step list (left panel) and draft card (right panel) update in parallel from the same stream.

9b  Option B — Global Ctrl+K Command Bar
A keyboard shortcut that opens the AI interface as a modal from any page in the app.
Works alongside the Command Center — doesn't replace it.

    [any page in the app] — user presses Ctrl+K (or Cmd+K on Mac)

    ┌──────────────────────────────────────────────────────────────┐
    │  ✦  Tell me what you want...                                 │
    │     > "create a campaign for yoga studios"                   │
    │──────────────────────────────────────────────────────────────│
    │  Recent:  Barcelona Yoga · Madrid Spas                       │
    │  Actions: New Campaign  ·  Find Leads  ·  Write Workflow     │
    └──────────────────────────────────────────────────────────────┘

    • Opens as a full-width modal overlay (like Linear, Vercel, Raycast)
    • Submitting the message navigates to / (Command Center) with the message pre-filled
      and immediately sent — no page reload, just router.push with query param
    • Accessible globally via Layout.tsx keyboard listener
    • Esc closes the modal, preserving the user's current page context

9c  Streaming Implementation — SSE (Server-Sent Events)
Claude's response streams in real time. The backend switches from a single JSON response
to a Server-Sent Events (SSE) stream. No WebSockets needed — Next.js supports SSE natively.

Stream event shape:
    data: {"type": "reasoning", "step": "Intent detected: Campaign creation"}
    data: {"type": "reasoning", "step": "Source: Google Places (local service business)"}
    data: {"type": "draft_field", "field": "industry", "value": "spa_wellness"}
    data: {"type": "draft_field", "field": "targetCities", "value": ["Madrid"]}
    data: {"type": "draft_complete", "draft": { ...full JSON } }
    data: {"type": "done"}

Prompt redesign for streaming:
    Claude is instructed to OUTPUT IN TWO SEQUENTIAL SECTIONS:
    1. <thinking> block — plain English reasoning steps, one per line, streamed first
    2. <json> block — the structured draft object, streamed after thinking completes
    The backend parser reads the stream, emits reasoning lines as SSE events in real time,
    then parses the JSON block when the </json> tag is detected.

New files required for streaming (added to file list in section 12):
    Backend:
        • apps/api/src/services/ai/ai-stream.service.ts  — handles SSE streaming from Claude
        • New POST /api/ai-campaigns/stream  endpoint in ai-campaigns.controller.ts
        • New route in ai-campaigns.routes.ts
    Frontend:
        • apps/web/src/hooks/useSSEStream.ts  — EventSource client, parses SSE events
        • apps/web/src/components/ai/ReasoningPanel.tsx  — renders live reasoning steps
        • apps/web/src/components/ai/CommandBar.tsx  — Ctrl+K global modal
        • apps/web/src/pages/index.tsx  — REPLACED: now the Command Center (not a CTA card on dashboard)


10  Future Considerations — AI Model Strategy
As the app scales, the cost and architecture of AI API calls becomes worth revisiting. Here is an honest breakdown of all three options.

Current Cost Reality (Claude API)
A typical campaign creation request ≈ 1,000 tokens total  →  ~$0.003 per request (less than ⅓ of a cent). 100 AI requests/day = ~$9/month. This is negligible compared to existing Apollo, Hunter, and Google Places API costs already in the system.

Three Options Compared

Factor
Option 1 — Claude API
Option 2 — Fine-tune open model
Option 3 — Train from scratch
Cost per request
~$0.003
~$0.0001 (self-hosted)
N/A
Setup time
0 — works today
2–4 weeks
Years + $10M+ compute
Maintenance
None
Ongoing (model, server, uptime)
Dedicated ML team
Quality out of the box
Excellent
Depends on training data quality
Depends on everything
Handles edge cases
Excellent
Only if in training data
Only if in training data
Infrastructure needed
None
GPU server (~$20–40/mo)
Massive — not realistic
Makes sense when...
Any scale — use this now
10,000+ AI requests/day
Never for this use case
Verdict
✅ Recommended now
⏳ Revisit at scale
❌ Not applicable

The Smart Middle Ground (Worth Knowing)
There is a smarter version of Option 2 that does not require fine-tuning at all: structured output with a smaller model. The campaign creation task is actually highly constrained — it is not asking the AI to be creative or hold general knowledge. It is asking it to parse a sentence and fill in a JSON schema. That is a classification and extraction task.

A practical hybrid approach at scale:
    • Rules-based parser handles common, predictable patterns (known city names, industry keywords, schedule keywords).
    • Small model (Mistral 7B or Llama 3.1 8B, self-hosted) handles the ambiguous remainder.
    • This covers 80%+ of requests at near-zero cost with zero API dependency.

Decision Milestones
Milestone
Action
Now — launch
Build with Claude API. Cost is negligible. Focus on product quality.
100–1,000 requests/day
Stay on Claude API. Still costs less than $30/month. No action needed.
10,000+ requests/day
Evaluate fine-tuning Llama 3.1 8B or Mistral 7B on real collected user messages. By this point you have training data.
Real user messages collected
These become your most valuable asset for fine-tuning. Log all AI requests from day one (inputs + outputs).
Never
Train a model from scratch. Not relevant for this use case at any scale.

💡 Key insight: Log every AI request (user message + structured output) from day one. This data is worthless now and invaluable later — it becomes the training dataset if you ever do fine-tune.


12  Implementation — Files & Code Structure
Complete breakdown of all 37 files that need to be created or modified to implement the unified AI conversation interface.

File Count Summary
Category
New Files
Modified Files
Backend (API Services, Controllers, Routes)
10
6
Frontend (Pages, Components, Hooks)
16
5
TOTAL
26
11

Backend Files — New (11 files)
    • apps/api/src/types/ai-requests.types.ts — TypeScript interfaces for AI API requests
    • apps/api/src/types/ai-responses.types.ts — TypeScript interfaces for AI API responses
    • apps/api/src/services/ai/context-builder.service.ts — Fetch workflows + batches for AI context
    • apps/api/src/services/ai/intent-detector.service.ts — Detect campaign vs workflow vs lead batch
    • apps/api/src/services/ai/campaign-parser.service.ts — Call Claude API, parse campaign draft
    • apps/api/src/services/ai/workflow-parser.service.ts — Call Claude API, parse workflow draft
    • apps/api/src/services/ai/lead-batch-parser.service.ts — Call Claude API, parse lead gen config
    • apps/api/src/services/ai/ai-stream.service.ts — SSE streaming from Claude (reasoning + draft fields) [NEW — A2]
    • apps/api/src/controllers/ai-campaigns.controller.ts — Orchestrate all AI parsing endpoints
    • apps/api/src/routes/ai-campaigns.routes.ts — Define 7 API routes (added /stream) [UPDATED — A2]
    • apps/api/src/services/ai/ (directory) — Create this folder first

Backend Files — Modified (6 files)
    • apps/api/src/index.ts — Register new /api/ai-campaigns routes
    • apps/api/src/controllers/workflows.controller.ts — Add listForAI() endpoint
    • apps/api/src/routes/workflows.routes.ts — Add GET /list-for-ai route
    • apps/api/src/controllers/leads.controller.ts — Add getBatchesForAI() endpoint
    • apps/api/src/routes/leads.routes.ts — Add GET /batches-for-ai route
    • package.json — Add @anthropic-ai/sdk dependency (if not present)

Frontend Files — New (20 files)
    • apps/web/src/pages/index.tsx — REPLACED: now the full Command Center homepage [CHANGED — A2]
    • apps/web/src/pages/ai-create.tsx — AI conversation page (kept as /ai-create deep link)
    • apps/web/src/components/ai/ChatInterface.tsx — Chat UI container
    • apps/web/src/components/ai/MessageBubble.tsx — Individual message display
    • apps/web/src/components/ai/ReasoningPanel.tsx — Streams live reasoning steps [NEW — A2]
    • apps/web/src/components/ai/CampaignDraftCard.tsx — Campaign preview card (fields light up as streamed)
    • apps/web/src/components/ai/WorkflowDraftCard.tsx — Workflow preview card
    • apps/web/src/components/ai/LeadBatchDraftCard.tsx — Lead batch preview card
    • apps/web/src/components/ai/ThinkingAnimation.tsx — Loading animation
    • apps/web/src/components/ai/ContextChip.tsx — Show resolved entities
    • apps/web/src/components/ai/WorkflowSelector.tsx — Dropdown with 'Generate new' button
    • apps/web/src/components/ai/CommandBar.tsx — Global Ctrl+K modal overlay [NEW — B]
    • apps/web/src/hooks/useConversationState.ts — Manage conversation state
    • apps/web/src/hooks/useSSEStream.ts — EventSource client for streaming [NEW — A2]
    • apps/web/src/hooks/useAICampaignCreation.ts — Campaign creation logic
    • apps/web/src/hooks/useAIWorkflowCreation.ts — Workflow creation logic
    • apps/web/src/hooks/useAILeadBatchCreation.ts — Lead batch creation logic
    • apps/web/src/services/ai-api.ts — API client for AI endpoints
    • apps/web/src/types/ai-conversation.types.ts — TypeScript interfaces for frontend
    • apps/web/src/components/ai/ (directory) — Create this folder first

Frontend Files — Modified (5 files)
    • apps/web/src/components/Layout.tsx — Add Ctrl+K listener + CommandBar, add 'AI' nav item [UPDATED — B]
    • apps/web/src/pages/campaigns.tsx — Add 'Create with AI' button
    • apps/web/src/pages/workflows.tsx — Add 'Generate with AI' button
    • apps/web/src/pages/leads.tsx — Add 'Generate Leads with AI' button
    • apps/web/src/pages/dashboard.tsx — Link to / (Command Center) instead of being entry point

New API Endpoints (7 endpoints)
Method
Endpoint
Purpose
GET
/api/ai-campaigns/context
Fetch workflows + batches for AI context
POST
/api/ai-campaigns/parse
Parse user message → campaign draft (non-streaming fallback)
POST
/api/ai-campaigns/stream
SSE stream: reasoning steps + draft fields in real time [NEW — A2]
POST
/api/ai-campaigns/generate-workflow
Generate workflow on demand (optional 2nd call)
POST
/api/ai-campaigns/parse-workflow
Parse message → workflow draft
POST
/api/ai-campaigns/parse-lead-batch
Parse message → lead gen config
POST
/api/ai-campaigns/detect-intent
Detect campaign vs workflow vs lead batch intent

📦 Implementation Note: Full source code for all 37 files is provided in a separate implementation guide document (AI_INTERFACE_IMPLEMENTATION_GUIDE.md). Each file includes complete, production-ready code with proper error handling, TypeScript types, and inline documentation.


13  Status Tracker
Update this section as brainstorming progresses:

Topic
Brainstorm
Ready to Build
AI Campaign Creation from natural language
✅ Done
⏳ Pending
Reference existing workflow in AI chat
✅ Done
⏳ Pending
Reference existing leads batch in AI chat
✅ Done
⏳ Pending
AI Lead Batch Generation (natural language)
✅ Done
⏳ Pending
AI Workflow Creation (natural language)
✅ Done
⏳ Pending
Multi-turn conversation state
✅ Done
⏳ Pending
Unified single chat interface (all 3 flows)
✅ Done
⏳ Pending
Build order & file structure
✅ Done
⏳ Pending
Claude API call strategy (1 call + optional 2nd on demand)
✅ Done
⏳ Pending
AI model strategy & future cost planning
✅ Done
📋 Future consideration
Complete implementation plan (41 files documented)
✅ Done
🔨 Ready to build
UI Architecture — A2 Command Center + Ctrl+K bar
✅ Done
🔨 Ready to build
SSE streaming with live reasoning panel
✅ Done
🔨 Ready to build
Split-screen layout (collapses → expands on message)
✅ Done
🔨 Ready to build
Last updated: February 25, 2026  ·  v1.5 — Added UI Architecture Decision (Section 9): Command Center as entry point (A2), global Ctrl+K bar (B), SSE streaming with live reasoning panel and progressive draft card field population.


----
✅ COMPLETE FILE CHECKLIST
Backend (16 files total)
New files (10):

✅ /apps/api/src/types/ai-requests.types.ts
✅ /apps/api/src/types/ai-responses.types.ts
✅ /apps/api/src/services/ai/context-builder.service.ts
✅ /apps/api/src/services/ai/intent-detector.service.ts
✅ /apps/api/src/services/ai/campaign-parser.service.ts
✅ /apps/api/src/services/ai/workflow-parser.service.ts
✅ /apps/api/src/services/ai/lead-batch-parser.service.ts
✅ /apps/api/src/controllers/ai-campaigns.controller.ts
✅ /apps/api/src/routes/ai-campaigns.routes.ts
✅ /apps/api/src/services/ai/ai-stream.service.ts  [NEW — A2 streaming]
✅ Create folder: /apps/api/src/services/ai/

Modified files (6):

✅ /apps/api/src/index.ts - Register routes
✅ /apps/api/src/controllers/workflows.controller.ts - Add listForAI()
✅ /apps/api/src/routes/workflows.routes.ts - Add route
✅ /apps/api/src/controllers/leads.controller.ts - Add getBatchesForAI()
✅ /apps/api/src/routes/leads.routes.ts - Add route
✅ /apps/api/package.json - Add @anthropic-ai/sdk (if needed)

Frontend (21 files total)
New files (16):

✅ /apps/web/src/types/ai-conversation.types.ts
✅ /apps/web/src/services/ai-api.ts
✅ /apps/web/src/hooks/useConversationState.ts
✅ /apps/web/src/hooks/useAICampaignCreation.ts
✅ /apps/web/src/hooks/useAIWorkflowCreation.ts
✅ /apps/web/src/hooks/useAILeadBatchCreation.ts
✅ /apps/web/src/components/ai/ThinkingAnimation.tsx
✅ /apps/web/src/components/ai/ContextChip.tsx
✅ /apps/web/src/components/ai/MessageBubble.tsx
✅ /apps/web/src/components/ai/WorkflowSelector.tsx
✅ /apps/web/src/components/ai/CampaignDraftCard.tsx
✅ /apps/web/src/components/ai/WorkflowDraftCard.tsx
✅ /apps/web/src/components/ai/LeadBatchDraftCard.tsx
✅ /apps/web/src/components/ai/ChatInterface.tsx
✅ /apps/web/src/components/ai/ReasoningPanel.tsx  [NEW — A2 streaming]
✅ /apps/web/src/components/ai/CommandBar.tsx  [NEW — B Ctrl+K]
✅ /apps/web/src/hooks/useSSEStream.ts  [NEW — A2 streaming]
✅ /apps/web/src/pages/index.tsx  [REPLACED — now Command Center homepage]
✅ /apps/web/src/pages/ai-create.tsx
✅ Create folder: /apps/web/src/components/ai/

Modified files (5):

✅ /apps/web/src/components/Layout.tsx - Add Ctrl+K listener + CommandBar, add AI nav item
✅ /apps/web/src/pages/dashboard.tsx - Add link back to / (Command Center)
✅ /apps/web/src/pages/campaigns.tsx - Add button
✅ /apps/web/src/pages/workflows.tsx - Add button
✅ /apps/web/src/pages/leads.tsx - Add button


🚀 IMPLEMENTATION STEPS

Install dependency (if not present):

bash   cd apps/api
   npm install @anthropic-ai/sdk
```

2. **Add environment variable**:
```
   ANTHROPIC_API_KEY=your_key_here

Create all backend files (10 new + 6 modifications)
Create all frontend files (16 new + 5 modifications)
Test the flow:

Navigate to /ai-create
Type: "Create an outreach campaign for spa salons in Madrid"
Review draft
Click "Create & Launch"