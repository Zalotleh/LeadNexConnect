# 🔐 Authentication & Authorization Implementation Plan

**Last Updated:** February 10, 2026  
**Target Team Size:** 2 Users + 1 Admin  
**Architecture:** Multi-user with Data Isolation

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Database Schema Changes](#database-schema-changes)
3. [Authentication Architecture](#authentication-architecture)
4. [Authorization & Roles](#authorization--roles)
5. [Data Isolation Strategy](#data-isolation-strategy)
6. [API Endpoints](#api-endpoints)
7. [UI Pages & Components](#ui-pages--components)
8. [Implementation Phases](#implementation-phases)
9. [Migration Strategy](#migration-strategy)

---

## 🎯 System Overview

### **Key Requirements**

✅ **Authentication**
- Email/password login with predefined users
- Secure JWT-based session management
- Login/logout functionality
- Protected routes (all pages behind auth wall)

✅ **Authorization** 
- **2 Roles:** `user` (regular) and `admin`
- Role-based access control (RBAC)
- User-specific data isolation

✅ **Data Separation**
- All data segregated by `userId`
- Users can only access their own:
  - Leads
  - Campaigns
  - Workflows
  - Templates
  - Variables
  - API Keys
  - SMTP Configs
  - Analytics
  - Usage Metrics

✅ **Admin Capabilities**
- Add/delete users
- View aggregated analytics per user
- View usage metrics per user
- No access to user-specific data (only aggregated views)

---

## 🗄️ Database Schema Changes

### **1. New Table: `users`**

```typescript
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Authentication
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  
  // Profile
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  
  // Role & Status
  role: varchar('role', { length: 20 }).notNull().default('user'), // 'user' | 'admin'
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'inactive' | 'suspended'
  
  // Session Management
  lastLoginAt: timestamp('last_login_at'),
  lastActiveAt: timestamp('last_active_at'),
  
  // Security
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  lockedUntil: timestamp('locked_until'),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: uuid('created_by'), // Admin who created this user
});
```

### **2. New Table: `sessions`**

```typescript
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Token
  token: varchar('token', { length: 500 }).notNull().unique(),
  refreshToken: varchar('refresh_token', { length: 500 }),
  
  // Session Info
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  
  // Expiry
  expiresAt: timestamp('expires_at').notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  lastUsedAt: timestamp('last_used_at').defaultNow(),
});
```

### **3. New Table: `auditLog`**

```typescript
export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Who & What
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(), // 'login', 'logout', 'create_lead', etc.
  entityType: varchar('entity_type', { length: 50 }), // 'user', 'lead', 'campaign', etc.
  entityId: uuid('entity_id'),
  
  // Details
  description: text('description'),
  metadata: jsonb('metadata'), // { changes: {...}, ipAddress: '...', etc. }
  
  // Context
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  
  createdAt: timestamp('created_at').defaultNow(),
});
```

### **4. Modified Existing Tables** (Add `userId` column)

All user-specific tables need a `userId` foreign key:

```typescript
// ✅ Tables to modify:
leads -> add userId
campaigns -> add userId
workflows -> add userId
workflowSteps -> add userId (via workflow relation)
emailTemplates -> add userId
customVariables -> add userId
apiConfig -> add userId
smtpConfig -> add userId
scrapingJobs -> add userId
leadBatches -> add userId
emails -> add userId (via campaign relation)
campaignLeads -> add userId (via campaign relation)
apiPerformance -> add userId
leadSourceRoi -> add userId
websiteAnalysisCache -> shared (no userId - cache only)
apiUsage -> add userId
settings -> keep global OR add userId for user-specific settings
activityLog -> add userId
```

**Example Migration:**

```typescript
// Add userId to leads table
export const leads = pgTable('leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // ... rest of existing fields
});
```

---

## 🔐 Authentication Architecture

### **Tech Stack**

- **JWT (JSON Web Tokens)** for stateless authentication
- **bcrypt** for password hashing
- **express-session** (optional) for session management
- **cookie-parser** for secure cookie handling

### **Authentication Flow**

```
┌─────────────────────────────────────────────────────────────┐
│                      LOGIN FLOW                             │
└─────────────────────────────────────────────────────────────┘

1. User enters email/password → POST /api/auth/login

2. Backend validates credentials:
   - Check if user exists
   - Verify password with bcrypt.compare()
   - Check if user is active (not suspended/locked)
   - Check failed login attempts

3. If valid:
   - Generate JWT token (15min expiry)
   - Generate refresh token (7 days expiry)
   - Create session record
   - Update lastLoginAt
   - Log audit event
   - Return tokens + user info

4. Frontend:
   - Store tokens in httpOnly cookies
   - Store user info in localStorage (non-sensitive)
   - Redirect to /dashboard

┌─────────────────────────────────────────────────────────────┐
│                   PROTECTED REQUEST FLOW                    │
└─────────────────────────────────────────────────────────────┘

1. User makes API request → GET /api/leads

2. Middleware (authMiddleware):
   - Extract JWT from Authorization header or cookie
   - Verify token signature
   - Decode userId and role
   - Attach to req.user

3. Route handler:
   - Access req.user.id for data filtering
   - Apply role-based permissions

┌─────────────────────────────────────────────────────────────┐
│                      LOGOUT FLOW                            │
└─────────────────────────────────────────────────────────────┘

1. User clicks logout → POST /api/auth/logout

2. Backend:
   - Delete session from database
   - Add token to blacklist (optional)
   - Log audit event

3. Frontend:
   - Clear tokens from cookies
   - Clear localStorage
   - Redirect to /login
```

### **JWT Token Structure**

```typescript
interface JWTPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  iat: number; // Issued at
  exp: number; // Expiry
}
```

### **Environment Variables**

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Password Security
BCRYPT_ROUNDS=12

# Session
SESSION_SECRET=your-session-secret
```

---

## 👥 Authorization & Roles

### **Role Definitions**

| Role | Permissions |
|------|------------|
| **user** | - Full CRUD on own data (leads, campaigns, workflows, etc.)<br>- View own analytics<br>- Manage own API keys/SMTP<br>- Cannot view other users' data<br>- Cannot manage users |
| **admin** | - Add/delete users<br>- View aggregated analytics per user<br>- View usage metrics per user<br>- Cannot access individual user data directly<br>- System-wide settings management |

### **Permission Matrix**

| Resource | User | Admin |
|----------|------|-------|
| **Own Leads** | ✅ Create, Read, Update, Delete | ❌ No access |
| **Own Campaigns** | ✅ Full CRUD | ❌ No access |
| **Own Workflows** | ✅ Full CRUD | ❌ No access |
| **Own Templates** | ✅ Full CRUD | ❌ No access |
| **Own API Keys** | ✅ Full CRUD | ❌ No access |
| **Own Analytics** | ✅ View own stats | ❌ No access |
| **All Users Analytics** | ❌ No access | ✅ View aggregated |
| **User Management** | ❌ No access | ✅ Full CRUD |
| **System Settings** | ❌ No access | ✅ Full access |

### **Middleware Implementation**

```typescript
// apps/api/src/middleware/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin';
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token from header or cookie
    const token = req.headers.authorization?.replace('Bearer ', '') ||
                  req.cookies?.token;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'Authentication required' } 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      role: 'user' | 'admin';
    };

    // Attach user to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      error: { message: 'Invalid or expired token' } 
    });
  }
};

// Role-based middleware
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'admin') {
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
  if (req.user?.role !== 'user') {
    return res.status(403).json({ 
      success: false, 
      error: { message: 'User access required' } 
    });
  }
  next();
};
```

---

## 🔒 Data Isolation Strategy

### **Automatic Data Filtering**

All queries must filter by `userId` for user-specific data:

```typescript
// ❌ BEFORE (No user filtering)
const leads = await db.select().from(leadsTable);

// ✅ AFTER (User filtering)
const leads = await db
  .select()
  .from(leadsTable)
  .where(eq(leadsTable.userId, req.user.id));
```

### **Service Layer Example**

```typescript
// apps/api/src/services/leads.service.ts

export class LeadsService {
  async getLeads(userId: string, filters?: any) {
    // Always filter by userId
    const leads = await db
      .select()
      .from(leadsTable)
      .where(eq(leadsTable.userId, userId))
      // ... additional filters
      
    return leads;
  }

  async createLead(userId: string, data: any) {
    // Always attach userId
    const lead = await db
      .insert(leadsTable)
      .values({
        ...data,
        userId, // Force userId
      })
      .returning();
      
    return lead[0];
  }
}
```

### **Shared Resources**

Some data may be shared (not user-specific):

- `websiteAnalysisCache` - Cached website analysis (global)
- `settings` (system-wide) - Global app settings
- Admin-created templates (optional shared templates)

---

## 🌐 API Endpoints

### **Authentication Endpoints**

```typescript
// ================================================
// Authentication API (/api/auth)
// ================================================

POST   /api/auth/login           // Login with email/password
POST   /api/auth/logout          // Logout current session
POST   /api/auth/refresh         // Refresh access token
GET    /api/auth/me              // Get current user info
PUT    /api/auth/change-password // Change password
```

**Example Request/Response:**

```typescript
// POST /api/auth/login
Request: {
  email: "user1@example.com",
  password: "SecurePassword123"
}

Response: {
  success: true,
  data: {
    user: {
      id: "uuid",
      email: "user1@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "user"
    },
    token: "eyJhbGciOiJIUzI1NiIs...",
    refreshToken: "eyJhbGciOiJIUzI1NiIs...",
    expiresIn: 900 // 15 minutes
  }
}

// GET /api/auth/me
Response: {
  success: true,
  data: {
    id: "uuid",
    email: "user1@example.com",
    firstName: "John",
    lastName: "Doe",
    role: "user",
    lastLoginAt: "2026-02-10T10:00:00Z"
  }
}
```

### **User Management Endpoints (Admin Only)**

```typescript
// ================================================
// User Management API (/api/users) - Admin Only
// ================================================

GET    /api/users              // Get all users (admin only)
POST   /api/users              // Create new user (admin only)
GET    /api/users/:id          // Get user by ID (admin only)
PUT    /api/users/:id          // Update user (admin only)
DELETE /api/users/:id          // Delete user (admin only)
PUT    /api/users/:id/status   // Change user status (admin only)
```

**Example Request/Response:**

```typescript
// POST /api/users (Create User)
Request: {
  email: "user2@example.com",
  password: "TempPassword123",
  firstName: "Jane",
  lastName: "Smith",
  role: "user"
}

Response: {
  success: true,
  data: {
    id: "uuid",
    email: "user2@example.com",
    firstName: "Jane",
    lastName: "Smith",
    role: "user",
    status: "active",
    createdAt: "2026-02-10T10:00:00Z"
  },
  message: "User created successfully"
}
```

### **Admin Analytics Endpoints**

```typescript
// ================================================
// Admin Analytics API (/api/admin/analytics)
// ================================================

GET /api/admin/analytics/users           // Get per-user analytics summary
GET /api/admin/analytics/users/:userId   // Get specific user's analytics
GET /api/admin/analytics/usage           // Get usage metrics per user
GET /api/admin/analytics/api-usage       // Get API usage per user
```

**Example Response:**

```typescript
// GET /api/admin/analytics/users
Response: {
  success: true,
  data: [
    {
      userId: "uuid-1",
      userName: "John Doe",
      email: "user1@example.com",
      stats: {
        totalLeads: 1250,
        hotLeads: 320,
        activeCampaigns: 5,
        emailsSent: 3400,
        emailsOpened: 1200,
        responsesReceived: 85,
        conversionRate: 6.8
      },
      usage: {
        apolloRequests: 450,
        hunterRequests: 230,
        totalApiCalls: 680,
        emailsSentThisMonth: 890
      },
      lastActive: "2026-02-10T09:30:00Z"
    },
    {
      userId: "uuid-2",
      userName: "Jane Smith",
      email: "user2@example.com",
      stats: {
        totalLeads: 890,
        hotLeads: 210,
        activeCampaigns: 3,
        emailsSent: 2100,
        emailsOpened: 750,
        responsesReceived: 52,
        conversionRate: 5.8
      },
      usage: {
        apolloRequests: 320,
        hunterRequests: 180,
        totalApiCalls: 500,
        emailsSentThisMonth: 650
      },
      lastActive: "2026-02-10T08:15:00Z"
    }
  ]
}
```

### **Modified Existing Endpoints** (Add User Filtering)

All existing endpoints automatically filter by `req.user.id`:

```typescript
// Before: GET /api/leads (returns all leads)
// After:  GET /api/leads (returns only current user's leads)

// Before: POST /api/campaigns (creates campaign without userId)
// After:  POST /api/campaigns (automatically adds req.user.id)

// Before: GET /api/analytics/dashboard (global stats)
// After:  GET /api/analytics/dashboard (user-specific stats)
```

---

## 🎨 UI Pages & Components

### **1. Login Page (`/login`)**

**Location:** `apps/web/src/pages/login.tsx`

**Features:**
- Email/password input
- Login button
- Error handling (invalid credentials, account locked)
- Remember me
- Simple, clean design

**UI Structure:**

```tsx
┌─────────────────────────────────────┐
│                                     │
│      🔐 LeadNexConnect             │
│                                     │
│   ┌─────────────────────────────┐  │
│   │ Email                       │  │
│   │ [input field]              │  │
│   │                            │  │
│   │ Password                   │  │
│   │ [input field]              │  │
│   │                            │  │
│   │ [ ] Remember me            │  │
│   │                            │  │
│   │ [Login Button]             │  │
│   └─────────────────────────────┘  │
│                                     │
│   Error: Invalid credentials        │
│                                     │
└─────────────────────────────────────┘
```

**Code Structure:**

```tsx
// apps/web/src/pages/login.tsx

import { useState } from 'react';
import { useRouter } from 'next/router';
import { authAPI } from '@/services/api';
import toast from 'react-hot-toast';
import { Lock, Mail } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await authAPI.login({ email, password });
      
      // Store token and user info
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      
      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">LeadNexConnect</h1>
          <p className="text-gray-600 mt-2">Login to your account</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="user@example.com"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### **2. Admin Dashboard (`/admin/users`)**

**Location:** `apps/web/src/pages/admin/users.tsx`

**Features:**
- List all users
- Add new user button
- Edit user
- Delete user
- Change user status (active/inactive/suspended)
- View user analytics

**UI Structure:**

```
┌──────────────────────────────────────────────────────────┐
│ Users Management                         [+ Add User]    │
├──────────────────────────────────────────────────────────┤
│ Search: [________]  Role: [All ▼]  Status: [All ▼]      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Name          | Email            | Role  | Status | ... │
│─────────────────────────────────────────────────────────│
│ John Doe      | user1@...        | User  | Active | ⚙️  │
│ Jane Smith    | user2@...        | User  | Active | ⚙️  │
│ Admin User    | admin@...        | Admin | Active | ⚙️  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Code Structure:**

```tsx
// apps/web/src/pages/admin/users.tsx

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { adminAPI } from '@/services/api';
import { Plus, Edit, Trash2, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await adminAPI.getUsers();
      return data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => adminAPI.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User deleted successfully');
    },
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg"
          >
            <Plus className="w-5 h-5" />
            Add User
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Active
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users?.map((user: any) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-primary-600 hover:text-primary-900 mr-3">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteMutation.mutate(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
```

### **3. Admin Analytics (`/admin/analytics`)**

**Location:** `apps/web/src/pages/admin/analytics.tsx`

**Features:**
- View per-user analytics
- Aggregated metrics
- Usage comparison
- API usage per user
- Email sending stats per user

**UI Structure:**

```
┌──────────────────────────────────────────────────────────┐
│ User Analytics Overview                                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ User          | Leads | Campaigns | Emails | Conv% | ...│
│─────────────────────────────────────────────────────────│
│ John Doe      | 1,250 | 5         | 3,400  | 6.8%  | 📊 │
│ Jane Smith    | 890   | 3         | 2,100  | 5.8%  | 📊 │
│                                                          │
│ ─────────────────────────────────────────────────────────│
│ Total         | 2,140 | 8         | 5,500  | 6.4%  |    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### **4. Updated Layout Component**

**Add logout button and user info:**

```tsx
// apps/web/src/components/Layout.tsx (additions)

// Add to navigation section
<div className="border-t mt-auto">
  <div className="p-4">
    {/* User Info */}
    <div className="flex items-center space-x-3 mb-3">
      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
        <span className="text-primary-600 font-semibold">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </span>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="text-xs text-gray-500">{user?.email}</p>
      </div>
    </div>
    
    {/* Logout Button */}
    <button
      onClick={handleLogout}
      className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
    >
      <LogOut className="w-4 h-4 mr-3" />
      Logout
    </button>
  </div>
</div>

// Add admin menu items (only for admin users)
{user?.role === 'admin' && (
  <>
    <div className="border-t my-2"></div>
    <Link href="/admin/users" className="...">
      <Users className="w-5 h-5 mr-3" />
      User Management
    </Link>
    <Link href="/admin/analytics" className="...">
      <TrendingUp className="w-5 h-5 mr-3" />
      Admin Analytics
    </Link>
  </>
)}
```

### **5. Route Protection Component**

```tsx
// apps/web/src/components/ProtectedRoute.tsx

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ProtectedRoute({ children, requiredRole }: any) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
      router.push('/login');
      return;
    }

    if (requiredRole && user.role !== requiredRole) {
      router.push('/dashboard');
    }
  }, [router, requiredRole]);

  return <>{children}</>;
}
```

### **6. Update _app.tsx**

```tsx
// apps/web/src/pages/_app.tsx

import ProtectedRoute from '@/components/ProtectedRoute';

const publicRoutes = ['/login'];

function MyApp({ Component, pageProps, router }: AppProps) {
  const isPublicRoute = publicRoutes.includes(router.pathname);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      {isPublicRoute ? (
        <Component {...pageProps} />
      ) : (
        <ProtectedRoute>
          <Component {...pageProps} />
        </ProtectedRoute>
      )}
    </QueryClientProvider>
  );
}
```

---

## 🚀 Implementation Phases

### **Phase 1: Database & Backend (Week 1)**

✅ **Tasks:**
1. Create database migration for:
   - `users` table
   - `sessions` table
   - `auditLog` table
   - Add `userId` to all existing tables
2. Install dependencies: `bcrypt`, `jsonwebtoken`, `cookie-parser`
3. Create auth middleware
4. Create auth service & controller
5. Create user management service & controller
6. Update all existing services to filter by `userId`
7. Test API endpoints

**Deliverables:**
- Working authentication API
- Protected API endpoints
- User management API
- Admin analytics API

### **Phase 2: Frontend Auth (Week 2)**

✅ **Tasks:**
1. Create login page
2. Create auth service (API calls)
3. Implement route protection
4. Update Layout component (logout, user info)
5. Update all API calls to include auth token
6. Test login/logout flow

**Deliverables:**
- Working login page
- Protected frontend routes
- Logout functionality

### **Phase 3: Admin Interface (Week 3)**

✅ **Tasks:**
1. Create admin users management page
2. Create admin analytics page
3. Implement user CRUD operations
4. Test admin workflows

**Deliverables:**
- User management interface
- Admin analytics dashboard

### **Phase 4: Data Migration & Testing (Week 4)**

✅ **Tasks:**
1. Migrate existing data to user accounts
2. Create seed users (2 users + 1 admin)
3. Comprehensive testing:
   - Authentication flows
   - Data isolation
   - Role-based access
   - Admin operations
4. Security audit
5. Documentation

**Deliverables:**
- Migrated data
- Seed users
- Test results
- Documentation

---

## 🔄 Migration Strategy

### **Existing Data Migration**

Since you currently have data without `userId`, we need a migration strategy:

**Option 1: Assign All to Default User**
```sql
-- Create default user
INSERT INTO users (id, email, password_hash, first_name, last_name, role)
VALUES (
  'default-user-uuid',
  'legacy@leadnex.com',
  'hashed-password',
  'Legacy',
  'User',
  'user'
);

-- Migrate all leads
UPDATE leads SET user_id = 'default-user-uuid' WHERE user_id IS NULL;

-- Repeat for all tables
```

**Option 2: Distribute Evenly (if you want to start with separate data)**
```sql
-- Create 3 users
INSERT INTO users (id, email, ...) VALUES ('user1-id', 'user1@...', ...);
INSERT INTO users (id, email, ...) VALUES ('user2-id', 'user2@...', ...);
INSERT INTO users (id, email, ...) VALUES ('admin-id', 'admin@...', ...);

-- Distribute leads (example: split by ID ranges)
UPDATE leads SET user_id = 'user1-id' WHERE id IN (SELECT id FROM leads LIMIT 50 OFFSET 0);
UPDATE leads SET user_id = 'user2-id' WHERE id IN (SELECT id FROM leads LIMIT 50 OFFSET 50);
```

### **Seed Users Script**

```typescript
// packages/database/src/seed-users.ts

import bcrypt from 'bcrypt';
import { db } from './index';
import { users } from './schema';

async function seedUsers() {
  const defaultPassword = await bcrypt.hash('ChangeMe123!', 12);

  await db.insert(users).values([
    {
      email: 'user1@leadnex.com',
      passwordHash: defaultPassword,
      firstName: 'John',
      lastName: 'Doe',
      role: 'user',
      status: 'active',
    },
    {
      email: 'user2@leadnex.com',
      passwordHash: defaultPassword,
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'user',
      status: 'active',
    },
    {
      email: 'admin@leadnex.com',
      passwordHash: defaultPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      status: 'active',
    },
  ]);

  console.log('✅ Seed users created successfully!');
  console.log('Default password: ChangeMe123!');
}

seedUsers();
```

---

## 📊 Summary

### **New Components**

| Component | Type | Purpose |
|-----------|------|---------|
| `users` table | Database | Store user accounts |
| `sessions` table | Database | Track active sessions |
| `auditLog` table | Database | Security audit trail |
| Auth Middleware | Backend | Protect API routes |
| Auth Service | Backend | Handle authentication logic |
| User Service | Backend | User CRUD operations |
| Admin Service | Backend | Admin-specific operations |
| Login Page | Frontend | User authentication |
| Admin Users Page | Frontend | User management |
| Admin Analytics | Frontend | Per-user analytics |
| Protected Route | Frontend | Route protection |

### **Modified Components**

| Component | Modification |
|-----------|-------------|
| All database tables | Add `userId` column |
| All API services | Filter by `userId` |
| All API controllers | Use `req.user.id` |
| Layout component | Add logout, user info |
| _app.tsx | Add route protection |
| All frontend API calls | Include auth token |

### **API Endpoints Summary**

| Category | Endpoints | Auth Required | Role |
|----------|-----------|---------------|------|
| **Auth** | 4 endpoints | Varies | Public/User |
| **Users** | 6 endpoints | ✅ | Admin |
| **Admin Analytics** | 4 endpoints | ✅ | Admin |
| **Existing** | 50+ endpoints | ✅ | User (modified) |

---

## ✅ Checklist for Implementation

- [ ] Database schema changes
- [ ] Auth middleware implementation
- [ ] Auth API endpoints
- [ ] User management API
- [ ] Admin analytics API
- [ ] Update all services for user filtering
- [ ] Login page
- [ ] Route protection
- [ ] Admin users page
- [ ] Admin analytics page
- [ ] Update Layout component
- [ ] Data migration
- [ ] Seed users
- [ ] Testing
- [ ] Documentation

---

## 🎯 Next Steps

1. **Review this plan** - Approve or request changes
2. **Set up development environment** - Ensure all dependencies installed
3. **Start Phase 1** - Database and backend implementation
4. **Iterative development** - Build, test, refine
5. **Deploy** - Roll out to your team

---

**Questions or Changes?** Let me know if you'd like to modify any aspect of this plan before we proceed with implementation!
