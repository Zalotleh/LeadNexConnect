# 🔍 Authentication Plan - Additional Details & Verification

**This document contains additional details and missing items identified during verification**

> 📖 **Developer Guide:**  
> - Start with [AUTH-PLAN-SUMMARY.md](./AUTH-PLAN-SUMMARY.md) for overview  
> - Read [AUTH-IMPLEMENTATION-PLAN.md](./AUTH-IMPLEMENTATION-PLAN.md) for architecture understanding  
> - Use THIS document for step-by-step implementation tasks  
> - Each section below references the main plan for context  
> - **Track progress:** Update [Project Completion Tracking](./AUTH-PLAN-SUMMARY.md#-project-completion-tracking) to resume from where you stopped

---

## 📚 Quick Navigation

| Section | Purpose | Main Plan Reference |
|---------|---------|---------------------|
| [Existing API Endpoints](#verified-existing-api-endpoints-85-total) | All 85 endpoints to protect | [API Endpoints](./AUTH-IMPLEMENTATION-PLAN.md#api-endpoints) |
| [Background Jobs](#1-background-jobs-need-updates) | Jobs requiring userId | [Data Isolation](./AUTH-IMPLEMENTATION-PLAN.md#data-isolation-strategy) |
| [Services Refactoring](#2-services-need-complete-refactoring) | 20+ services to update | [Data Isolation](./AUTH-IMPLEMENTATION-PLAN.md#data-isolation-strategy) |
| [Database Migrations](#complete-database-migration-plan) | SQL scripts | [Database Schema](./AUTH-IMPLEMENTATION-PLAN.md#database-schema-changes) |
| [Middleware Implementation](#2-auth-middleware-implementation) | Auth & role middleware | [Authentication](./AUTH-IMPLEMENTATION-PLAN.md#authentication-architecture) |
| [Implementation Checklist](#complete-implementation-checklist) | 106 tasks | [Phases](./AUTH-IMPLEMENTATION-PLAN.md#implementation-phases) |

---

## ✅ Verified: Existing API Endpoints (85 total)

> 📖 **Reference:** See [AUTH-IMPLEMENTATION-PLAN.md - API Endpoints](./AUTH-IMPLEMENTATION-PLAN.md#api-endpoints) for endpoint design details

Based on codebase analysis, these are ALL existing endpoints that need userId filtering.  
**All controllers must extract `userId` from `req.user.id` (see [Middleware Implementation](#2-auth-middleware-implementation))**

### **Leads API** (`/api/leads`) - 11 endpoints
```
GET    /api/leads
GET    /api/leads/batches
GET    /api/leads/batches/:id/analytics
GET    /api/leads/export
GET    /api/leads/:id
POST   /api/leads
POST   /api/leads/generate
POST   /api/leads/import
PUT    /api/leads/:id
DELETE /api/leads/batches/:id
DELETE /api/leads/:id
```

### **Campaigns API** (`/api/campaigns`) - 14 endpoints
```
GET    /api/campaigns
GET    /api/campaigns/:id
GET    /api/campaigns/:id/leads
GET    /api/campaigns/:id/leads-with-activity
GET    /api/campaigns/:id/email-schedule
POST   /api/campaigns
POST   /api/campaigns/from-batch
POST   /api/campaigns/:id/leads
POST   /api/campaigns/:id/execute
POST   /api/campaigns/:id/start
POST   /api/campaigns/:id/pause
POST   /api/campaigns/:id/resume
PUT    /api/campaigns/:id
DELETE /api/campaigns/:id
```

### **Workflows API** (`/api/workflows`) - 6 endpoints
```
GET    /api/workflows
GET    /api/workflows/:id
POST   /api/workflows/generate
POST   /api/workflows/manual
PUT    /api/workflows/:id
DELETE /api/workflows/:id
```

### **Templates API** (`/api/templates`) - 6 endpoints
```
GET    /api/templates
GET    /api/templates/:id
POST   /api/templates
POST   /api/templates/:id/use
PUT    /api/templates/:id
DELETE /api/templates/:id
```

### **Custom Variables API** (`/api/custom-variables`) - 6 endpoints
```
GET    /api/custom-variables
GET    /api/custom-variables/:id
POST   /api/custom-variables
POST   /api/custom-variables/:id/use
PUT    /api/custom-variables/:id
DELETE /api/custom-variables/:id
```

### **Config API** (`/api/config`) - 13 endpoints
```
GET    /api/config/apis
GET    /api/config/apis/:apiSource
GET    /api/config/apis/:apiSource/unmasked
POST   /api/config/apis
DELETE /api/config/apis/:apiSource
GET    /api/config/smtp
GET    /api/config/smtp/:id
GET    /api/config/smtp/:id/unmasked
POST   /api/config/smtp
POST   /api/config/smtp/test
PUT    /api/config/smtp/:id
DELETE /api/config/smtp/:id
```

### **Emails API** (`/api/emails`) - 5 endpoints
```
GET    /api/emails
GET    /api/emails/:id
POST   /api/emails/send
GET    /api/emails/track/open/:id
GET    /api/emails/track/click/:id
```

### **Scraping API** (`/api/scraping`) - 6 endpoints
```
GET    /api/scraping/status
POST   /api/scraping/start
POST   /api/scraping/apollo
POST   /api/scraping/google-places
POST   /api/scraping/peopledatalabs
POST   /api/scraping/linkedin
```

### **Analytics API** (`/api/analytics`) - 3 endpoints
```
GET    /api/analytics/dashboard
GET    /api/analytics/campaigns/:id
GET    /api/analytics/leads/timeline
```

### **API Performance** (`/api/performance`) - 3 endpoints
```
GET    /api/performance/report
GET    /api/performance/roi
POST   /api/performance/conversion
```

### **AI API** (`/api/ai`) - 2 endpoints
```
POST   /api/ai/generate-email
GET    /api/ai/test
```

### **Settings API** (`/api/settings`) - 5 endpoints
```
GET    /api/settings
GET    /api/settings/unmasked/:key
POST   /api/settings/test-smtp
POST   /api/settings/clear-cache
PUT    /api/settings
```

### **Testing API** (`/api/testing`) - 6 endpoints
```
POST   /api/testing/generate-test-leads
POST   /api/testing/preview-email
POST   /api/testing/dry-run-workflow
POST   /api/testing/send-test-email
GET    /api/testing/email-schedule/:campaignId
DELETE /api/testing/cleanup-test-data
```

**TOTAL: 85 existing endpoints** (all need userId filtering)

---

## 🆕 Additional Missing Components

> 📖 **Reference:** See [AUTH-IMPLEMENTATION-PLAN.md - Data Isolation Strategy](./AUTH-IMPLEMENTATION-PLAN.md#data-isolation-strategy) for filtering patterns

### **1. Background Jobs Need Updates**

> **Implementation Note:** Jobs run for ALL users but must process each user's data separately.  
> See [Data Isolation Strategy](./AUTH-IMPLEMENTATION-PLAN.md#data-isolation-strategy) for filtering approach.

The app has 5 cron jobs that need userId support:

**File: `apps/api/src/jobs/daily-lead-generation.job.ts`**
```typescript
// CURRENT: Processes ALL active campaigns
const activeCampaigns = await db
  .select()
  .from(campaigns)
  .where(eq(campaigns.status, 'active'));

// NEEDED: Process campaigns per user
const activeCampaigns = await db
  .select()
  .from(campaigns)
  .where(and(
    eq(campaigns.status, 'active'),
    eq(campaigns.userId, userId) // Filter by user
  ));
```

**Jobs to update:**
1. `daily-lead-generation.job.ts` - Add userId filtering
2. `daily-outreach.job.ts` - Add userId filtering  
3. `follow-up-checker.job.ts` - Add userId filtering
4. `scheduled-campaigns.job.ts` - Add userId filtering
5. `send-campaign-emails.job.ts` - Add userId filtering

**Note:** Jobs run for ALL users, but need to process each user's data separately.

### **2. Services Need Complete Refactoring**

> 📖 **Reference:** See [AUTH-IMPLEMENTATION-PLAN.md - Data Isolation Strategy](./AUTH-IMPLEMENTATION-PLAN.md#data-isolation-strategy) for service update patterns

**Total Services: 20+ services across multiple directories**

All services in these directories need userId filtering.  
**Pattern:** Every service method must accept `userId` as the first parameter (see [Service Layer Example](./AUTH-IMPLEMENTATION-PLAN.md#service-layer-example)):

```
apps/api/src/services/
├── ai/
│   └── email-generator.service.ts
├── analysis/
│   ├── lead-analysis.service.ts
│   └── website-analysis.service.ts
├── campaign/
│   ├── campaign.service.ts
│   └── campaign-execution.service.ts
├── crm/
│   ├── enrichment-pipeline.service.ts
│   └── lead-scoring-v2.service.ts
├── lead-generation/
│   ├── apollo.service.ts
│   ├── google-places.service.ts
│   └── peopledatalabs.service.ts
├── outreach/
│   ├── email-generator.service.ts
│   ├── email-queue.service.ts
│   └── lead-routing.service.ts
├── tracking/
│   └── api-performance.service.ts
├── config.service.ts
└── settings.service.ts
```

**Example Service Update:**

```typescript
// BEFORE
export class LeadsService {
  async getLeads(filters: any) {
    return await db.select().from(leads).where(/* filters */);
  }
}

// AFTER
export class LeadsService {
  async getLeads(userId: string, filters: any) {
    return await db
      .select()
      .from(leads)
      .where(and(
        eq(leads.userId, userId),
        /* ...other filters */
      ));
  }
}
```

### **3. Controller Updates**

All 13 controllers need to extract `userId` from `req.user`:

```typescript
// Pattern for ALL controllers:

export class SomeController {
  async someMethod(req: AuthRequest, res: Response) {
    const userId = req.user!.id; // Extract from auth middleware
    
    // Pass to service
    const data = await someService.getData(userId, req.body);
    
    res.json({ success: true, data });
  }
}
```

**Controllers to update:**
1. `leads.controller.ts`
2. `campaigns.controller.ts`
3. `workflows.controller.ts`
4. `templates.controller.ts`
5. `custom-variables.controller.ts`
6. `config.controller.ts`
7. `emails.controller.ts`
8. `scraping.controller.ts`
9. `analytics.controller.ts`
10. `api-performance.controller.ts`
11. `ai.controller.ts`
12. `settings.controller.ts`
13. `testing.controller.ts`

### **4. Middleware Directory**

> 📖 **Reference:** See [AUTH-IMPLEMENTATION-PLAN.md - Middleware Implementation](./AUTH-IMPLEMENTATION-PLAN.md#middleware-implementation) for complete code

Need to CREATE middleware directory (doesn't exist).  
**Implementation:** See [Auth Middleware Code](#2-auth-middleware-implementation) below for complete implementation:

```
apps/api/src/middleware/
├── auth.middleware.ts          (NEW - JWT verification)
├── role.middleware.ts          (NEW - Role checking)
└── error-handler.middleware.ts (OPTIONAL - Better error handling)
```

### **5. Additional Database Enums Needed**

```typescript
// Add to schema/index.ts

export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'suspended']);
```

### **6. Relations for New Tables**

```typescript
// Add to schema/index.ts

export const usersRelations = relations(users, ({ many }) => ({
  leads: many(leads),
  campaigns: many(campaigns),
  workflows: many(workflows),
  templates: many(emailTemplates),
  sessions: many(sessions),
  auditLogs: many(auditLog),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}));

// Update existing relations to include user
export const leadsRelations = relations(leads, ({ one, many }) => ({
  user: one(users, {
    fields: [leads.userId],
    references: [users.id],
  }),
  // ... existing relations
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, {
    fields: [campaigns.userId],
    references: [users.id],
  }),
  // ... existing relations
}));
```

---
> 📖 **Reference:** See [AUTH-IMPLEMENTATION-PLAN.md - Database Schema Changes](./AUTH-IMPLEMENTATION-PLAN.md#database-schema-changes) for table designs

**Migration Order:** Follow these 5 migrations in sequence.  
**Drizzle Schema:** Each migration corresponds to schema changes in `packages/database/src/schema/index.ts`

### **Migration 1: Create New Tables**

> **Schema Reference:** See [users table](./AUTH-IMPLEMENTATION-PLAN.md#1-new-table-users), [sessions table](./AUTH-IMPLEMENTATION-PLAN.md#2-new-table-sessions), [auditLog table](./AUTH-IMPLEMENTATION-PLAN.md#3-new-table-auditlog)
## 📝 Complete Database Migration Plan

### **Migration 1: Create New Tables**

```sql
-- Create user_role enum
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Create user_status enum
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  status user_status NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMP,
  last_active_at TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID
);

-- Create sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  refresh_token VARCHAR(500),
  ip_address VARCHAR(50),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW()
);

-- Create audit_log table (rename from activity_log)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  description TEXT,
  metadata JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
```

### **Migration 2: Add userId to Existing Tables**

> **Schema Reference:** See [Modified Existing Tables](./AUTH-IMPLEMENTATION-PLAN.md#4-modified-existing-tables-add-userid-column) in main plan

```sql
-- Core tables
ALTER TABLE leads ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE campaigns ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE workflows ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE email_templates ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Configuration tables
ALTER TABLE custom_variables ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE api_config ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE smtp_config ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Batch/Job tables
ALTER TABLE scraping_jobs ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE lead_batches ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Derived tables (for query performance)
ALTER TABLE emails ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE campaign_leads ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE scheduled_emails ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Tracking tables
ALTER TABLE api_performance ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE api_usage ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- System tables
ALTER TABLE settings ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE; -- nullable for global settings
ALTER TABLE automated_campaign_runs ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create indexes for all userId columns
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX idx_custom_variables_user_id ON custom_variables(user_id);
CREATE INDEX idx_api_config_user_id ON api_config(user_id);
CREATE INDEX idx_smtp_config_user_id ON smtp_config(user_id);
CREATE INDEX idx_scraping_jobs_user_id ON scraping_jobs(user_id);
CREATE INDEX idx_lead_batches_user_id ON lead_batches(user_id);
CREATE INDEX idx_emails_user_id ON emails(user_id);
CREATE INDEX idx_campaign_leads_user_id ON campaign_leads(user_id);
CREATE INDEX idx_scheduled_emails_user_id ON scheduled_emails(user_id);
CREATE INDEX idx_api_performance_user_id ON api_performance(user_id);
CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_automated_campaign_runs_user_id ON automated_campaign_runs(user_id);
```

### **Migration 3: Seed Initial Users**

> **Script Reference:** See [Seed Users Script](./AUTH-IMPLEMENTATION-PLAN.md#seed-users-script) for TypeScript implementation

```sql
-- Insert seed users (passwords are 'ChangeMe123!' hashed with bcrypt rounds=12)
-- You'll need to generate these hashes using bcrypt in your seed script

INSERT INTO users (id, email, password_hash, first_name, last_name, role, status) VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'user1@leadnex.com', '$2b$12$...', 'John', 'Doe', 'user', 'active'),
  ('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'user2@leadnex.com', '$2b$12$...', 'Jane', 'Smith', 'user', 'active'),
  ('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'admin@leadnex.com', '$2b$12$...', 'Admin', 'User', 'admin', 'active');
```

> **Strategy Reference:** See [Migration Strategy](./AUTH-IMPLEMENTATION-PLAN.md#migration-strategy) for options (assign to default vs distribute)

### **Migration 4: Assign Existing Data to Users**

**⭐ RECOMMENDED: Option 1 - Assign All Data to One User**

This preserves all existing data under a single user account without any loss.

```sql
-- Assign all existing data to user1 (user1@leadnex.com)
-- This ensures NO data is lost during migration

-- Core tables
UPDATE leads SET user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' WHERE user_id IS NULL;
UPDATE campaigns SET user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' WHERE user_id IS NULL;
UPDATE workflows SET user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' WHERE user_id IS NULL;
UPDATE workflow_steps SET user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' WHERE user_id IS NULL;

-- Template & config tables
UPDATE email_templates SET user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' WHERE user_id IS NULL;
UPDATE custom_variables SET user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' WHERE user_id IS NULL;
UPDATE api_config SET user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' WHERE user_id IS NULL;
UPDATE smtp_config SET user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' WHERE user_id IS NULL;

-- Operational tables
UPDATE scraping_jobs SET user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' WHERE user_id IS NULL;
UPDATE lead_batches SET user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' WHERE user_id IS NULL;
UPDATE emails SET user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' WHERE user_id IS NULL;
UPDATE campaign_leads SET user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' WHERE user_id IS NULL;
UPDATE scheduled_emails SET user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' WHERE user_id IS NULL;

-- Analytics tables
UPDATE api_performance SET user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' WHERE user_id IS NULL;
UPDATE lead_source_roi SET user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' WHERE user_id IS NULL;
UPDATE api_usage SET user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' WHERE user_id IS NULL;

-- System tables
UPDATE automated_campaign_runs SET user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' WHERE user_id IS NULL;
-- Note: settings table keeps user_id as NULL for global settings

-- Verify data assignment
SELECT 
  'leads' as table_name, COUNT(*) as assigned_count 
FROM leads WHERE user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'
UNION ALL
SELECT 'campaigns', COUNT(*) FROM campaigns WHERE user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'
UNION ALL
SELECT 'workflows', COUNT(*) FROM workflows WHERE user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
-- ... add more verification queries
```

**Option 2: Split Data Between Users (For Testing Only)**
WITH lead_ids AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn, COUNT(*) OVER () as total
  FROM leads WHERE user_id IS NULL
)
UPDATE leads l
SET user_id = CASE 
  WHEN li.rn <= li.total / 2 THEN 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'
  ELSE 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e'
END
FROM lead_ids li
WHERE l.id = li.id;

-- Propagate userId to derived tables
UPDATE emails e
SET user_id = c.user_id
FROM campaigns c
WHERE e.campaign_id = c.id AND e.user_id IS NULL;

UPDATE campaign_leads cl
SET user_id = c.user_id
FROM campaigns c
WHERE cl.campaign_id = c.id AND cl.user_id IS NULL;

UPDATE scheduled_emails se
SET user_id = c.user_id
FROM campaigns c
WHERE se.campaign_id = c.id AND se.user_id IS NULL;
```

### **Migration 5: Make userId NOT NULL**

```sql
-- After data migration, make userId required for core tables
ALTER TABLE leads ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE campaigns ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE workflows ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE email_templates ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE custom_variables ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE api_config ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE smtp_config ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE lead_batches ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE scraping_jobs ALTER COLUMN user_id SET NOT NULL;

-- Keep nullable for settings (global vs user-specific)
-- ALTER TABLE settings ALTER COLUMN user_id SET NOT NULL; -- DON'T DO THIS
```

---

## � Migration Script for Existing Data

**File: `packages/database/src/migrate-existing-data.ts`**

Create this script to automate Option 1 data migration:

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

// User1 ID (the account that will own all existing data)
const USER1_ID = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

async function migrateExistingData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  console.log('🔄 Starting data migration...');
  console.log(`📌 Assigning all existing data to user1 (${USER1_ID})`);

  try {
    // Begin transaction
    await db.execute(sql`BEGIN`);

    // Define all tables that need data migration
    const tables = [
      'leads',
      'campaigns',
      'workflows',
      'workflow_steps',
      'email_templates',
      'custom_variables',
      'api_config',
      'smtp_config',
      'scraping_jobs',
      'lead_batches',
      'emails',
      'campaign_leads',
      'scheduled_emails',
      'api_performance',
      'lead_source_roi',
      'api_usage',
      'automated_campaign_runs',
    ];

    // Migrate each table
    for (const table of tables) {
      const result = await db.execute(
        sql`UPDATE ${sql.raw(table)} SET user_id = ${USER1_ID} WHERE user_id IS NULL`
      );
      
      console.log(`✅ ${table}: ${result.rowCount} records assigned to user1`);
    }

    // Verify migration
    console.log('\n📊 Verification:');
    for (const table of tables) {
      const countResult = await db.execute(
        sql`SELECT COUNT(*) as count FROM ${sql.raw(table)} WHERE user_id = ${USER1_ID}`
      );
      const count = countResult.rows[0].count;
      console.log(`   ${table}: ${count} records`);
    }

    // Check for any remaining NULL user_id values
    console.log('\n🔍 Checking for unmigrated data:');
    for (const table of tables) {
      const nullResult = await db.execute(
        sql`SELECT COUNT(*) as count FROM ${sql.raw(table)} WHERE user_id IS NULL`
      );
      const nullCount = nullResult.rows[0].count;
      if (nullCount > 0) {
        console.warn(`⚠️  ${table}: ${nullCount} records still have NULL user_id`);
      }
    }

    // Commit transaction
    await db.execute(sql`COMMIT`);
    console.log('\n✅ Data migration completed successfully!');
    console.log(`📌 All existing data is now owned by user1@leadnex.com`);

  } catch (error) {
    // Rollback on error
    await db.execute(sql`ROLLBACK`);
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
migrateExistingData()
  .then(() => {
    console.log('🎉 Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
```

**To run the migration script:**

```bash
# From project root
cd packages/database
npm run ts-node src/migrate-existing-data.ts
```

**Add to `packages/database/package.json`:**

```json
{
  "scripts": {
    "migrate:data": "ts-node src/migrate-existing-data.ts"
  }
}
```

---

## �🔧 Additional Backend Implementation Details

> 📖 **Reference:** See [AUTH-IMPLEMENTATION-PLAN.md - Authentication Architecture](./AUTH-IMPLEMENTATION-PLAN.md#authentication-architecture) for JWT flow

### **1. Create Middleware Directory**

> **Context:** Understand [Authentication Flow](./AUTH-IMPLEMENTATION-PLAN.md#authentication-flow) before implementing

```bash
mkdir -p apps/api/src/middleware
```

### **2. Auth Middleware Implementation**

> **Flow Reference:** See [Protected Request Flow](./AUTH-IMPLEMENTATION-PLAN.md#authentication-flow) for how this middleware works

**File: `apps/api/src/middleware/auth.middleware.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, users, sessions } from '@leadnex/database';
import { eq, and, gte } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin';
    firstName: string;
    lastName: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token from header or cookie
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || req.cookies?.token;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'Authentication required' } 
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      role: 'user' | 'admin';
    };

    // Check if session exists and is valid
    const session = await db.query.sessions.findFirst({
      where: and(
        eq(sessions.token, token),
        eq(sessions.userId, decoded.userId),
        gte(sessions.expiresAt, new Date())
      ),
    });

    if (!session) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'Session expired or invalid' } 
      });
    }

    // Get user details
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'User not found or inactive' } 
      });
    }

    // Update last used
    await db.update(sessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(sessions.id, session.id));

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as 'user' | 'admin',
      firstName: user.firstName,
      lastName: user.lastName,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ 
      success: false, 
      error: { message: 'Invalid or expired token' } 
    });
  }
};
```

### **3. Role Middleware**

> **Roles Reference:** See [Authorization & Roles](./AUTH-IMPLEMENTATION-PLAN.md#authorization--roles) for permission matrix

**File: `apps/api/src/middleware/role.middleware.ts`**

```typescript
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: { message: 'Authentication required' } 
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      error: { message: 'Admin access required' } 
    });
  }

  next();
};

export const requireUser = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: { message: 'Authentication required' } 
    });
  }

  if (req.user.role !== 'user') {
    return res.status(403).json({ 
      success: false, 
      error: { message: 'User access required' } 
    });
  }

  next();
};
```

### **4. Update index.ts to Apply Middleware**

**File: `apps/api/src/index.ts`**

```typescript
import { authMiddleware } from './middleware/auth.middleware';
import { requireAdmin } from './middleware/role.middleware';

// ... existing imports

// Public routes (no auth required)
app.get('/health', (req, res) => { ... });

// Auth routes (no auth required for login, but auth required for others)
import authRoutes from './routes/auth.routes';
app.use('/api/auth', authRoutes);

// Protected routes (require authentication)
app.use('/api/leads', authMiddleware, leadsRoutes);
app.use('/api/campaigns', authMiddleware, campaignsRoutes);
app.use('/api/workflows', authMiddleware, workflowsRoutes);
app.use('/api/templates', authMiddleware, templatesRoutes);
app.use('/api/custom-variables', authMiddleware, customVariablesRoutes);
app.use('/api/config', authMiddleware, configRoutes);
app.use('/api/emails', authMiddleware, emailsRoutes);
app.use('/api/scraping', authMiddleware, scrapingRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/performance', authMiddleware, apiPerformanceRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/testing', authMiddleware, testingRoutes);

// Admin routes (require admin role)
import usersRoutes from './routes/users.routes';
import adminAnalyticsRoutes from './routes/admin-analytics.routes';
app.use('/api/users', authMiddleware, requireAdmin, usersRoutes);
app.use('/api/admin/analytics', authMiddleware, requireAdmin, adminAnalyticsRoutes);
```

---

## 📦 Package Dependencies

> **Environment Setup:** See [Environment Variables](./AUTH-IMPLEMENTATION-PLAN.md#environment-variables) for required config

Add these to `apps/api/package.json`:

```json
{
  "dependencies": {
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "cookie-parser": "^1.4.6"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/cookie-parser": "^1.4.6"
  }
}
```

---

> 📖 **Reference:** See [AUTH-IMPLEMENTATION-PLAN.md - Implementation Phases](./AUTH-IMPLEMENTATION-PLAN.md#implementation-phases) for phase overview  
> 📊 **Progress Tracking:** See [AUTH-PLAN-SUMMARY.md](./AUTH-PLAN-SUMMARY.md) for statistics

**Total: 106 tasks across 12 phases (4 weeks)**

---

### **Phase 1: Database (Week 1)**

> **Reference:** [Database Schema Changes](./AUTH-IMPLEMENTATION-PLAN.md#database-schema-changes)  
> **Files:** `packages/database/src/schema/index.ts`, `packages/database/src/migrations/`
- [ ] Create `users` table migration
- [ ] Create `sessions` table migration
- [ ] Create `audit_log` table migration
- [ ] Add `userId` to all 18 tables
- [ ] Create all indexes
- [ ] Create enums (user_role, user_status)
- [ ] Add relations for new tables
- [ ] Test migrations locally
- [ ] Create seed script for 3 users
- [ ] Run seed script
- [ ] **Create data migration script** (see [Migration Script](#migration-script-for-existing-data))
- [ ] **Run data migration script** to assign all existing data to user1
- [ ] Verify all existing data assigned successfully
- [ ] Verify data integrity

### **Phase 2: Backend Auth (Week 1-2)**

> **Reference:** [Authentication Architecture](./AUTH-IMPLEMENTATION-PLAN.md#authentication-architecture)  
> **Files:** `apps/api/src/middleware/`, `apps/api/src/routes/auth.routes.ts`, `apps/api/src/controllers/auth.controller.ts`, `apps/api/src/services/auth.service.ts`
- [ ] Install dependencies (bcrypt, jwt, cookie-parser)
- [ ] Create middleware directory
- [ ] Implement auth.middleware.ts
- [ ] Implement role.middleware.ts
- [ ] Create auth routes file
- [ ] Create auth controller
- [ ] Create auth service
- [ ] Implement login endpoint
- [ ] Implement logout endpoint
- [ ] Implement refresh token endpoint
- [ ] Implement get current user endpoint
- [ ] Implement change password endpoint

> **Reference:** [User Management Endpoints](./AUTH-IMPLEMENTATION-PLAN.md#user-management-endpoints-admin-only)  
> **Files:** `apps/api/src/routes/users.routes.ts`, `apps/api/src/controllers/users.controller.ts`, `apps/api/src/services/users.service.ts`
- [ ] Test all auth endpoints

### **Phase 3: Backend User Management (Week 2)**
- [ ] Create users routes file
- [ ] Create users controller
- [ ] Create users service
- [ ] Implement get all users (admin)
- [ ] Implement create user (admin)
- [ ] Implement get user by ID (admin)
- [ ] Implement update user (admin)
- [ ] Implement delete user (admin)
- [ ] Implement change user status (admin)

> **Reference:** [Admin Analytics Endpoints](./AUTH-IMPLEMENTATION-PLAN.md#admin-analytics-endpoints)  
> **Files:** `apps/api/src/routes/admin-analytics.routes.ts`, `apps/api/src/controllers/admin-analytics.controller.ts`, `apps/api/src/services/admin-analytics.service.ts`
- [ ] Test all user management endpoints

### **Phase 4: Backend Admin Analytics (Week 2)**
- [ ] Create admin-analytics routes file
- [ ] Create admin-analytics controller
- [ ] Create admin-analytics service
- [ ] Implement get all users analytics
- [ ] Implement get user analytics by ID
- [ ] Implement get usage metrics per user
- [ ] Implement get API usage per user
- [ ] Test all admin analytics endpoints

### **Phase 5: Update All Services (Week 2-3)**

> **Reference:** [Service Layer Example](./AUTH-IMPLEMENTATION-PLAN.md#service-layer-example)  
> **Pattern:** All service methods must accept `userId` as first parameter and filter queries  
> **Files:** All files in `apps/api/src/services/`
- [ ] Update leads service (add userId param)
- [ ] Update campaigns service (add userId param)
- [ ] Update workflows service (add userId param)
- [ ] Update templates service (add userId param)
- [ ] Update custom-variables service (add userId param)
- [ ] Update config service (add userId param)
- [ ] Update emails service (add userId param)
- [ ] Update scraping service (add userId param)
- [ ] Update analytics service (add userId param)
- [ ] Update api-performance service (add userId param)
- [ ] Update ai service (add userId param)
- [ ] Update settings service (add userId param)
- [ ] Update all sub-services in directories
- [ ] Test each service with userId filtering

### **Phase 6: Update All Controllers (Week 3)**

> **Reference:** [Data Isolation Strategy](./AUTH-IMPLEMENTATION-PLAN.md#data-isolation-strategy)  
> **Pattern:** Extract `userId` from `req.user.id` and pass to services  
> **Files:** All files in `apps/api/src/controllers/`
- [ ] Update leads controller (extract req.user.id)
- [ ] Update campaigns controller
- [ ] Update workflows controller
- [ ] Update templates controller
- [ ] Update custom-variables controller
- [ ] Update config controller
- [ ] Update emails controller
- [ ] Update scraping controller
- [ ] Update analytics controller
- [ ] Update api-performance controller
- [ ] Update ai controller
- [ ] Update settings controller

> **Reference:** [Background Jobs](#1-background-jobs-need-updates) section above  
> **Pattern:** Jobs run for ALL users, process each user's data separately  
> **Files:** All files in `apps/api/src/jobs/`
- [ ] Update testing controller
- [ ] Test all controllers

### **Phase 7: Update Background Jobs (Week 3)**
- [ ] Update daily-lead-generation.job.ts
- [ ] Update daily-outreach.job.ts
- [ ] Update follow-up-checker.job.ts
- [ ] Update scheduled-campaigns.job.ts
- [ ] Update send-campaign-emails.job.ts
- [ ] Test jobs run for all users

### **Phase 8: Update index.ts (Week 3)**

> **Reference:** [Update index.ts](#4-update-indexts-to-apply-middleware) section above  
> **File:** `apps/api/src/index.ts`
- [ ] Add authMiddleware to all routes
- [ ] Add requireAdmin to admin routes
- [ ] Add cookie-parser middleware
- [ ] Test route protection

### **Phase 9: Frontend Auth (Week 3-4)**

> **Reference:** [UI Pages & Components](./AUTH-IMPLEMENTATION-PLAN.md#ui-pages--components)  
> **Files:** `apps/web/src/pages/login.tsx`, `apps/web/src/components/ProtectedRoute.tsx`, `apps/web/src/pages/_app.tsx`, `apps/web/src/components/Layout.tsx`, `apps/web/src/services/auth.service.ts`
- [ ] Create login page
- [ ] Create auth API service
- [ ] Create ProtectedRoute component
- [ ] Update _app.tsx with route protection
- [ ] Update Layout component (user info, logout)
- [ ] Add admin menu items for admin users
- [ ] Update all API calls to include auth token
- [ ] Test login/logout flow

### **Phase 10: Frontend Admin Pages (Week 4)**

> **Reference:** [Admin Dashboard](./AUTH-IMPLEMENTATION-PLAN.md#2-admin-dashboard-adminusers), [Admin Analytics](./AUTH-IMPLEMENTATION-PLAN.md#3-admin-analytics-adminanalytics)  
> **Files:** `apps/web/src/pages/admin/users.tsx`, `apps/web/src/pages/admin/analytics.tsx`
- [ ] Create /admin/users page
- [ ] Create /admin/analytics page
- [ ] Implement user CRUD UI
- [ ] Implement analytics display
- [ ] Test admin workflows

### **Phase 11: Testing & QA (Week 4)**

> **Reference:** [Success Criteria](#success-criteria) section below
- [ ] Test authentication flow
- [ ] Test authorization (role-based access)
- [ ] Test data isolation (user1 can't see user2's data)
- [ ] Test all 85 API endpoints with auth
- [ ] Test admin operations
- [ ] Test background jobs
- [ ] Test error cases
- [ ] Security audit
- [ ] Performance testing

### **Phase 12: Documentation (Week 4)**
- [ ] Update API documentation
- [ ] Create user guide
- [ ] Create admin guide
- [ ] Document migration process
- [ ] Document seed users
- [ ] Document environment variables

---

## 🎯 Success Criteria

> 📊 **Track Progress:** Use [AUTH-PLAN-SUMMARY.md](./AUTH-PLAN-SUMMARY.md) to verify implementation completeness

- ✅ All users can login/logout
- ✅ All pages protected behind auth
- ✅ Users can only see their own data
- ✅ Admin can manage users
- ✅ Admin can view per-user analytics
- ✅ All 85 endpoints filter by userId
- ✅ Background jobs work for all users
- ✅ No data leakage between users
- ✅ Session management works
- ✅ Password security implemented
- ✅ Audit logging functional

---

**Total Implementation Time: 4 weeks (2 weeks backend, 2 weeks frontend + testing)**
