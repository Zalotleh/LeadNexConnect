# LeadNexConnect v2 - Testing Guide

## Prerequisites
- PostgreSQL database running
- Node.js 18+ installed
- All dependencies installed (`npm install` in root and packages)
- Environment variables configured (`.env` file)

## Quick Start Testing

### 1. Database Migration Test
```bash
# Verify migration is applied
cd packages/database
npm run db:push

# Check tables exist
psql $DATABASE_URL -c "\dt"
# Should show: leads, apiPerformance, leadSourceRoi, websiteAnalysisCache

# Check leads table columns
psql $DATABASE_URL -c "\d leads"
# Should show 16 new columns including:
# - hasGoogleMapsListing, googleRating, bookingKeywordScore
# - digitalMaturityScore, bookingPotential, currentBookingTool
```

### 2. API Server Test
```bash
# Start the API server
cd apps/api
npm run dev

# Server should start on http://localhost:4000
# Check health: curl http://localhost:4000/health
```

### 3. Frontend Test
```bash
# Start the Next.js dev server
cd apps/web
npm run dev

# Frontend should start on http://localhost:3000
# Open browser: http://localhost:3000
```

## API Endpoint Testing

### Lead Generation (Enhanced)
```bash
# Test enhanced lead generation with tier classification
curl -X POST http://localhost:4000/api/leads/generate \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "spa",
    "country": "United States",
    "city": "New York",
    "sources": ["google_places"],
    "maxResults": 5
  }'

# Expected Response:
{
  "success": true,
  "data": {
    "saved": 5,
    "duplicates": 0,
    "byTier": {
      "hot": 2,
      "warm": 2,
      "cold": 1
    },
    "bySource": {
      "google_places": 5
    }
  }
}

# Verify lead fields:
# - qualityScore (0-100)
# - digitalMaturityScore (0-100)
# - bookingPotential (high/medium/low)
# - hasBookingKeywords (boolean)
# - currentBookingTool (string or null)
```

### API Performance Tracking
```bash
# Get monthly performance report
curl http://localhost:4000/api/performance/report

# Expected Response:
{
  "success": true,
  "data": [
    {
      "apiSource": "google_places",
      "leadsGenerated": 5,
      "apiCallsUsed": 5,
      "quotaLimit": 40000,
      "quotaPercentage": 0.0125,
      "averageQuality": 65,
      "demosBooked": 0,
      "trialsStarted": 0,
      "customersAcquired": 0
    }
  ]
}

# Get ROI summary
curl http://localhost:4000/api/performance/roi

# Expected Response:
{
  "success": true,
  "data": {
    "totalLeadsGenerated": 5,
    "totalFirstContact": 0,
    "totalDemosBooked": 0,
    "totalTrialsStarted": 0,
    "totalCustomersAcquired": 0,
    "totalMRR": 0,
    "averageConversionRate": 0,
    "averageCostPerLead": 0
  }
}

# Update conversion metrics
curl -X POST http://localhost:4000/api/performance/conversion \
  -H "Content-Type: application/json" \
  -d '{
    "apiSource": "google_places",
    "demosBooked": 2,
    "trialsStarted": 1,
    "customersAcquired": 1
  }'
```

### Lead Scoring Test
```bash
# Get all leads to verify scoring
curl http://localhost:4000/api/leads?limit=10

# Check each lead has:
# - qualityScore: 0-100 (weighted algorithm)
# - digitalMaturityScore: 0-100 (based on digital presence)
# - bookingPotential: "high" | "medium" | "low"

# Tier classification:
# - Hot: qualityScore >= 80
# - Warm: qualityScore >= 60 && < 80
# - Cold: qualityScore < 60
```

## Frontend Testing

### Dashboard Page
1. Navigate to `http://localhost:3000`
2. Verify 4 main KPI cards:
   - Total Leads
   - Hot Leads (score 80+)
   - Warm Leads (score 60-79)
   - Cold Leads (score <60)
3. Verify 4 performance cards:
   - Average Lead Quality
   - Top Performing Source
   - Warm Leads
   - Cold Leads
4. Check "Recent Leads" section with tier badges
5. Check "Lead Distribution" chart

### Leads List Page
1. Navigate to `/leads`
2. Verify 5 stat cards (Total, Hot, Warm, Cold, Qualified)
3. Click Hot/Warm/Cold cards to filter
4. Check table has "Tier" column with badges
5. Verify score bars are color-coded (red/yellow/blue)
6. Test search and filters
7. Click "Generate Leads" button
8. Fill form and submit
9. Verify toast shows tier breakdown

### API Performance Page
1. Navigate to `/api-performance`
2. Verify 4 summary cards
3. Check ROI Overview section
4. Verify source performance table
5. Test month/year dropdowns
6. Check quota usage bars and color warnings

## Automated Job Testing

### Daily Lead Generation Job
```bash
# Start API server with jobs enabled
cd apps/api
npm run dev

# Check logs for:
# - "📅 Daily Lead Generation Job scheduled (9:00 AM)"
# - Website analysis for each lead
# - V2 scoring applied
# - Tier breakdown logged
# - API performance tracked

# Manual trigger (for testing):
# Edit daily-lead-generation.job.ts
# Change cron: '0 9 * * *' to '* * * * *' (every minute)
# Restart server and watch logs
```

### Daily Outreach Job
```bash
# Check logs for:
# - "📅 Daily Outreach Job scheduled (9:00 AM)"
# - Leads sorted by quality score
# - Smart routing applied
# - Template selection logged
# - Tier counts in summary

# Verify database:
psql $DATABASE_URL -c "SELECT status, emailsSent FROM leads WHERE status = 'contacted' LIMIT 5;"
```

