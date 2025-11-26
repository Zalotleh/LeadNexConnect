# 🚀 LeadNexConnect v2 - ENHANCED

**AI-Powered Lead Generation, Qualification & Outreach Automation**

A comprehensive B2B lead generation and outreach platform with advanced lead scoring, website analysis, smart routing, and API performance tracking.

---

## ✨ What's New in v2

### 🎯 Phase 1-6 Enhancements (Complete)

#### **Phase 1: Enhanced Database Schema**
- 16 new fields in leads table for booking intent detection
- API performance tracking table (quota management, ROI)
- Lead source ROI tracking (full conversion funnel)
- Website analysis caching (30-day cache)

#### **Phase 2: Advanced Lead Qualification**
- **100-Point Scoring System**: Weighted algorithm (email 25pts, website 15pts, booking keywords 10pts, etc.)
- **Website Analysis**: Cheerio-based HTML scraping, detects 8 booking platforms (Calendly, Acuity, Square, etc.)
- **Digital Maturity Score**: 0-100 based on online presence
- **Booking Potential**: High/Medium/Low classification
- **Tier System**: 🔥 Hot (80+), ⚡ Warm (60-79), ❄️ Cold (<60)

#### **Phase 3: API Performance Tracking**
- Real-time API usage monitoring per source
- Quota tracking with warnings (green/yellow/red)
- ROI analysis (conversion rate, cost per lead, MRR)
- Monthly performance reports

#### **Phase 4: Smart Lead Routing**
- 6 intelligent routing scenarios:
  1. No website → QR code campaign
  2. Competitor tool → switch campaign
  3. Multi-location → enterprise pitch
  4. High booking intent → fast-track
  5. Phone-only → education first
  6. High quality → premium treatment
- 7 specialized email templates
- Priority assignment based on lead characteristics

#### **Phase 5: Complete Frontend UI**
- **Dashboard**: Tier-based KPIs, API performance, lead distribution
- **Leads List**: Clickable tier filters, color-coded badges, enhanced table
- **API Performance**: Monthly reports, ROI funnel, quota tracking, source comparison
- **Lead Generator**: Multi-source support, tier breakdown in results

#### **Phase 6: Enhanced Automation**
- Daily lead generation with V2 scoring and website analysis
- Daily outreach with smart routing and prioritization
- Weekly API performance reports (Mondays 8am)

---

## 📊 Key Metrics & Scoring

### Lead Quality Score (0-100 Points)
| Component | Weight | Description |
|-----------|--------|-------------|
| Email Verification | 25pts | Valid, verified email address |
| Website | 15pts | Professional website with SSL |
| Company Size | 15pts | Ideal: 10-500 employees |
| Booking Keywords | 10pts | "Book now", "Schedule", etc. |
| LinkedIn Profile | 10pts | Active company LinkedIn |
| Decision Maker | 10pts | Owner, CEO, Manager title |
| Google Rating | 5pts | 4+ stars on Google |
| Google Reviews | 5pts | 50+ reviews |
| Phone Number | 5pts | Valid phone number |
| Current Booking Tool | 5pts | Uses competitor tool |
| Multi-Location | 5pts | Multiple branches |

### Tier Classification
- **🔥 Hot (80-100)**: High-quality, ready to buy → Prioritize outreach
- **⚡ Warm (60-79)**: Good potential → Standard follow-up
- **❄️ Cold (<60)**: Low quality → Nurture campaign

### Digital Maturity Score (0-100)
Measures online presence:
- Professional website (30pts)
- Booking system (20pts)
- Google presence (15pts)
- Online reviews (15pts)
- Social media (10pts)
- Multi-location (10pts)

---

## 🎯 Lead Sources & API Limits

| Source | Monthly Quota | Cost | Best For |
|--------|---------------|------|----------|
| **Google Places** | 40,000 | Free | Local businesses (spas, restaurants, clinics) |
| **Apollo.io** | 100 | Free tier | B2B companies, tech startups |
| **Hunter.io** | 50 | Free tier | Email verification |
| **People Data Labs** | 100 | Trial | Contact enrichment |

---

## 🛠️ Tech Stack

