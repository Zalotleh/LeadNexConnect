# Phase 5: User ID Filtering Pattern

**Date:** February 11, 2026  
**Purpose:** Add userId filtering to all data access operations for multi-user data isolation

---

## 📋 Overview

Phase 5 requires updating all services/controllers to:
1. Accept `userId` as a parameter (from `req.user.id`)
2. Filter ALL database queries by `userId`
3. Attach `userId` to all INSERT operations
4. Verify user ownership before UPDATE/DELETE operations

**Architectural Reality:**
- Most controllers directly access the database (no separate service layer)
- Therefore, we update controllers to add userId filtering
- This achieves the same goal: **data isolation per user**

---

## 🎯 Required Changes Per Controller

### Pattern 1: Change Request to AuthRequest

**Before:**
```typescript
import { Request, Response } from 'express';

async getLeads(req: Request, res: Response) {
```

**After:**
```typescript
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';

async getLeads(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
```

### Pattern 2: Add userId to SELECT Queries

**Before:**
```typescript
const leads = await db
  .select()
  .from(leads)
  .where(eq(leads.status, 'active'));
```

**After:**
```typescript
const userId = req.user!.id;

const leads = await db
  .select()
  .from(leads)
  .where(and(
    eq(leads.userId, userId),  // ALWAYS filter by userId first
    eq(leads.status, 'active')
  ));
```

### Pattern 3: Add userId to INSERT Operations

**Before:**
```typescript
const campaign = await db
  .insert(campaigns)
  .values({
    name: 'My Campaign',
    status: 'active'
  })
  .returning();
```

**After:**
```typescript
const userId = req.user!.id;

const campaign = await db
  .insert(campaigns)
  .values({
    userId,  // ALWAYS attach userId
    name: 'My Campaign',
    status: 'active'
  })
  .returning();
```

### Pattern 4: Add userId to UPDATE Operations

**Before:**
```typescript
const updated = await db
  .update(campaigns)
  .set({ status: 'paused' })
  .where(eq(campaigns.id, campaignId))
  .returning();
```

**After:**
```typescript
const userId = req.user!.id;

const updated = await db
  .update(campaigns)
  .set({ status: 'paused' })
  .where(and(
    eq(campaigns.id, campaignId),
    eq(campaigns.userId, userId)  // Verify ownership
  ))
  .returning();
```

### Pattern 5: Add userId to DELETE Operations

**Before:**
```typescript
await db
  .delete(campaigns)
  .where(eq(campaigns.id, campaignId));
```

**After:**
```typescript
const userId = req.user!.id;

await db
  .delete(campaigns)
  .where(and(
    eq(campaigns.id, campaignId),
    eq(campaigns.userId, userId)  // Verify ownership
  ));
```

### Pattern 6: Add userId to Count Queries

**Before:**
```typescript
const [{ count }] = await db
  .select({ count: sql<number>`count(*)::int` })
  .from(leads);
```

**After:**
```typescript
const userId = req.user!.id;

const [{ count }] = await db
  .select({ count: sql<number>`count(*)::int` })
  .from(leads)
  .where(eq(leads.userId, userId));
```

### Pattern 7: Add userId to db.query.* Operations

**Before:**
```typescript
const campaign = await db.query.campaigns.findFirst({
  where: eq(campaigns.id, campaignId),
});
```

**After:**
```typescript
const userId = req.user!.id;

const campaign = await db.query.campaigns.findFirst({
  where: and(
    eq(campaigns.id, campaignId),
    eq(campaigns.userId, userId)
  ),
});
```

### Pattern 8: Update Filter Arrays

**Before:**
```typescript
const filters = [];
if (status) filters.push(eq(leads.status, status));
if (filters.length > 0) {
  query = query.where(and(...filters));
}
```

**After:**
```typescript
const userId = req.user!.id;

const filters = [eq(leads.userId, userId)];  // ALWAYS start with userId
if (status) filters.push(eq(leads.status, status));
// filters.length is always > 0 now
query = query.where(and(...filters));
```

---

## 📊 Controllers to Update (14 Tasks)