### API Performance Report Job
```bash
# Runs every Monday at 8:00 AM
# Check logs for:
# - "📅 API Performance Report Job scheduled"
# - Weekly Performance Summary
# - Per-source breakdown
# - Quota warnings (if >= 90%)
# - Conversion funnel analysis
```

## Integration Tests

### End-to-End Lead Generation Flow
```bash
# 1. Generate leads
curl -X POST http://localhost:4000/api/leads/generate \
  -H "Content-Type: application/json" \
  -d '{"industry": "restaurant", "country": "United States", "city": "Los Angeles", "sources": ["google_places"], "maxResults": 10}'

# 2. Verify in database
psql $DATABASE_URL -c "SELECT id, companyName, qualityScore, digitalMaturityScore, bookingPotential FROM leads ORDER BY createdAt DESC LIMIT 10;"

# 3. Check API performance was tracked
psql $DATABASE_URL -c "SELECT * FROM api_performance WHERE api_source = 'google_places' ORDER BY month DESC LIMIT 1;"

# 4. Verify website analysis cache
psql $DATABASE_URL -c "SELECT website, has_booking_keywords, current_booking_tool FROM website_analysis_cache ORDER BY analyzed_at DESC LIMIT 5;"

# 5. Check frontend displays correctly
# Open http://localhost:3000/leads
# Verify new leads appear with tier badges
```

### Lead Scoring Validation
```bash
# Test high-quality lead (should be HOT)
curl -X POST http://localhost:4000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Premium Spa",
    "email": "owner@premiumspa.com",
    "phone": "+1234567890",
    "website": "https://premiumspa.com",
    "industry": "spa",
    "linkedin": "https://linkedin.com/company/premiumspa",
    "companySize": "50",
    "hasBookingKeywords": true,
    "bookingKeywordScore": 8,
    "hasAppointmentForm": true,
    "googleRating": 4.8,
    "googleReviewCount": 250,
    "isDecisionMaker": true
  }'

# Should return qualityScore >= 80 (HOT)

# Test low-quality lead (should be COLD)
curl -X POST http://localhost:4000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Basic Business",
    "phone": "+1234567890",
    "industry": "other"
  }'

# Should return qualityScore < 60 (COLD)
```

## Performance Testing

### Load Test Lead Generation
```bash
# Install Apache Bench
sudo apt-get install apache2-utils  # Ubuntu/Debian
# or
brew install httpd  # macOS

# Test 100 concurrent requests
ab -n 100 -c 10 -p data.json -T application/json \
  http://localhost:4000/api/leads/generate

# data.json:
# {"industry":"spa","country":"United States","sources":["google_places"],"maxResults":5}

# Check response times and error rate
# Target: < 5 seconds per request, 0% error rate
```

### Database Query Performance
```sql
-- Test lead filtering by tier (should use index on qualityScore)
EXPLAIN ANALYZE SELECT * FROM leads WHERE quality_score >= 80;

-- Test API performance aggregation (should be fast with proper indexes)
EXPLAIN ANALYZE SELECT 
  api_source, 
  SUM(leads_generated) as total_leads,
  AVG(average_quality) as avg_quality
FROM api_performance 
WHERE month = 11 AND year = 2025
GROUP BY api_source;

-- Verify indexes exist:
\di leads
\di api_performance
```

## Troubleshooting

### Common Issues

**Issue: Database connection fails**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify DATABASE_URL in .env
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT NOW();"
```

**Issue: Leads not scoring correctly**
```bash
# Check website analysis service logs
# Look for errors in API logs when generating leads

# Test website analysis directly:
node -e "
const { websiteAnalysisService } = require('./apps/api/src/services/analysis/website-analysis.service');
websiteAnalysisService.analyzeWebsite('https://example.com')
  .then(r => console.log(r))
  .catch(e => console.error(e));
"
```

**Issue: Frontend not showing tier badges**
```bash
# Verify Lead interface includes new fields
grep -r "qualityScore" apps/web/src/services/leads.service.ts

# Check API response includes fields
curl http://localhost:4000/api/leads?limit=1 | jq '.data[0]'
```

**Issue: Jobs not running**
```bash
# Check cron is enabled in index.ts
grep -A 5 "dailyLeadGenerationJob" apps/api/src/index.ts

# Verify jobs are started
# Should see "📅" emoji logs on server start

# Check system time is correct
date
```

## Success Criteria

✅ **Phase 1-6 Complete** when:
- [ ] All database tables exist with correct columns
- [ ] Lead generation returns tier breakdown (hot/warm/cold)
- [ ] Quality scores between 0-100 for all leads
- [ ] Website analysis data populated for leads with websites
- [ ] API performance tracked in database
- [ ] Dashboard shows tier cards and distribution
- [ ] Leads page has tier filtering and badges
- [ ] API Performance page shows ROI metrics
- [ ] Jobs run without errors (check logs)
- [ ] Smart routing applied to outreach emails

✅ **All Tests Pass** when:
- [ ] curl commands return expected data
- [ ] Frontend pages load without errors
- [ ] Tier classification is accurate
- [ ] Performance metrics update in real-time
- [ ] No TypeScript compilation errors
- [ ] Database queries are fast (<100ms for most)

## Next Steps
After testing, proceed with:
1. Production deployment preparation
2. Environment variable documentation
3. Backup and recovery procedures
4. Monitoring and alerting setup
5. User documentation and training materials
