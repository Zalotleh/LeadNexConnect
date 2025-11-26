# 🤖 AI Agent Quick Reference - LeadNexConnect Enhancement

## 📋 Execution Checklist

Use this checklist to track implementation progress:

### Phase 1: Database Schema ✅
- [ ] Update `packages/database/src/schema/index.ts` with new columns
- [ ] Add `apiPerformance` table
- [ ] Add `leadSourceRoi` table  
- [ ] Add `websiteAnalysisCache` table
- [ ] Run `npm run db:generate`
- [ ] Run `npm run db:migrate`

### Phase 2: Enhanced Lead Qualification ✅
- [ ] Create `apps/api/src/services/crm/lead-scoring-v2.service.ts`
- [ ] Create `apps/api/src/services/analysis/website-analysis.service.ts`
- [ ] Update `apps/api/src/controllers/leads.controller.ts` with enhanced processing
- [ ] Test lead scoring calculation
- [ ] Test website analysis

### Phase 3: API Performance Tracking ✅
- [ ] Create `apps/api/src/services/tracking/api-performance.service.ts`
- [ ] Create `apps/api/src/controllers/api-performance.controller.ts`
- [ ] Create `apps/api/src/routes/api-performance.routes.ts`
- [ ] Update `apps/api/src/index.ts` to register routes
- [ ] Integrate tracking in leads controller
- [ ] Test performance logging

### Phase 4: Smart Lead Routing ✅
- [ ] Create `apps/api/src/services/outreach/lead-routing.service.ts`
- [ ] Update campaign execution to use routing
- [ ] Test routing decisions for different lead types
- [ ] Verify email template selection

### Phase 5: Frontend UI ✅
- [ ] Create `apps/web/src/app/page.tsx` (Dashboard)
- [ ] Create `apps/web/src/app/leads/page.tsx` (Leads List)
- [ ] Create `apps/web/src/app/leads/generate/page.tsx` (Lead Generator)
- [ ] Create `apps/web/src/app/performance/page.tsx` (API Performance)
- [ ] Create `apps/web/src/app/campaigns/page.tsx` (Campaigns)
- [ ] Test all UI pages
- [ ] Verify API connectivity

### Phase 6: Testing ✅
- [ ] Test lead generation with all sources
- [ ] Test website analysis
- [ ] Test API performance tracking
- [ ] Test frontend-backend integration
- [ ] Load test with 100+ leads

---

## 🎯 Key Implementation Notes

### Database Migrations
```bash
# From project root
cd packages/database
npm run db:generate  # Creates migration file
npm run db:migrate   # Applies migration
```

### Adding New Services
1. Create service file in appropriate directory
2. Export service instance at bottom of file
3. Import and use in controllers
4. Add logging for debugging

### Frontend-Backend Connection
```typescript
// In frontend files, API calls should use:
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Example:
const response = await axios.get(`${API_BASE_URL}/api/leads`);
```

### Testing Individual Components

**Test Lead Scoring:**
```bash
# In apps/api/src
curl -X POST http://localhost:4000/api/leads/generate \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "spa",
    "country": "United States",
    "maxResults": 5,
    "sources": ["google_places"]
  }'
```

**Test Website Analysis:**
```bash
# Add test endpoint in leads controller
curl -X POST http://localhost:4000/api/leads/analyze-website \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://example.com" }'
```

**Test API Performance:**
```bash
curl http://localhost:4000/api/performance/report
```

---

## 📊 Expected File Structure After Completion

```
leadnexconnect-v2/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── controllers/
│   │       │   ├── leads.controller.ts (MODIFIED)
│   │       │   ├── api-performance.controller.ts (NEW)
│   │       │   └── campaigns.controller.ts (NEW)
│   │       ├── services/
│   │       │   ├── analysis/
│   │       │   │   └── website-analysis.service.ts (NEW)
│   │       │   ├── crm/
│   │       │   │   ├── lead-scoring.service.ts (EXISTING)
│   │       │   │   └── lead-scoring-v2.service.ts (NEW)
│   │       │   ├── outreach/
│   │       │   │   └── lead-routing.service.ts (NEW)
│   │       │   └── tracking/
│   │       │       └── api-performance.service.ts (NEW)
│   │       └── routes/
│   │           └── api-performance.routes.ts (NEW)
│   └── web/
│       └── src/
│           └── app/
│               ├── page.tsx (MODIFIED - Dashboard)
│               ├── leads/
│               │   ├── page.tsx (NEW)
│               │   └── generate/
│               │       └── page.tsx (NEW)
│               ├── performance/
│               │   └── page.tsx (NEW)
│               └── campaigns/
│                   └── page.tsx (NEW)
└── packages/
    └── database/
        └── src/
            ├── schema/
            │   └── index.ts (MODIFIED)
            └── migrations/
                └── 0002_add_enhanced_fields.sql (NEW)
```

