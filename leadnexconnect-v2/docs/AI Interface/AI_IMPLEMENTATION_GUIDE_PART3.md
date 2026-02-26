# AI Interface Implementation Guide — Part 3
## Frontend Page Modifications + Dependencies

**Last Updated:** February 24, 2026

> This is Part 3 of 3. See Part 1 (backend files) and Part 2 (frontend components + main page) for the full picture.
>
> **BEFORE STARTING IMPLEMENTATION — Package Dependencies:**
>
> Install the new backend dependency for rate limiting (Fix #4):
> ```bash
> cd apps/api && npm install express-rate-limit
> cd apps/api && npm install --save-dev @types/express-rate-limit
> ```
>
> Install Zod for backend response validation (Enhancement #6) — check if already installed:
> ```bash
> cd apps/api && npm install zod
> ```
>
> Verify `@anthropic-ai/sdk` is installed:
> ```bash
> cd apps/api && npm install @anthropic-ai/sdk
> ```
>
> **Removed endpoint (do NOT implement):** `POST /api/ai-campaigns/detect-intent`
> Intent detection has been moved to the client-side utility `apps/web/src/utils/detect-intent.ts` (see Part 2).
> The `IntentDetectorService` backend class is kept in Part 1 for reference only but is no longer registered as a route.

---

## 16. MODIFIED: /apps/web/src/components/Layout.tsx

> **[A2 + B UI Decision — Feb 25, 2026]** Two changes in this file:
> 1. Add a `Sparkles` nav item linking to `/` (the Command Center)
> 2. Mount `CommandBar` once here, with a `useEffect` keyboard listener for Ctrl+K / Cmd+K

### Step 1 — Add nav item (after 'Campaigns', before 'Settings')

Find the `navigation` array around line 22-25:

```typescript
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Leads',     href: '/leads',     icon: Users },
  { name: 'Campaigns', href: '/campaigns', icon: Mail },
  // ADD THIS:
  { name: 'AI', href: '/', icon: Sparkles, badge: 'New' },
]
```

And in the nav link render, add the badge:

```typescript
// In the Link render for each nav item, add badge support:
<Link
  key={item.name}
  href={item.href}
  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
    isActive(item.href) ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
  }`}
>
  <item.icon className="w-5 h-5" />
  <span>{item.name}</span>
  {'badge' in item && item.badge && (
    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded-full">
      {item.badge}
    </span>
  )}
</Link>
```

Import `Sparkles` at the top:

```typescript
import { /* existing imports */, Sparkles } from 'lucide-react';
```

### Step 2 — Mount CommandBar with Ctrl+K listener

Add state and keyboard listener inside the `Layout` component function:

```typescript
import CommandBar from '@/components/ai/CommandBar';

// Inside Layout component, after existing useState calls:
const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);

// Add keyboard listener:
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setIsCommandBarOpen(prev => !prev);
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);

// Inside the returned JSX, at the top level (before or after the sidebar div):
<CommandBar isOpen={isCommandBarOpen} onClose={() => setIsCommandBarOpen(false)} />
```

Add `useEffect` to imports:

```typescript
import React, { useState, useEffect } from 'react';
```
-------------------
## 17. REPLACED: /apps/web/src/pages/index.tsx → Command Center

> **[A2 UI Decision — Feb 25, 2026]** `index.tsx` is no longer a redirect or a dashboard.
> It is now the full AI Command Center page — the app's entry point.
> The complete code is in **Part 2** under "15. NEW: /apps/web/src/pages/index.tsx".
>
> **Do NOT add a CTA card.** The Command Center IS the homepage.
> `/dashboard` remains accessible from the sidebar nav for users who prefer it.

### dashboard.tsx — minor update (reference back to Command Center)

In `dashboard.tsx`, update any "Create campaign" CTA buttons to link back to `/` instead of `/ai-create`:

```typescript
// Replace any Link href="/campaigns/new" or href="/ai-create" quick-create buttons with:
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

<Link href="/">
  <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
    <Sparkles className="w-4 h-4" />
    Create with AI
  </button>
</Link>
```
------------

## 18. MODIFIED: /apps/web/src/pages/campaigns.tsx
## Add the AI button to the page header (above the tabs), so it's always visible regardless of active tab:

```typescript
// In your campaigns.tsx page header section, alongside existing buttons:
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

// In the header actions div:
<Link href="/ai-create?type=campaign">
  <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium">
    <Sparkles className="w-4 h-4" />
    Create with AI
  </button>
</Link>
```
# Import Sparkles:
```typescript
import { /* existing imports */, Sparkles } from 'lucide-react';
```

---------
## 19. MODIFIED: /apps/web/src/pages/workflows.tsx
## In your current workflows.tsx header, add the AI button next to (not replacing) your existing buttons:
```typescript
// Your workflows page header should have 3 buttons total:
// 1. "Manual Builder" (your new button)
// 2. "Generate with AI" (new AI button)  
// 3. "Create Workflow" (existing button)

<Link href="/ai-create?type=workflow">
  <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium">
    <Sparkles className="w-4 h-4" />
    Generate with AI
  </button>
</Link>
```

--------

## 20. MODIFIED: /apps/web/src/pages/leads.tsx

## Add AI Create button:

## Add to header section:
## Verify: Check if you restructured the main leads.tsx page header. If yes, just add the button to your updated header:
``` typescript


// In leads.tsx header actions:
<Link href="/ai-create?type=leads">
  <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium">
    <Sparkles className="w-4 h-4" />
    Generate with AI
  </button>
</Link>
```

-----

## 🎨 OPTIONAL: Add animation CSS

## Create or update /apps/web/src/styles/globals.css:
``` css

/* Add to existing file or create if needed */

@keyframes pulse-delay {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animation-delay-200 {
  animation: pulse-delay 1.5s infinite;
  animation-delay: 0.2s;
}

.animation-delay-400 {
  animation: pulse-delay 1.5s infinite;
  animation-delay: 0.4s;
}
```
