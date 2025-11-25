# 🚀 LeadNexConnect v2 - Quick Start Guide

## 📦 What You Have

This package contains a **70% complete** LeadNexConnect v2 application with:

✅ **Complete Backend Infrastructure:**
- Express API server setup with security (helmet, rate limiting)
- PostgreSQL database schema (8 tables)
- Drizzle ORM with migrations
- Winston logging system
- All environment configuration

✅ **Lead Generation Services:**
- Apollo.io API integration
- Hunter.io email verification
- Google Places API (ready to use)
- LinkedIn CSV import service

✅ **Core Business Logic:**
- Lead scoring algorithm
- Email generation with templates
- Email sending service (Nodemailer)
- Database seeding with 5+ email templates

✅ **Deployment Ready:**
- VPS deployment script
- Replit configuration
- PM2 ecosystem config
- Nginx reverse proxy setup

## ⚠️ What Needs Completion (Use Claude Code for This)

📝 **Remaining Backend (30%):**
- Controllers: campaigns, analytics, scraping, settings
- Routes: campaigns, analytics, scraping, settings  
- People Data Labs API service
- Web scraping services (Yelp, Yellow Pages)
- Follow-up automation job
- Campaign scheduler job

🎨 **Frontend (0% - Generate with Claude Code):**
- Complete React application
- Dashboard page with metrics
- Leads management page
- Campaign creator
- Analytics charts
- Settings page

---

## 🎯 Deployment Options

### Option 1: Replit (Easiest - 5 Minutes)

1. **Create New Repl:**
   - Go to replit.com
   - Click "Create Repl" → "Import from GitHub"
   - Or upload the tar.gz file

2. **Setup Database:**
   - Replit sidebar → "Database" → "PostgreSQL"
   - `DATABASE_URL` is auto-provided

3. **Add API Keys (Secrets Tab):**
   ```
   APOLLO_API_KEY=your_key_here
   HUNTER_API_KEY=your_key_here
   GOOGLE_PLACES_API_KEY=your_key_here
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   ```

4. **Run:**
   ```bash
   npm install
   npm run db:migrate
   npm run db:seed
   npm run start
   ```

5. **Access:**
   - API: `https://your-repl-name.your-username.repl.co/health`

---

### Option 2: VPS with WordPress (Full Control)

**Prerequisites:**
- Ubuntu/Debian VPS with sudo access
- Domain name pointed to VPS IP

**Quick Deploy:**

```bash
# 1. SSH into your VPS
ssh user@your-vps-ip

# 2. Run deployment script
sudo bash deploy-vps.sh

# 3. Edit .env file
sudo nano /var/www/leadnexconnect/.env

# 4. Restart services
pm2 restart leadnex-api
sudo systemctl reload nginx
```

**Manual Deploy Steps:**

```bash
# 1. Install dependencies
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs postgresql postgresql-contrib nginx
sudo npm install -g pm2

# 2. Setup PostgreSQL
sudo -u postgres psql
CREATE DATABASE leadnexconnect;
CREATE USER leaduser WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE leadnexconnect TO leaduser;
\q

# 3. Clone project
cd /var/www
sudo git clone YOUR_REPO_URL leadnexconnect
cd leadnexconnect
sudo npm install

# 4. Configure environment
sudo cp .env.example .env
sudo nano .env  # Edit with your values

# 5. Run migrations
npm run db:migrate
npm run db:seed

# 6. Build
npm run build

# 7. Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 8. Configure Nginx
sudo nano /etc/nginx/sites-available/leadnex
# Copy config from deploy-vps.sh
sudo ln -s /etc/nginx/sites-available/leadnex /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 9. Setup SSL
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 🔑 API Keys You Need

### 1. Apollo.io (100 free requests/month)
- Sign up: https://apollo.io
- Get API key: Settings → API → Generate Key
- Add to `.env`: `APOLLO_API_KEY=your_key`

### 2. Hunter.io (50 free requests/month)
- Sign up: https://hunter.io
- Get API key: API → API Keys
- Add to `.env`: `HUNTER_API_KEY=your_key`

### 3. Google Places API (Free $200 credit)
- Go to: https://console.cloud.google.com
- Enable "Places API"
- Create credentials → API Key
- Add to `.env`: `GOOGLE_PLACES_API_KEY=your_key`

### 4. Gmail SMTP (Free)
- Gmail account → Security → 2FA → App Passwords
- Generate app password for "Mail"
- Add to `.env`:
  ```
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your_email@gmail.com
  SMTP_PASS=your_16_char_app_password
  ```

---

## 🧪 Testing Your Deployment

### 1. Check API Health

```bash
# Local
curl http://localhost:4000/health

# Replit
curl https://your-repl.repl.co/health

# VPS
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "uptime": 123.45
}
```

### 2. Test Database Connection

```bash
# SSH into server
psql $DATABASE_URL

# Run query
SELECT COUNT(*) FROM leads;
```

### 3. Test Lead Generation

```bash
curl -X POST http://localhost:4000/api/leads/generate \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "spa",
    "country": "United States",
    "maxResults": 10,
    "sources": ["apollo"]
  }'
```

---

## 📊 Using Claude Code to Complete the Project

### Step 1: Upload to Claude Code

1. Extract the tar.gz file
2. Upload entire `leadnexconnect-v2` folder to Claude Code
3. Open `CLAUDE_CODE_INSTRUCTIONS.md`

### Step 2: Generate Missing Controllers

Tell Claude Code:

```
Generate all missing controllers based on CLAUDE_CODE_INSTRUCTIONS.md:
- campaigns.controller.ts
- analytics.controller.ts  
- scraping.controller.ts
- settings.controller.ts

