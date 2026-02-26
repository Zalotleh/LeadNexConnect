# AI Interface — Implementation Status

**Feature:** Conversational AI interface (Claude-powered) for campaigns, workflows, and lead generation  
**Started:** February 26, 2026  
**Last Updated:** February 26, 2026 — Session 2 (Phase 1 + Phase 2 Backend Complete)  

---

## Legend
| Symbol | Meaning |
|--------|---------|
| ✅ | Done — file exists and complete |
| 🔨 | In Progress — partially implemented |
| ⏳ | Not Started |
| ➡️ | Exists but needs modification |
| ⚠️ | Blocked — dependency not yet built |

---

## Session Log

### Session 1 — February 26, 2026
- Reviewed all 4 planning docs
- Identified gaps: incomplete input handling, off-topic messages, prompt injection, content policy, cross-user ownership
- Added all security recommendations into the implementation guides (Part 1 & Part 2)
- Created this status tracker
- **No code written to the codebase yet**

### Session 2 — February 26, 2026
- Verified all dependencies (all 3 packages already installed, `ANTHROPIC_API_KEY` set) ✅
- Created all 12 Phase 1 backend foundation files ✅
- Created Phase 2: controller + routes + wired into `index.ts` ✅
- TypeScript check: 0 errors in new files (pre-existing errors in old controllers unrelated)
- **Note:** Phase 2 items 16–19 (workflows/leads controller additions) skipped — ContextBuilderService already queries DB directly; those endpoints are a nice-to-have for external callers but not needed for the AI feature to function

---

## Phase 1 — Backend Foundation
> Goal: All new types, utilities, and services in place. No routes wired yet.

| # | File | Status | Notes |
|---|------|--------|-------|
| 1 | `apps/api/src/types/ai-requests.types.ts` | ✅ | Created |
| 2 | `apps/api/src/types/ai-responses.types.ts` | ✅ | Created — includes `AIClarificationResponse`, `AIRejectionResponse`, `AIParseResult<T>` |
| 3 | `apps/api/src/utils/extract-json.ts` | ✅ | Created — strips markdown fences from Claude JSON |
| 4 | `apps/api/src/utils/ai-zod-schemas.ts` | ✅ | Created — Zod schemas for all 3 draft types + `clarificationSchema` + `rejectionSchema` + `parseAIResponse()` |
| 5 | `apps/api/src/utils/sanitize-message.ts` | ✅ | Created — pre-filter for prompt injection / extraction attempts (17 regex patterns) |
| 6 | `apps/api/src/services/ai/context-builder.service.ts` | ✅ | Created — fetches user's workflows + recent batches for Claude context |
| 7 | `apps/api/src/services/ai/context-cache.ts` | ✅ | Created — 30s in-memory TTL cache per userId |
| 8 | `apps/api/src/services/ai/ai-logger.service.ts` | ✅ | Created — logs every AI request for analytics / future fine-tuning |
| 9 | `apps/api/src/services/ai/campaign-parser.service.ts` | ✅ | Created — Claude call → campaign draft (with clarification/rejection support) |
| 10 | `apps/api/src/services/ai/workflow-parser.service.ts` | ✅ | Created — Claude call → workflow draft (with content policy check) |
| 11 | `apps/api/src/services/ai/lead-batch-parser.service.ts` | ✅ | Created — Claude call → lead gen config |
| 12 | `apps/api/src/services/ai/ai-stream.service.ts` | ✅ | Created — SSE streaming (reasoning steps + draft fields) |

> **Note:** `apps/api/src/services/ai/` folder already exists (contains `anthropic.service.ts` for email generation — unrelated, do not modify).

---

## Phase 2 — Backend Controller & Routes
> Goal: All AI endpoints wired, rate-limited, and registered in index.ts.

| # | File | Status | Notes |
|---|------|--------|-------|
| 13 | `apps/api/src/controllers/ai-campaigns.controller.ts` | ✅ | Created — orchestrates all AI parse endpoints; includes sanitize pre-filter + ownership warning |
| 14 | `apps/api/src/routes/ai-campaigns.routes.ts` | ✅ | Created — 6 routes, rate-limited (20 req/min per user) |
| 15 | `apps/api/src/index.ts` | ✅ | `app.use('/api/ai-campaigns', authMiddleware, aiCampaignsRoutes)` added |
| 16 | `apps/api/src/controllers/workflows.controller.ts` | ⏳ | Add `listForAI()` method — nice-to-have, not critical (ContextBuilder queries DB directly) |
| 17 | `apps/api/src/routes/workflows.routes.ts` | ⏳ | Add `GET /list-for-ai` route |
| 18 | `apps/api/src/controllers/leads.controller.ts` | ⏳ | Add `getBatchesForAI()` method |
| 19 | `apps/api/src/routes/leads.routes.ts` | ⏳ | Add `GET /batches-for-ai` route |

