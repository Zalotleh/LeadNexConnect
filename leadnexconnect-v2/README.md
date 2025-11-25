# 🚀 LeadNexConnect v2

**Lead Generation, Outreach Automation & Mini-CRM for BookNex Solutions**

A comprehensive web application for generating high-quality B2B leads, automating email outreach campaigns, and managing customer relationships.

---

## 📋 Features

- ✅ **Multi-Source Lead Generation**: LinkedIn Sales Navigator, Apollo.io, People Data Labs, Google Places API
- ✅ **Email Enrichment**: Hunter.io integration for email verification
- ✅ **Smart Deduplication**: Automatic duplicate detection and merging
- ✅ **Lead Scoring**: AI-powered quality scoring (0-100)
- ✅ **Automated Outreach**: Industry-specific email campaigns with follow-ups
- ✅ **Campaign Management**: Create, schedule, and monitor outreach campaigns
- ✅ **Follow-Up Automation**: Scheduled follow-ups (Day 3, Day 8)
- ✅ **Mini-CRM**: Track lead status, responses, and engagement
- ✅ **Analytics Dashboard**: Real-time metrics and visualizations
- ✅ **Web Scraping**: Supplementary lead generation from public sources

---

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express + TypeScript
- PostgreSQL + Drizzle ORM
- Bull (job queue)
- Nodemailer (email sending)

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query (React Query)
- Recharts (analytics)

---

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 15+ (local or hosted)
- API Keys: Apollo.io, People Data Labs, Hunter.io, Google Places

### Step 1: Clone & Install

```bash
# Clone the repository
git clone <your-repo-url>
cd leadnexconnect-v2

# Install dependencies
npm install
```

### Step 2: Database Setup

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql

# Create database
createdb leadnexconnect

# Update .env with local connection
DATABASE_URL=postgresql://localhost:5432/leadnexconnect
```

**Option B: Hosted PostgreSQL** (Recommended for VPS/Replit)
- Neon.tech (Free tier: 3GB)
- Supabase (Free tier: 500MB)
- Railway (Free tier: 500MB)
- ElephantSQL (Free tier: 20MB)

Get connection string and add to `.env`:
```bash
DATABASE_URL=postgresql://user:pass@host.region.provider.com:5432/dbname
```

### Step 3: Environment Configuration

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

**Required Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `APOLLO_API_KEY` - Get from Apollo.io
- `PEOPLEDATALABS_API_KEY` - Get from People Data Labs
- `HUNTER_API_KEY` - Get from Hunter.io
- `GOOGLE_PLACES_API_KEY` - Get from Google Cloud Console
- `SMTP_USER` / `SMTP_PASS` - Gmail app password or SendGrid key

### Step 4: Database Migrations

```bash
# Run migrations to create tables
npm run db:migrate

# (Optional) Seed with sample data
npm run db:seed
```

### Step 5: Run Development

```bash
# Run both API and Web in parallel
npm run dev

# Or run separately:
npm run dev:api   # API on http://localhost:4000
npm run dev:web   # Web on http://localhost:3000
```

---

## 🚀 Deployment Options

### Option 1: Deploy on Replit

**Advantages:**
- Zero infrastructure management
- Free hosting (with compute limits)
- Built-in PostgreSQL
- Easy environment variable management

**Steps:**

1. **Create New Repl**
   - Go to replit.com
   - Click "Create Repl"
   - Select "Node.js"
   - Import from GitHub (or upload files)

2. **Setup PostgreSQL**
   - In Replit sidebar, click "Database" → "PostgreSQL"
   - Replit automatically provides `DATABASE_URL`

3. **Add Environment Variables**
   - Click "Secrets" (lock icon)
   - Add all variables from `.env.example`
   - `DATABASE_URL` is auto-provided by Replit

4. **Configure Run Command**
   - Edit `.replit` file:
   ```toml
   run = "npm run build && npm run start"
   
   [env]
   NODE_ENV = "production"
   ```

5. **Deploy**
   - Click "Run"
   - Access your app at: `https://your-repl-name.your-username.repl.co`

**Replit-Specific Config:**