---

## 🚨 Common Issues & Solutions

### Issue: TypeScript errors after adding new columns
**Solution:**
```bash
# Regenerate types
cd packages/database
npm run db:generate
cd ../../
npm install  # Refresh workspace dependencies
```

### Issue: Migration fails
**Solution:**
```bash
# Check PostgreSQL connection
psql $DATABASE_URL

# If migration file is corrupted, delete and regenerate:
rm packages/database/src/migrations/0002_*.sql
npm run db:generate
```

### Issue: Frontend can't connect to API
**Solution:**
```typescript
// Check CORS settings in apps/api/src/index.ts
app.use(cors({
  origin: 'http://localhost:3000', // Must match frontend URL
  credentials: true,
}));
```

### Issue: Website analysis times out
**Solution:**
```typescript
// Increase timeout in website-analysis.service.ts
const response = await axios.get(url, {
  timeout: 30000, // Increase to 30 seconds
  // ...
});
```

---

## 🎨 UI Component Patterns

### Metric Card
```typescript
<div className="bg-white rounded-lg shadow p-6">
  <div className="flex items-center justify-between mb-4">
    <span className="text-gray-500 text-sm font-medium">{title}</span>
    {icon}
  </div>
  <div className="text-3xl font-bold text-gray-900">{value}</div>
</div>
```

### Table Row
```typescript
<tr className="hover:bg-gray-50">
  <td className="px-6 py-4 whitespace-nowrap">
    <div className="text-sm font-medium text-gray-900">{data}</div>
  </td>
</tr>
```

### Status Badge
```typescript
<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
  status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
}`}>
  {status}
</span>
```

---

## ✅ Validation Checklist

Before marking complete, verify:

**Backend:**
- [ ] All services export properly
- [ ] Controllers have error handling
- [ ] Routes are registered in main app
- [ ] Database queries use proper types
- [ ] Logging is consistent
- [ ] Environment variables are documented

**Frontend:**
- [ ] All pages load without errors
- [ ] API calls have loading states
- [ ] Error messages display properly
- [ ] Mobile responsive (test at 375px, 768px, 1024px)
- [ ] No console errors
- [ ] TypeScript compiles without warnings

**Integration:**
- [ ] Lead generation → database → frontend display works
- [ ] Website analysis caching works
- [ ] API performance tracking logs correctly
- [ ] Lead routing applies correct templates

---

## 📈 Performance Targets

**Backend:**
- Lead generation: < 10s for 50 leads
- Website analysis: < 5s per site (with caching)
- API response time: < 500ms for database queries

**Frontend:**
- Initial page load: < 2s
- Navigation between pages: < 300ms
- Table render (100 rows): < 1s

---

## 🔄 Development Workflow

1. **Start Development Servers:**
```bash
# Terminal 1 - API
cd apps/api
npm run dev

# Terminal 2 - Frontend
cd apps/web
npm run dev
```

2. **Make Changes:**
- Edit files according to roadmap
- Save and watch for auto-reload

3. **Test Changes:**
- Use browser DevTools console
- Check API logs in terminal
- Verify database changes

4. **Commit:**
```bash
git add .
git commit -m "feat: implement [feature name]"
git push origin main
```

---

## 📚 Reference Documentation

**Drizzle ORM:** https://orm.drizzle.team/docs/overview
**Next.js:** https://nextjs.org/docs
**Tailwind CSS:** https://tailwindcss.com/docs
**Axios:** https://axios-http.com/docs/intro

---

## 🎯 Success Criteria

Implementation is complete when:

1. ✅ All database tables created and migrated
2. ✅ Lead scoring calculates accurately
3. ✅ Website analysis works and caches results
4. ✅ API performance tracking logs correctly
5. ✅ Lead routing selects appropriate templates
6. ✅ Dashboard displays real metrics
7. ✅ Leads page shows filtered results
8. ✅ Lead generation creates 50+ leads successfully
9. ✅ All TypeScript compiles without errors
10. ✅ Frontend connects to backend successfully

---

**Ready to implement? Follow the main roadmap document and use this quick reference for execution details!**