| # | Controller | Methods | Status |
|---|------------|---------|--------|
| 1 | leads.controller.ts | 11 methods | 🟡 Partial (3/11) |
| 2 | campaigns.controller.ts | ~8 methods | ⏳ Pending |
| 3 | workflows.controller.ts | ~6 methods | ⏳ Pending |
| 4 | emails.controller.ts | ~5 methods | ⏳ Pending |
| 5 | templates.controller.ts | ~5 methods | ⏳ Pending |
| 6 | custom-variables.controller.ts | ~4 methods | ⏳ Pending |
| 7 | config.controller.ts | ~4 methods | ⏳ Pending |
| 8 | scraping.controller.ts | ~3 methods | ⏳ Pending |
| 9 | analytics.controller.ts | ~6 methods | ⏳ Pending |
| 10 | api-performance.controller.ts | ~3 methods | ⏳ Pending |
| 11 | ai.controller.ts | ~3 methods | ⏳ Pending |
| 12 | settings.controller.ts | ~4 methods | ⏳ Pending |
| 13 | testing.controller.ts | ~2 methods | ⏳ Pending |
| 14 | Verify all queries | All | ⏳ Pending |

**Total Methods to Update:** ~64 methods across 13 controllers

---

## ✅ Verification Checklist

For each controller method:
- [ ] Changed `Request` to `AuthRequest`
- [ ] Extracted `userId` from `req.user!.id`
- [ ] Added `eq(table.userId, userId)` to ALL SELECT queries
- [ ] Added `userId` field to ALL INSERT operations
- [ ] Added `eq(table.userId, userId)` to ALL UPDATE queries
- [ ] Added `eq(table.userId, userId)` to ALL DELETE queries
- [ ] Updated logging to include `userId`
- [ ] Tested that users can only access their own data

---

## 🚨 Critical Rules

1. **ALWAYS filter by userId first** in WHERE clauses
2. **NEVER allow queries without userId** (except admin analytics)
3. **ALWAYS verify ownership** before UPDATE/DELETE
4. **ALWAYS attach userId** to INSERT operations
5. **Use `and()` operator** when combining userId with other filters

---

## 📝 Example: Complete Method Transformation

**Before:**
```typescript
async getCampaigns(req: Request, res: Response) {
  try {
    const { status, page = 1 } = req.query;
    
    let query = db.select().from(campaigns);
    
    if (status) {
      query = query.where(eq(campaigns.status, status));
    }
    
    const results = await query;
    
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

**After:**
```typescript
async getCampaigns(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { status, page = 1 } = req.query;
    
    logger.info('[CampaignsController] Getting campaigns', { userId });
    
    let query = db.select().from(campaigns);
    
    // Always filter by userId first
    const filters = [eq(campaigns.userId, userId)];
    if (status) {
      filters.push(eq(campaigns.status, status));
    }
    query = query.where(and(...filters));
    
    const results = await query;
    
    res.json({ success: true, data: results });
  } catch (error: any) {
    logger.error('[CampaignsController] Error getting campaigns', { 
      userId, 
      error: error.message 
    });
    res.status(500).json({ success: false, error: error.message });
  }
}
```

---

## 🎯 Implementation Plan

### Step 1: Complete Leads Controller (8 remaining methods)
- getBatchAnalytics
- importLinkedIn
- getLead
- createLead
- updateLead
- deleteLead
- exportLeads
- deleteBatch

### Step 2: Update Campaigns Controller
All methods need userId filtering

### Step 3: Update Workflows Controller
All methods need userId filtering

### Step 4: Update Emails Controller
All methods need userId filtering

### Step 5: Update Templates Controller
All methods need userId filtering

### Step 6: Update Remaining 8 Controllers
- custom-variables
- config
- scraping
- analytics
- api-performance
- ai
- settings
- testing

### Step 7: Verification
- Run tests
- Check for compilation errors
- Verify data isolation works

---

## 📈 Progress Tracking

**Phase 5 Tasks (14 total):**
- [x] Document pattern (this file)
- [ ] Update leads controller (3/11 methods done)
- [ ] Update campaigns controller
- [ ] Update workflows controller
- [ ] Update emails controller
- [ ] Update templates controller
- [ ] Update custom-variables controller
- [ ] Update config controller
- [ ] Update scraping controller
- [ ] Update analytics controller
- [ ] Update api-performance controller
- [ ] Update ai controller
- [ ] Update settings controller
- [ ] Test all controllers

**Status:** 1/14 tasks complete (7%)
**Target:** 14/14 tasks complete (100%)

---

## 🚀 Ready to Proceed

This document outlines the exact pattern needed for Phase 5. All 64+ methods across 13 controllers will be updated following these patterns to ensure complete data isolation per user.

**Next Steps:**
1. Complete leads controller (8 remaining methods)
2. Systematically update all 12 remaining controllers
3. Verify all queries filter by userId
4. Update progress tracking to 100%