**Backend (Node.js/TypeScript):**
- Express.js - REST API
- Drizzle ORM - Type-safe database queries
- PostgreSQL - Primary database
- Bull - Job queue for automation
- Cheerio - Web scraping
- Axios - HTTP client
- Node-cron - Job scheduling

**Frontend (Next.js/React):**
- Next.js 13+ - React framework
- TypeScript - Type safety
- Tailwind CSS - Styling
- TanStack Query - Data fetching
- Lucide Icons - Icon library

---

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm 9+
- PostgreSQL 15+
- API Keys (see Environment Variables)

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/Zalotleh/LeadNexConnect.git
cd LeadNexConnect

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 4. Setup database
cd packages/database
npm run db:push  # Apply migrations (select YES)

# 5. Start development servers

# Terminal 1 - API Server
cd apps/api
npm run dev  # http://localhost:4000

# Terminal 2 - Frontend
cd apps/web
npm run dev  # http://localhost:3000
```

---

## 🔐 Environment Variables

Create `.env` in project root:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/leadnexconnect

# API Keys
APOLLO_API_KEY=your_apollo_key
PEOPLEDATALABS_API_KEY=your_pdl_key
HUNTER_API_KEY=your_hunter_key
GOOGLE_PLACES_API_KEY=your_google_key

# Email (for outreach)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Application
PORT=4000
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

---

## 🎮 Usage

### 1. Generate Leads

**Via Frontend:**
1. Navigate to `/leads`
2. Click "Generate Leads"
3. Select source (Google Places, Apollo, etc.)
4. Choose industry and location
5. Set max results
6. Click "Generate" → See tier breakdown

**Via API:**
```bash
curl -X POST http://localhost:4000/api/leads/generate \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "spa",
    "country": "United States",
    "city": "New York",
    "sources": ["google_places"],
    "maxResults": 50
  }'

# Response includes tier breakdown:
{
  "success": true,
  "data": {
    "saved": 50,
    "duplicates": 5,
    "byTier": { "hot": 15, "warm": 25, "cold": 10 },
    "bySource": { "google_places": 50 }
  }
}
```

### 2. View Performance

Navigate to `/api-performance`:
- Monthly usage by source
- Quota tracking (green/yellow/red warnings)
- ROI funnel (leads → demos → trials → customers)
- Cost per lead and conversion rates

### 3. Filter by Tier

On `/leads` page:
- Click "Hot Leads" card → Filter 80+ scores
- Click "Warm Leads" → Filter 60-79
- Click "Cold Leads" → Filter <60
- See color-coded badges in table

### 4. Track API Usage

```bash
# Get monthly report
curl http://localhost:4000/api/performance/report

# Get ROI summary
curl http://localhost:4000/api/performance/roi

# Update conversions
curl -X POST http://localhost:4000/api/performance/conversion \
  -H "Content-Type: application/json" \
  -d '{
    "apiSource": "google_places",
    "demosBooked": 5,
    "trialsStarted": 2,
    "customersAcquired": 1
  }'
```

---

## 🤖 Automation Jobs

### Daily Lead Generation (9:00 AM)
- Generates leads for active campaigns
- Analyzes websites (booking tools, keywords)
- Applies V2 scoring (100-point system)
- Tracks API performance
- Logs tier breakdown

### Daily Outreach (9:00 AM)
- Finds new leads with score >= 60
- Sorts by quality (hot leads first)
- Applies smart routing
- Selects specialized templates
- Prioritized sending (hot=100ms, warm=200ms, cold=300ms)

### Weekly Performance Report (Mondays 8:00 AM)
- Comprehensive usage summary
- Per-source breakdown
- Quota warnings
- Quality assessment
- Conversion funnel analysis

---

## 🏗️ Architecture

```
leadnexconnect-v2/
├── apps/
│   ├── api/                 # Express backend
│   │   ├── src/
│   │   │   ├── controllers/  # Route handlers
│   │   │   ├── services/     # Business logic
│   │   │   │   ├── analysis/  # Website analysis
│   │   │   │   ├── crm/       # Scoring, enrichment
│   │   │   │   ├── lead-generation/  # API integrations
│   │   │   │   ├── outreach/  # Email, routing
│   │   │   │   └── tracking/  # Performance
│   │   │   ├── jobs/         # Cron jobs
│   │   │   ├── routes/       # API routes
│   │   │   └── utils/        # Helpers
│   │   └── package.json
│   └── web/                 # Next.js frontend
│       ├── src/
│       │   ├── pages/        # Routes (dashboard, leads, api-performance)
│       │   ├── components/   # React components
│       │   └── services/     # API client
│       └── package.json
└── packages/
    ├── database/            # Drizzle ORM
    │   ├── src/
    │   │   ├── schema/      # Database schema
    │   │   └── migrations/  # SQL migrations
    │   └── package.json
    └── shared/              # Shared types
        └── src/types/
