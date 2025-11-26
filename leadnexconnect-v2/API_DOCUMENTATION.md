# LeadNexConnect v2 - API Documentation

Base URL: `http://localhost:4000/api`

## Authentication
Currently no authentication required. In production, implement JWT or API key authentication.

---

## Leads Endpoints

### Generate Leads (Enhanced)
Create new leads from multiple sources with automatic scoring and tier classification.

**Endpoint:** `POST /leads/generate`

**Request Body:**
```json
{
  "industry": "spa",
  "country": "United States",
  "city": "New York",           // optional
  "sources": ["google_places"],  // array: apollo, hunter, google_places, peopledatalabs
  "maxResults": 50
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "saved": 50,
    "duplicates": 5,
    "errors": [],
    "byTier": {
      "hot": 15,    // score >= 80
      "warm": 25,   // score 60-79
      "cold": 10    // score < 60
    },
    "bySource": {
      "google_places": 50
    }
  },
  "message": "Generated 50 leads successfully"
}
```

**Features:**
- Multi-source generation (parallel processing)
- Automatic website analysis (booking keywords, tools)
- V2 scoring (100-point weighted algorithm)
- Digital maturity calculation
- Booking potential assessment
- API performance tracking
- Tier classification (hot/warm/cold)

---

### List Leads
Get paginated list of leads with filtering.

**Endpoint:** `GET /leads`

**Query Parameters:**
```
page=1              // Page number (default: 1)
limit=50            // Results per page (default: 50, max: 100)
search=keyword      // Search in company name, email, contact name
tier=hot            // Filter by tier: hot, warm, cold
source=apollo       // Filter by source
industry=spa        // Filter by industry
status=new          // Filter by status: new, contacted, qualified, interested, lost
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "companyName": "Premium Spa NYC",
      "contactName": "John Doe",
      "email": "john@premiumspa.com",
      "phone": "+1234567890",
      "website": "https://premiumspa.com",
      "industry": "spa",
      "city": "New York",
      "country": "United States",
      "status": "new",
      "qualityScore": 85,              // NEW: 0-100 score
      "digitalMaturityScore": 75,      // NEW: digital presence score
      "bookingPotential": "high",      // NEW: high/medium/low
      "hasBookingKeywords": true,      // NEW
      "bookingKeywordScore": 8,        // NEW
      "currentBookingTool": "Calendly", // NEW
      "hasAppointmentForm": true,      // NEW
      "hasOnlineBooking": true,        // NEW
      "hasMultiLocation": false,       // NEW
      "servicesCount": 12,             // NEW
      "googleRating": 4.8,             // NEW
      "googleReviewCount": 250,        // NEW
      "source": "google_places",
      "createdAt": "2025-11-26T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

---

### Get Single Lead
Retrieve detailed information for a specific lead.

**Endpoint:** `GET /leads/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    // Same as list lead object, with additional fields:
    "enrichmentHistory": [...],
    "emailHistory": [...],
    "notes": [...]
  }
}
```

---

## API Performance Endpoints

### Monthly Performance Report
Get API usage and performance metrics for current or specified month.

**Endpoint:** `GET /performance/report`

**Query Parameters:**
```
month=11      // Month number (1-12), default: current month
year=2025     // Year, default: current year
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "apiSource": "google_places",
      "leadsGenerated": 150,
      "apiCallsUsed": 150,
      "quotaLimit": 40000,
      "quotaPercentage": 0.375,      // 0.375% used
      "averageQuality": 68,          // Average quality score
      "demosBooked": 12,             // Conversion metrics
      "trialsStarted": 6,
      "customersAcquired": 2,
      "month": 11,
      "year": 2025
    },
    {
      "apiSource": "apollo",
      "leadsGenerated": 80,
      "apiCallsUsed": 80,
      "quotaLimit": 100,
      "quotaPercentage": 80.0,       // 80% quota used
      "averageQuality": 75,
      "demosBooked": 15,
      "trialsStarted": 8,
      "customersAcquired": 3,
      "month": 11,
      "year": 2025
    }
  ]
}
```

**Quota Limits by Source:**
- `google_places`: 40,000/month
- `apollo`: 100/month (free tier)
- `hunter`: 50/month (free tier)
- `peopledatalabs`: 100/month (trial)

---

### ROI Summary
Get aggregated ROI metrics across all sources.

**Endpoint:** `GET /performance/roi`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLeadsGenerated": 230,
    "totalFirstContact": 180,        // Leads contacted
    "totalDemosBooked": 27,          // Demos scheduled
    "totalTrialsStarted": 14,        // Trials started
    "totalCustomersAcquired": 5,     // Paying customers
    "totalMRR": 2500,                // Monthly recurring revenue
    "averageConversionRate": 0.0217, // 2.17% conversion rate
    "averageCostPerLead": 0.15       // $0.15 per lead
  }
}
```

**Conversion Funnel:**
```
Leads (230) → 
First Contact (180, 78%) → 
Demos (27, 15%) → 
Trials (14, 52%) → 
Customers (5, 36%)
Overall: 5/230 = 2.17%
```

---

### Update Conversion Metrics
Track conversions for a specific API source.

**Endpoint:** `POST /performance/conversion`

**Request Body:**
```json
{
  "apiSource": "google_places",
  "demosBooked": 3,        // optional
  "trialsStarted": 2,      // optional
  "customersAcquired": 1   // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Conversion metrics updated successfully"
}
```

---

## Analytics Endpoints

### Dashboard Stats
Get high-level statistics for dashboard.