### New API Endpoints (7 total)
| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/api/ai-campaigns/context` | Fetch workflows + batches for Claude context | ✅ |
| POST | `/api/ai-campaigns/parse` | Parse message → campaign draft (non-streaming) | ✅ |
| POST | `/api/ai-campaigns/stream` | SSE stream — reasoning + draft fields in real time | ✅ |
| POST | `/api/ai-campaigns/generate-workflow` | Generate workflow on demand (user-initiated) | ✅ |
| POST | `/api/ai-campaigns/parse-workflow` | Parse message → workflow draft | ✅ |
| POST | `/api/ai-campaigns/parse-lead-batch` | Parse message → lead gen config | ✅ |
| GET | `/api/workflows/list-for-ai` | Lightweight workflow list for AI context | ⏳ |
| GET | `/api/leads/batches-for-ai` | Recent lead batches for AI context | ⏳ |

---

## Phase 3 — Frontend Types, Services & Hooks
> Goal: All shared logic in place before building UI components.

| # | File | Status | Notes |
|---|------|--------|-------|
| 20 | `apps/web/src/types/ai-conversation.types.ts` | ⏳ | New file — `ConversationMessage`, `ResolvedEntities`, `ConversationState`, draft interfaces |
| 21 | `apps/web/src/services/ai-api.ts` | ⏳ | New file — uses shared `api` instance (NOT a new axios instance) |
| 22 | `apps/web/src/utils/detect-intent.ts` | ⏳ | New file — client-side intent detection, zero network overhead |
| 23 | `apps/web/src/hooks/useConversationState.ts` | ⏳ | New file — multi-turn session state management |
| 24 | `apps/web/src/hooks/useSSEStream.ts` | ⏳ | New file — POST-based SSE client (fetch + ReadableStream) |
| 25 | `apps/web/src/hooks/useAICampaignCreation.ts` | ⏳ | New file |
| 26 | `apps/web/src/hooks/useAIWorkflowCreation.ts` | ⏳ | New file |
| 27 | `apps/web/src/hooks/useAILeadBatchCreation.ts` | ⏳ | New file |

---

## Phase 4 — Frontend AI Components
> Goal: All reusable AI UI components built and tested in isolation.

| # | File | Status | Notes |
|---|------|--------|-------|
| 28 | `apps/web/src/components/ai/ThinkingAnimation.tsx` | ⏳ | New file — animated loading state |
| 29 | `apps/web/src/components/ai/ContextChip.tsx` | ⏳ | New file — removable context tag (industry, location, etc.) |
| 30 | `apps/web/src/components/ai/MessageBubble.tsx` | ⏳ | New file — user / AI message bubble |
| 31 | `apps/web/src/components/ai/WorkflowSelector.tsx` | ⏳ | New file in `ai/` subfolder — different from existing `components/WorkflowSelector.tsx` |
| 32 | `apps/web/src/components/ai/CampaignDraftCard.tsx` | ⏳ | New file — editable campaign preview card |
| 33 | `apps/web/src/components/ai/WorkflowDraftCard.tsx` | ⏳ | New file — editable workflow preview card |
| 34 | `apps/web/src/components/ai/LeadBatchDraftCard.tsx` | ⏳ | New file — editable lead batch preview card |
| 35 | `apps/web/src/components/ai/ChatInterface.tsx` | ⏳ | New file — chat container with context chips + input bar |
| 36 | `apps/web/src/components/ai/ReasoningPanel.tsx` | ⏳ | New file — live streaming reasoning steps |
| 37 | `apps/web/src/components/ai/CommandBar.tsx` | ⏳ | New file — global Ctrl+K / Cmd+K modal overlay |

> **Note:** Create folder `apps/web/src/components/ai/` first.

---

## Phase 5 — Frontend Pages & Layout Modifications
> Goal: Command Center live, Ctrl+K working, AI entry points added to all main pages.

| # | File | Status | Notes |
|---|------|--------|-------|
| 38 | `apps/web/src/pages/index.tsx` | ➡️ | **Full replacement** — becomes the AI Command Center (split-screen layout) |
| 39 | `apps/web/src/pages/ai-create.tsx` | ⏳ | New file — deep-link page for `/ai-create` path |
| 40 | `apps/web/src/components/Layout.tsx` | ➡️ | Add: AI nav item (Sparkles icon), CommandBar mount, Ctrl+K keyboard listener |
| 41 | `apps/web/src/pages/dashboard.tsx` | ➡️ | Add link back to `/` (Command Center) |
| 42 | `apps/web/src/pages/campaigns.tsx` | ➡️ | Add "Create with AI" button |
| 43 | `apps/web/src/pages/workflows.tsx` | ➡️ | Add "Generate with AI" button |
| 44 | `apps/web/src/pages/leads.tsx` | ➡️ | Add "Generate Leads with AI" button |

---

## Phase 6 — Dependencies & Environment
> Must be verified before starting Phase 1.

| Item | Status | Notes |
|------|--------|-------|
| `@anthropic-ai/sdk` installed in `apps/api` | ✅ | `^0.71.0` already installed |
| `express-rate-limit` installed in `apps/api` | ✅ | `^7.1.5` already installed |
| `zod` installed in `apps/api` | ✅ | `^3.22.4` already installed |
| `ANTHROPIC_API_KEY` env var set | ✅ | Set in `apps/api/.env` |

---

## Security Checklist
> All items must be verified before launch.

| Item | Status |
|------|--------|
| XML delimiter wrapping around all user messages before Claude | ✅ |
| 2,000 character cap on all messages | ✅ |
| `sanitizeMessage()` pre-filter on all 4 parse endpoints | ✅ |
| Per-user rate limit (20 req/min) on all AI routes | ✅ |
| Context (workflows/batches) scoped to `req.user.id` only | ✅ |
| Cross-user ownership check on referenced `batchId`/`workflowId` at submission | ⏳ (to verify during integration testing) |
| Claude instructed to return `status: "off_topic"` for irrelevant/injection messages | ✅ |
| Claude instructed to return `status: "needs_clarification"` for incomplete input | ✅ |
| Claude instructed to return `status: "policy_violation"` for deceptive email content | ✅ |
| Zod validation on all Claude JSON responses | ✅ |
| Blocked messages logged server-side (reason never returned to client) | ✅ |
| No DB write without user approval (draft card always shown first) | ⏳ (frontend Phase 4–5) |

---

## Overall Progress

```
Phase 1 — Backend Foundation       ██████████  12 / 12 ✅
Phase 2 — Controller & Routes      ███░░░░░░░  3 / 7   (items 16-19 deferred)
Phase 3 — Frontend Types & Hooks   ░░░░░░░░░░  0 / 8
Phase 4 — Frontend Components      ░░░░░░░░░░  0 / 10
Phase 5 — Pages & Layout           ░░░░░░░░░░  0 / 7
Phase 6 — Dependencies & Env       ██████████  4 / 4   ✅
─────────────────────────────────────────────────────
Total                               ███░░░░░░░  19 / 48
```

---

## Implementation Order (Recommended)

```
Session 2:  Phase 6 (deps check) → Phase 1 files 1–5 (types + utils)
Session 3:  Phase 1 files 6–12 (services)
Session 4:  Phase 2 (controller + routes + index.ts modifications)
Session 5:  Phase 3 (frontend types, services, hooks)
Session 6:  Phase 4 files 28–35 (components)
Session 7:  Phase 4 files 36–37 (CommandBar + ReasoningPanel)
Session 8:  Phase 5 (pages + layout modifications)
Session 9:  Integration testing + security checklist verification
```

---

## Reference Documents
| Document | Location |
|----------|----------|
| Brainstorm & design decisions | [AI-interface-brainstorm.md](AI-interface-brainstorm.md) |
| Backend code (types, utils, services, controller, routes) | [AI_IMPLEMENTATION_GUIDE_PART1.md](AI_IMPLEMENTATION_GUIDE_PART1.md) |
| Frontend code (hooks, components, pages) | [AI_IMPLEMENTATION_GUIDE_PART2.md](AI_IMPLEMENTATION_GUIDE_PART2.md) |
| Layout modifications + dependencies | [AI_IMPLEMENTATION_GUIDE_PART3.md](AI_IMPLEMENTATION_GUIDE_PART3.md) |