```

---

## 📈 Database Schema

### Leads Table (Extended)
```sql
CREATE TABLE leads (
  -- Original fields
  id, company_name, email, phone, website, industry, ...
  
  -- NEW Phase 1 fields (16 additions)
  has_google_maps_listing BOOLEAN,
  google_rating DECIMAL(3,2),
  google_review_count INTEGER,
  has_booking_keywords BOOLEAN,
  booking_keyword_score INTEGER,
  current_booking_tool VARCHAR(50),
  has_appointment_form BOOLEAN,
  has_online_booking BOOLEAN,
  has_multi_location BOOLEAN,
  services_count INTEGER,
  booking_potential VARCHAR(20) DEFAULT 'medium',
  digital_maturity_score INTEGER DEFAULT 0,
  is_decision_maker BOOLEAN,
  has_weekend_hours BOOLEAN,
  response_time VARCHAR(20),
  price_level VARCHAR(20)
);

-- New Tables
CREATE TABLE api_performance (...);        -- API usage tracking
CREATE TABLE lead_source_roi (...);       -- Conversion funnel
CREATE TABLE website_analysis_cache (...); -- 30-day cache
```

---

## 🧪 Testing

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for comprehensive testing instructions.

**Quick Tests:**
```bash
# 1. Database migration
cd packages/database && npm run db:push

# 2. Generate test leads
curl -X POST http://localhost:4000/api/leads/generate \
  -H "Content-Type: application/json" \
  -d '{"industry":"spa","country":"United States","sources":["google_places"],"maxResults":5}'

# 3. Check performance tracking
curl http://localhost:4000/api/performance/report

# 4. Frontend (browser)
open http://localhost:3000
```

---

## 📚 API Documentation

### Lead Generation
- `POST /api/leads/generate` - Generate leads with tier classification
- `GET /api/leads` - List leads with filtering (tier, source, industry)
- `GET /api/leads/:id` - Get single lead

### API Performance
- `GET /api/performance/report` - Monthly usage report
- `GET /api/performance/roi` - ROI summary
- `POST /api/performance/conversion` - Track conversions

### Analytics
- `GET /api/analytics/dashboard` - Dashboard stats
- `GET /api/leads/by-tier` - Leads grouped by tier

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `PUT /api/campaigns/:id` - Update campaign

---

## 🎨 Screenshots

### Dashboard
- 8 KPI cards (total, hot/warm/cold, API usage, quality)
- Lead distribution chart
- Recent leads with tier badges

### Leads List
- Tier-based filtering (clickable cards)
- Color-coded quality scores
- Enhanced table with tier badges

### API Performance
- Monthly reports by source
- Quota tracking with warnings
- ROI conversion funnel
- Cost metrics

---

## 🚀 Deployment

### Production Build
```bash
# Build all packages
npm run build

# Start production server
NODE_ENV=production npm start
```

### Docker (Optional)
```bash
docker-compose up -d
```

### Environment Variables (Production)
- Set `NODE_ENV=production`
- Use production database
- Configure SMTP for real emails
- Set secure API keys

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

## 🙏 Acknowledgments

- Apollo.io - B2B lead data
- People Data Labs - Contact enrichment
- Hunter.io - Email verification
- Google Places API - Local business data

---

## 📞 Support

For issues or questions:
- GitHub Issues: https://github.com/Zalotleh/LeadNexConnect/issues
- Email: support@leadnexconnect.com

---

**Built with ❤️ for BookNex Solutions**

*Empowering businesses with AI-powered lead generation and automation*