```javascript
// In apps/api/src/index.ts
const PORT = process.env.PORT || 3000; // Replit uses port 3000
```

---

### Option 2: Deploy on VPS (Same Server as WordPress)

**Advantages:**
- Full control
- No compute limits
- Use existing server infrastructure

**Prerequisites:**
- Ubuntu/Debian VPS with root access
- WordPress already running (Apache/Nginx + PHP)
- Node.js 18+ installed

**Steps:**

1. **Connect to VPS**
   ```bash
   ssh user@your-server-ip
   ```

2. **Install Node.js (if not installed)**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   node --version  # Should be 18+
   ```

3. **Install PM2 (Process Manager)**
   ```bash
   sudo npm install -g pm2
   ```

4. **Clone Project**
   ```bash
   cd /var/www  # or wherever you want
   git clone <your-repo-url> leadnexconnect
   cd leadnexconnect
   ```

5. **Install Dependencies**
   ```bash
   npm install
   ```

6. **Setup Environment**
   ```bash
   cp .env.example .env
   nano .env  # Edit with production values
   ```

7. **Setup PostgreSQL**
   
   **Option A: Install locally on VPS**
   ```bash
   sudo apt install postgresql postgresql-contrib
   sudo -u postgres psql
   
   # In PostgreSQL:
   CREATE DATABASE leadnexconnect;
   CREATE USER leaduser WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE leadnexconnect TO leaduser;
   \q
   
   # Update .env
   DATABASE_URL=postgresql://leaduser:secure_password@localhost:5432/leadnexconnect
   ```
   
   **Option B: Use hosted PostgreSQL** (Easier)
   - Use Neon.tech, Supabase, or Railway
   - Add connection string to `.env`

8. **Run Migrations**
   ```bash
   npm run db:migrate
   ```

9. **Build Application**
   ```bash
   npm run build
   ```

10. **Start with PM2**
    ```bash
    # Start API
    pm2 start apps/api/dist/index.js --name leadnex-api
    
    # Start Frontend (if using Next.js)
    pm2 start apps/web/.next/standalone/server.js --name leadnex-web
    
    # Save PM2 process list
    pm2 save
    
    # Enable PM2 startup on reboot
    pm2 startup
    ```

11. **Configure Nginx Reverse Proxy**
    
    Create `/etc/nginx/sites-available/leadnex`:
    ```nginx
    server {
        server_name leads.yourdomain.com;
        
        # Frontend
        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
        
        # API
        location /api {
            proxy_pass http://localhost:4000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```
    
    Enable site:
    ```bash
    sudo ln -s /etc/nginx/sites-available/leadnex /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
    ```

12. **Setup SSL with Let's Encrypt**
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d leads.yourdomain.com
    ```

13. **Setup Cron Jobs** (Optional)
    ```bash
    crontab -e
    
    # Add:
    0 9 * * * cd /var/www/leadnexconnect && node apps/api/dist/jobs/daily-campaign.js
    0 10 * * * cd /var/www/leadnexconnect && node apps/api/dist/jobs/follow-up.js
    ```

**Managing PM2 Processes:**
```bash
pm2 list               # View all processes
pm2 logs leadnex-api   # View API logs
pm2 restart leadnex-api # Restart API
pm2 stop leadnex-api   # Stop API
pm2 monit              # Real-time monitoring
```

---

### Option 3: Deploy on Railway.app

1. Sign up at railway.app
2. Create new project from GitHub
3. Add PostgreSQL database (Railway provides free tier)
4. Add environment variables
5. Railway auto-deploys on git push

---

## 📊 Usage Guide

### 1. LinkedIn Sales Navigator Import

1. Go to LinkedIn Sales Navigator
2. Search for your target audience (e.g., "Spa owners in United States")
3. Save search results to a list
4. Click "Export" → Download CSV
5. In LeadNexConnect:
   - Navigate to **Leads** page
   - Click **Import** button
   - Upload CSV
   - Select enrichment options (Email, Phone)
   - Click **Import & Enrich**

### 2. Generate Leads via APIs

1. Navigate to **Leads** page
2. Click **+ Generate** button
3. Configure:
   - Industry: Spa & Wellness
   - Country: United States
   - City: (Optional)
   - Sources: Apollo.io, Google Places
4. Click **Generate Leads**
5. Review results and save

### 3. Create Outreach Campaign

1. Navigate to **Campaigns** page
2. Click **+ New Campaign**
3. Configure:
   - **Target Audience**: Industry, countries, company size
   - **Lead Sources**: Select data sources
   - **Email Template**: Choose or create template
   - **Scheduling**: Manual or automated
   - **Follow-ups**: Enable 3-day and 8-day follow-ups
4. Click **Launch Campaign**

### 4. Monitor Performance

1. Navigate to **Dashboard**
2. View metrics:
   - Total leads generated
   - Emails sent
   - Open rate
   - Response rate
   - Active campaigns
3. Check **Analytics** for detailed reports

---

## 🔧 Configuration

### Email Templates

Edit templates in: `apps/api/src/services/outreach/templates/`

Variables available:
- `{{company_name}}`
- `{{contact_name}}`
- `{{industry}}`
- `{{city}}`
- `{{country}}`

### Lead Scoring

Edit scoring algorithm in: `apps/api/src/services/crm/lead-scoring.service.ts`

Default scoring:
- Email verified: +40 points
- Website exists: +15 points
- Phone number: +10 points
- LinkedIn profile: +15 points
- Company size match: +20 points

### Automation Schedule

Edit in `.env`:
```bash
ENABLE_CRON_JOBS=true
DAILY_CAMPAIGN_TIME=09:00
FOLLOW_UP_CHECK_TIME=10:00
```

---

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL

# Check Drizzle connection
npm run db:push
```

### API Rate Limits

Monitor usage in **Settings** → **API Usage**

Free tiers:
- Apollo.io: 100 requests/month
- People Data Labs: 100 requests/month
- Hunter.io: 50 requests/month
- Google Places: $200 credit (~40,000 requests)

### Email Sending Issues

1. **Gmail**: Enable "App Passwords" in Google Account settings
2. **SendGrid**: Verify sender email address
3. **Replit Mail**: Use format `your-repl@replmail.com`

### PM2 Issues (VPS)

```bash
# View logs
pm2 logs

# Reset PM2
pm2 delete all
pm2 start ecosystem.config.js
```

---

## 📈 Scaling Tips

1. **Upgrade PostgreSQL** to paid tier for larger datasets
2. **Add Redis** for job queue performance
3. **Use CDN** for frontend assets
4. **Enable caching** for API responses
5. **Horizontal scaling** with load balancer

---

## 🔐 Security Best Practices

- ✅ Use strong `JWT_SECRET` in production
- ✅ Enable rate limiting
- ✅ Use HTTPS (SSL certificate)
- ✅ Regularly update dependencies
- ✅ Never commit `.env` file
- ✅ Use environment-specific configs
- ✅ Implement input validation
- ✅ Use parameterized SQL queries (Drizzle handles this)

---

## 📝 API Documentation

API runs on `http://localhost:4000` (dev) or your production URL.

### Endpoints

**Leads:**
- `GET /api/leads` - Get all leads
- `GET /api/leads/:id` - Get lead by ID
- `POST /api/leads/generate` - Generate new leads
- `POST /api/leads/import` - Import LinkedIn CSV
- `PATCH /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead

**Campaigns:**
- `GET /api/campaigns` - Get all campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/:id` - Get campaign details
- `POST /api/campaigns/:id/start` - Start campaign
- `POST /api/campaigns/:id/pause` - Pause campaign

**Analytics:**
- `GET /api/analytics/dashboard` - Dashboard metrics
- `GET /api/analytics/campaign/:id` - Campaign metrics

---

## 🤝 Support

For issues or questions:
- Email: zizo@booknex.com
- Documentation: [Your docs URL]

---

## 📄 License

MIT License - © 2024 BookNex Solutions

---

## 🎯 Roadmap

- [ ] AI-powered email personalization
- [ ] WhatsApp integration
- [ ] Multi-user support
- [ ] Advanced analytics with ML predictions
- [ ] Integration with Zapier/Make
- [ ] Mobile app (React Native)

---

**Built with ❤️ for BookNex Solutions by Zizo**