**Endpoint:** `GET /analytics/dashboard`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLeads": 230,
    "hotLeads": 55,      // score >= 80
    "warmLeads": 120,    // score 60-79
    "coldLeads": 55,     // score < 60
    "activeCampaigns": 3,
    "emailsSent": 180
  }
}
```

---

### Leads by Tier
Get leads grouped by quality tier.

**Endpoint:** `GET /leads/by-tier`

**Response:**
```json
{
  "success": true,
  "data": {
    "hot": 55,
    "warm": 120,
    "cold": 55
  }
}
```

---

## Campaigns Endpoints

### List Campaigns
Get all campaigns.

**Endpoint:** `GET /campaigns`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Spa Outreach - November",
      "status": "active",
      "industry": "spa",
      "leadsPerDay": 50,
      "emailsSent": 120,
      "leadsGenerated": 150,
      "schedule": "daily",
      "scheduleTime": "09:00",
      "followUpEnabled": true,
      "createdAt": "2025-11-01T00:00:00Z"
    }
  ]
}
```

---

### Create Campaign
Create a new outreach campaign.

**Endpoint:** `POST /campaigns`

**Request Body:**
```json
{
  "name": "Restaurant Outreach",
  "industry": "restaurant",
  "targetCountries": ["United States"],
  "targetCities": ["New York", "Los Angeles"],
  "leadsPerDay": 50,
  "scheduleType": "daily",
  "scheduleTime": "09:00",
  "followUpEnabled": true,
  "followUp1DelayDays": 3,
  "followUp2DelayDays": 8,
  "usesApollo": false,
  "usesGooglePlaces": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Restaurant Outreach",
    // ... campaign fields
  },
  "message": "Campaign created successfully"
}
```

---

## Error Responses

All endpoints return consistent error format:

**400 Bad Request:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Industry is required",
    "details": {
      "field": "industry",
      "constraint": "required"
    }
  }
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Lead not found with id: xyz"
  }
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

---

## Rate Limiting

**Global Limits:**
- 100 requests per minute per IP
- 1000 requests per hour per IP

**Lead Generation Limits:**
- Max 100 leads per request
- Max 500 leads per hour per IP

**Quota Warnings:**
- API returns warning header when quota > 90%
- `X-Quota-Warning: apollo quota at 95%`

---

## Webhooks (Coming Soon)

Subscribe to events:
- `lead.created` - New lead generated
- `lead.scored` - Lead scored/rescored
- `lead.qualified` - Lead reached qualified status
- `campaign.completed` - Campaign finished
- `quota.warning` - API quota > 90%

---

## Best Practices

### 1. Pagination
Always use pagination for large datasets:
```bash
# Get first page
curl "http://localhost:4000/api/leads?page=1&limit=50"

# Get next pages
curl "http://localhost:4000/api/leads?page=2&limit=50"
```

### 2. Filtering
Combine filters for specific results:
```bash
# Hot leads in spa industry
curl "http://localhost:4000/api/leads?tier=hot&industry=spa"

# Warm leads from Google Places
curl "http://localhost:4000/api/leads?tier=warm&source=google_places"
```

### 3. Error Handling
Always check `success` field and handle errors:
```javascript
const response = await fetch('/api/leads/generate', {...});
const data = await response.json();

if (!data.success) {
  console.error('Error:', data.error.message);
  // Handle error
  return;
}

// Use data.data
console.log('Generated:', data.data.saved, 'leads');
```

### 4. Monitoring
Track API performance:
```bash
# Check quota usage weekly
curl "http://localhost:4000/api/performance/report"

# Monitor ROI monthly
curl "http://localhost:4000/api/performance/roi"
```

---

## Code Examples

### Node.js (Axios)
```javascript
const axios = require('axios');

async function generateLeads() {
  try {
    const response = await axios.post('http://localhost:4000/api/leads/generate', {
      industry: 'spa',
      country: 'United States',
      city: 'New York',
      sources: ['google_places'],
      maxResults: 50
    });

    const { saved, byTier } = response.data.data;
    console.log(`Generated ${saved} leads:`);
    console.log(`🔥 Hot: ${byTier.hot}`);
    console.log(`⚡ Warm: ${byTier.warm}`);
    console.log(`❄️  Cold: ${byTier.cold}`);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

generateLeads();
```

### Python (Requests)
```python
import requests

def generate_leads():
    url = 'http://localhost:4000/api/leads/generate'
    payload = {
        'industry': 'spa',
        'country': 'United States',
        'city': 'New York',
        'sources': ['google_places'],
        'maxResults': 50
    }
    
    response = requests.post(url, json=payload)
    data = response.json()
    
    if data['success']:
        result = data['data']
        print(f"Generated {result['saved']} leads:")
        print(f"🔥 Hot: {result['byTier']['hot']}")
        print(f"⚡ Warm: {result['byTier']['warm']}")
        print(f"❄️  Cold: {result['byTier']['cold']}")
    else:
        print(f"Error: {data['error']['message']}")

generate_leads()
```

### cURL
```bash
# Generate leads
curl -X POST http://localhost:4000/api/leads/generate \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "spa",
    "country": "United States",
    "sources": ["google_places"],
    "maxResults": 50
  }'

# Get leads with filters
curl "http://localhost:4000/api/leads?tier=hot&limit=20"

# Check API performance
curl http://localhost:4000/api/performance/report | jq .
```

---

## Changelog

### v2.0.0 (November 2025)
- ✅ Enhanced lead generation with tier classification
- ✅ 100-point scoring system
- ✅ Website analysis and booking intent detection
- ✅ API performance tracking and ROI metrics
- ✅ Smart lead routing
- ✅ 16 new lead fields
- ✅ Enhanced frontend UI with tier filters

### v1.0.0 (Initial Release)
- Basic lead generation
- Email outreach
- Campaign management
- Simple lead scoring

---

**For support or feature requests, visit:** https://github.com/Zalotleh/LeadNexConnect/issues