Follow the same pattern as leads.controller.ts
```

### Step 3: Generate Routes

```
Generate all missing routes files:
- campaigns.routes.ts
- analytics.routes.ts
- scraping.routes.ts
- settings.routes.ts

Follow the same pattern as leads.routes.ts
```

### Step 4: Generate People Data Labs Service

```
Generate peopledatalabs.service.ts similar to apollo.service.ts
API docs: https://docs.peopledatalabs.com/docs/quickstart
```

### Step 5: Generate Frontend

```
Generate complete Next.js frontend with:
1. Dashboard page (metrics, charts)
2. Leads page (table, filters, generate button)
3. Campaigns page (list, create form)
4. Analytics page
5. Settings page

Use Tailwind CSS and shadcn/ui components.
API base URL: http://localhost:4000/api
```

### Step 6: Test Everything

```bash
# Terminal 1: Start API
cd leadnexconnect-v2
npm run dev:api

# Terminal 2: Start Frontend
npm run dev:web

# Visit http://localhost:3000
```

---

## 🎯 First Use Checklist

Once deployed, follow these steps:

1. ✅ **Test API health** - `/health` endpoint
2. ✅ **Verify database** - Run: `npm run db:seed`
3. ✅ **Test lead generation** - Generate 5 test leads
4. ✅ **Import LinkedIn CSV** - Upload sample CSV
5. ✅ **Create campaign** - Make test campaign
6. ✅ **Send test email** - Send to your own email
7. ✅ **Check logs** - `pm2 logs` or Replit console

---

## 🐛 Troubleshooting

### Issue: Database connection error

**Solution:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql $DATABASE_URL

# Check .env file
cat .env | grep DATABASE_URL
```

### Issue: API rate limit errors

**Solution:**
- Check API usage in settings
- Apollo: 100/month, Hunter: 50/month
- Use Google Places for volume (unlimited with $200 credit)

### Issue: Emails not sending

**Solution:**
```bash
# Gmail: Enable "Less secure app access"
# Or use App Password (recommended)

# Test SMTP connection
npm install -g nodemailer-smtp-test
nodemailer-smtp-test --host smtp.gmail.com --port 587 --user your@email.com --pass your_password
```

### Issue: PM2 process crashes

**Solution:**
```bash
# View logs
pm2 logs leadnex-api

# Restart process
pm2 restart leadnex-api

# Reset and restart
pm2 delete all
pm2 start ecosystem.config.js
```

---

## 📈 Next Steps After Deployment

1. **Generate Your First 100 Leads:**
   - Import LinkedIn Sales Navigator CSV (50 leads)
   - Use Apollo.io (10 leads)
   - Use Google Places (40 leads)

2. **Create Your First Campaign:**
   - Target: Spa & Wellness in US/UK
   - Template: Use seeded "Spa - Initial" template
   - Schedule: Manual or daily at 9 AM

3. **Monitor Performance:**
   - Check dashboard daily
   - Track open rates (target: >20%)
   - Monitor response rate (target: >2%)

4. **Scale Gradually:**
   - Week 1: 50 leads/week
   - Week 2-4: 100 leads/week
   - Month 2: 200+ leads/week

---

## 💰 Cost Breakdown (Monthly)

**Free Tier (Months 1-3):**
- PostgreSQL: Free (Neon.tech 3GB)
- Apollo.io: $0 (100 requests)
- Hunter.io: $0 (50 requests)
- Google Places: $0 ($200 credit = 40,000 requests)
- Email sending: $0 (Gmail SMTP)
- VPS: $5-10/month (or use existing WordPress server)

**Total: $5-10/month** (Just VPS cost)

**Paid Tier (Months 4+):**
- Add LinkedIn Sales Navigator: $80/month
- Upgrade Hunter.io: $49/month (500 searches)
- Keep free tiers for others
**Total: ~$140/month** for 1000+ leads/month

---

## 🎯 Success Metrics

**Week 1:**
- ✅ 100+ leads generated
- ✅ 50 emails sent
- ✅ 10+ emails opened (20% rate)

**Month 1:**
- ✅ 500+ leads in database
- ✅ 200 emails sent
- ✅ 5-10 responses
- ✅ 1-2 interested prospects

**Month 3:**
- ✅ 2000+ leads
- ✅ 1000+ emails sent
- ✅ 50+ responses
- ✅ 10+ paying customers

---

## 📞 Support

- **Technical Issues:** Check logs first (`pm2 logs` or Replit console)
- **API Errors:** Verify API keys in `.env`
- **Database Issues:** Check PostgreSQL connection
- **Email Issues:** Test SMTP credentials

---

## 🎉 You're Ready!

Your LeadNexConnect v2 is 70% complete and ready for Claude Code to finish the remaining 30%.

**Current Status:**
- ✅ Backend API: 80% complete
- ✅ Database: 100% complete
- ✅ Lead Generation: 75% complete
- ⏳ Controllers: 25% complete
- ⏳ Frontend: 0% complete

**Next Action:** Upload to Claude Code and use `CLAUDE_CODE_INSTRUCTIONS.md` to complete the project!

---

**Good luck! 🚀**
