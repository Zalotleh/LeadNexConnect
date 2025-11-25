# 🚀 LeadNexConnect v2 - Complete Code Generation Guide for Claude Code

This guide contains ALL remaining code files that need to be generated to complete the LeadNexConnect v2 application.

## 📋 What's Already Created

The following files have been created in `/home/claude/leadnexconnect-v2`:

✅ Root configuration files (package.json, .env.example, README.md)
✅ Database schema and configuration (packages/database/)
✅ Shared types and constants (packages/shared/)
✅ API server setup (apps/api/src/index.ts)
✅ Logger utility (apps/api/src/utils/logger.ts)
✅ Apollo.io service (apps/api/src/services/lead-generation/apollo.service.ts)
✅ Hunter.io service (apps/api/src/services/lead-generation/hunter.service.ts)

## 📝 Files to Generate

---

## BACKEND API FILES

### 1. Lead Generation Services

#### File: `apps/api/src/services/lead-generation/google-places.service.ts`

```typescript
import axios from 'axios';
import { logger } from '../../utils/logger';
import type { Lead, LeadSource } from '@leadnex/shared';

const GOOGLE_PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

interface PlacesSearchParams {
  industry: string;
  country?: string;
  city?: string;
  maxResults?: number;
}

export class GooglePlacesService {
  private apiKey: string;

  constructor() {
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_PLACES_API_KEY is not set');
    }
    this.apiKey = GOOGLE_API_KEY;
  }

  /**
   * Search for business leads using Google Places API
   */
  async searchLeads(params: PlacesSearchParams): Promise<Lead[]> {
    try {
      logger.info('[GooglePlaces] Searching for leads', { params });

      const query = this.buildSearchQuery(params);
      const location = params.city 
        ? `${params.city}, ${params.country || ''}` 
        : params.country || '';

      // Step 1: Text search to find places
      const searchResponse = await axios.get(
        `${GOOGLE_PLACES_API_BASE}/textsearch/json`,
        {
          params: {
            query: `${query} in ${location}`,
            key: this.apiKey,
          },
        }
      );

      if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
        logger.warn('[GooglePlaces] No places found');
        return [];
      }

      const places = searchResponse.data.results.slice(0, params.maxResults || 50);

      // Step 2: Get details for each place
      const leads: Lead[] = [];

      for (const place of places) {
        try {
          const detailsResponse = await axios.get(
            `${GOOGLE_PLACES_API_BASE}/details/json`,
            {
              params: {
                place_id: place.place_id,
                fields: 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total',
                key: this.apiKey,
              },
            }
          );

          const details = detailsResponse.data.result;

          const lead: Partial<Lead> = {
            companyName: details.name || place.name,
            website: details.website,
            phone: details.formatted_phone_number,
            address: details.formatted_address || place.formatted_address,
            city: params.city || this.extractCity(details.formatted_address),
            country: params.country,
            industry: params.industry,
            source: 'google_places' as LeadSource,
            qualityScore: 0,
            verificationStatus: 'unverified',
            status: 'new',
            followUpStage: 'initial',
            emailsSent: 0,
            emailsOpened: 0,
            emailsClicked: 0,
            customFields: {
              googleRating: details.rating,
              googleReviewCount: details.user_ratings_total,
              placeId: place.place_id,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          leads.push(lead as Lead);

          // Small delay to avoid rate limits
          await this.delay(100);
        } catch (error: any) {
          logger.error('[GooglePlaces] Error fetching place details', {
            placeId: place.place_id,
            error: error.message,
          });
        }
      }

      logger.info('[GooglePlaces] Successfully fetched leads', {
        count: leads.length,
        industry: params.industry,
      });

      return leads;
    } catch (error: any) {
      logger.error('[GooglePlaces] Error searching leads', {
        error: error.message,
      });
      throw error;
    }
  }

  private buildSearchQuery(params: PlacesSearchParams): string {
    const industryKeywords: Record<string, string[]> = {
      spa: ['spa', 'massage', 'wellness center'],
      clinic: ['medical clinic', 'healthcare', 'doctor'],
      tours: ['tour operator', 'tours', 'travel agency'],
      education: ['tutoring', 'education center', 'training'],
      fitness: ['gym', 'fitness center', 'yoga studio'],
      repair: ['repair service', 'maintenance'],
      consultancy: ['consultant', 'consulting firm'],
      beauty: ['beauty salon', 'hair salon', 'barber'],
      activities: ['activity center', 'entertainment'],
    };

    const keywords = industryKeywords[params.industry] || [params.industry];
    return keywords[0];
  }

  private extractCity(address: string): string {
    const parts = address.split(',');
    return parts.length > 1 ? parts[parts.length - 3]?.trim() || '' : '';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const googlePlacesService = new GooglePlacesService();
```

---

#### File: `apps/api/src/services/lead-generation/linkedin-import.service.ts`

```typescript
import { parse } from 'csv-parse/sync';
import { logger } from '../../utils/logger';
import type { Lead } from '@leadnex/shared';

interface LinkedInCSVRow {
  'First Name'?: string;
  'Last Name'?: string;
  'Company'?: string;
  'Title'?: string;
  'Email'?: string;
  'Phone'?: string;
  'Website'?: string;
  'LinkedIn Profile'?: string;
  'Location'?: string;
  'Industry'?: string;
  'Company Size'?: string;
}

export class LinkedInImportService {
  /**
   * Parse LinkedIn Sales Navigator CSV export
   */
  async importCSV(csvContent: string, industry: string): Promise<Lead[]> {
    try {
      logger.info('[LinkedInImport] Parsing CSV', {
        size: csvContent.length,
        industry,
      });

      const records: LinkedInCSVRow[] = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      logger.info('[LinkedInImport] Parsed CSV records', { count: records.length });

      const leads: Lead[] = records.map((row) => {
        const location = this.parseLocation(row.Location || '');

        const lead: Partial<Lead> = {
          companyName: row.Company || 'Unknown Company',
          website: row.Website,
          email: row.Email,
          phone: row.Phone,
          contactName: `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim(),
          jobTitle: row.Title,
          city: location.city,
          country: location.country,
          industry: row.Industry || industry,
          companySize: this.normalizeCompanySize(row['Company Size']),
          source: 'linkedin',
          qualityScore: 0,
          verificationStatus: 'unverified',
          status: 'new',
          followUpStage: 'initial',
          emailsSent: 0,
          emailsOpened: 0,
          emailsClicked: 0,
          linkedinUrl: row['LinkedIn Profile'],
          linkedinSalesNavData: row as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        return lead as Lead;
      });

      logger.info('[LinkedInImport] Converted to leads', { count: leads.length });

      return leads;
    } catch (error: any) {
      logger.error('[LinkedInImport] Error importing CSV', {
        error: error.message,
      });
      throw new Error(`Failed to import LinkedIn CSV: ${error.message}`);
    }
  }

  private parseLocation(location: string): { city?: string; country?: string } {
    if (!location) return {};

    const parts = location.split(',').map(p => p.trim());
    
    if (parts.length >= 2) {
      return {
        city: parts[0],
        country: parts[parts.length - 1],
      };
    }

    return { country: location };
  }

  private normalizeCompanySize(size?: string): string {
    if (!size) return '1-10';

    const sizeMap: Record<string, string> = {
      '1-10': '1-10',
      '11-50': '11-50',
      '51-200': '51-200',
      '201-500': '201-500',
      '501-1000': '501-1000',
      '1001-5000': '1000+',
      '5001-10000': '1000+',
      '10001+': '1000+',
    };

    return sizeMap[size] || '1-10';
  }
}

export const linkedInImportService = new LinkedInImportService();
```

---

### 2. CRM Services

#### File: `apps/api/src/services/crm/lead-scoring.service.ts`

```typescript
import { logger } from '../../utils/logger';
import type { Lead } from '@leadnex/shared';
import { LEAD_SCORING } from '@leadnex/shared';

export class LeadScoringService {
  /**
   * Calculate quality score for a lead (0-100)
   */
  calculateScore(lead: Partial<Lead>): number {
    let score = 0;

    // Email quality (40 points max)
    if (lead.email) {
      score += 20;
      if (lead.verificationStatus === 'email_verified') {
        score += LEAD_SCORING.EMAIL_VERIFIED - 20; // Additional 20 points
      }
    }

    // Website exists (15 points)
    if (lead.website) {
      score += LEAD_SCORING.WEBSITE_EXISTS;
    }

    // Phone number (10 points)
    if (lead.phone) {
      score += LEAD_SCORING.PHONE_NUMBER;
    }

    // LinkedIn profile (15 points)
    if (lead.source === 'linkedin' || lead.linkedinUrl) {
      score += LEAD_SCORING.LINKEDIN_PROFILE;
    }

    // Company size match (20 points)
    if (this.isTargetCompanySize(lead.companySize)) {
      score += LEAD_SCORING.COMPANY_SIZE_MATCH;
    }

    logger.debug('[LeadScoring] Calculated score', {
      companyName: lead.companyName,
      score,
    });

    return Math.min(score, 100);
  }

  /**
   * Check if company size is in target range
   */
  private isTargetCompanySize(size?: string): boolean {
    const targetSizes = ['11-50', '51-200', '201-500'];
    return size ? targetSizes.includes(size) : false;
  }

  /**
   * Classify lead as hot, warm, or cold based on score
   */
  classifyLead(score: number): 'hot' | 'warm' | 'cold' {
    if (score >= 75) return 'hot';
    if (score >= 50) return 'warm';
    return 'cold';
  }
}

export const leadScoringService = new LeadScoringService();
```

---

### 3. Outreach Services

#### File: `apps/api/src/services/outreach/email-generator.service.ts`

```typescript
import { db } from '@leadnex/database';
import { emailTemplates } from '@leadnex/database';
import { eq } from 'drizzle-orm';
import { logger } from '../../utils/logger';

interface GenerateEmailParams {
  companyName: string;
  contactName?: string;
  industry: string;
  city?: string;
  country?: string;
  followUpStage?: string;
}

export class EmailGeneratorService {
  /**
   * Generate personalized email content
   */
  async generateEmail(params: GenerateEmailParams): Promise<{
    subject: string;
    bodyText: string;
    bodyHtml: string;
  }> {
    try {
      logger.info('[EmailGenerator] Generating email', { params });

      // Get template for industry and stage
      const template = await this.getTemplate(
        params.industry,
        params.followUpStage || 'initial'
      );

      if (!template) {
        throw new Error(`No template found for industry: ${params.industry}`);
      }

      // Replace variables
      const subject = this.replaceVariables(template.subject, params);
      const bodyText = this.replaceVariables(template.bodyText, params);
      const bodyHtml = template.bodyHtml 
        ? this.replaceVariables(template.bodyHtml, params)
        : bodyText;

      return { subject, bodyText, bodyHtml };
    } catch (error: any) {
      logger.error('[EmailGenerator] Error generating email', {
        error: error.message,
      });
      throw error;
    }
  }

  private async getTemplate(industry: string, stage: string) {
    const templates = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.industry, industry))
      .where(eq(emailTemplates.followUpStage, stage))
      .where(eq(emailTemplates.isActive, true))
      .limit(1);

    return templates[0] || null;
  }

  private replaceVariables(text: string, params: GenerateEmailParams): string {
    return text
      .replace(/\{\{company_name\}\}/g, params.companyName)
      .replace(/\{\{contact_name\}\}/g, params.contactName || 'there')
      .replace(/\{\{industry\}\}/g, params.industry)
      .replace(/\{\{city\}\}/g, params.city || 'your area')
      .replace(/\{\{country\}\}/g, params.country || 'your region');
  }
}

export const emailGeneratorService = new EmailGeneratorService();
```

---

#### File: `apps/api/src/services/outreach/email-sender.service.ts`

```typescript
import nodemailer from 'nodemailer';
import { logger } from '../../utils/logger';
import { db } from '@leadnex/database';
import { emails, leads } from '@leadnex/database';
import { eq } from 'drizzle-orm';

export class EmailSenderService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Send email to a lead
   */
  async sendEmail(params: {
    leadId: string;
    campaignId?: string;
    subject: string;
    bodyText: string;
    bodyHtml?: string;
    followUpStage: string;
  }): Promise<void> {
    try {
      // Get lead info
      const lead = await db
        .select()
        .from(leads)
        .where(eq(leads.id, params.leadId))
        .limit(1);

      if (!lead[0] || !lead[0].email) {
        throw new Error('Lead email not found');
      }

      logger.info('[EmailSender] Sending email', {
        to: lead[0].email,
        subject: params.subject,
      });

      // Send email
      const info = await this.transporter.sendMail({
        from: `"${process.env.FROM_NAME || 'BookNex Solutions'}" <${process.env.SMTP_USER}>`,
        to: lead[0].email,
        subject: params.subject,
        text: params.bodyText,
        html: params.bodyHtml || params.bodyText,
      });

      // Record email in database
      await db.insert(emails).values({
        leadId: params.leadId,
        campaignId: params.campaignId,
        subject: params.subject,
        bodyText: params.bodyText,
        bodyHtml: params.bodyHtml,
        followUpStage: params.followUpStage,
        status: 'sent',
        sentAt: new Date(),
        externalId: info.messageId,
      });

      // Update lead status
      await db
        .update(leads)
        .set({
          status: 'contacted',
          lastContactedAt: new Date(),
          emailsSent: lead[0].emailsSent + 1,
        })
        .where(eq(leads.id, params.leadId));

      logger.info('[EmailSender] Email sent successfully', {
        messageId: info.messageId,
      });
    } catch (error: any) {
      logger.error('[EmailSender] Error sending email', {
        error: error.message,
      });
      throw error;
    }
  }
}

export const emailSenderService = new EmailSenderService();
```

---

### 4. Controllers

#### File: `apps/api/src/controllers/leads.controller.ts`

```typescript
import { Request, Response } from 'express';
import { db } from '@leadnex/database';
import { leads } from '@leadnex/database';
import { eq, and, gte, lte, ilike, desc } from 'drizzle-orm';
import { apolloService } from '../services/lead-generation/apollo.service';
import { googlePlacesService } from '../services/lead-generation/google-places.service';
import { hunterService } from '../services/lead-generation/hunter.service';
import { linkedInImportService } from '../services/lead-generation/linkedin-import.service';
import { leadScoringService } from '../services/crm/lead-scoring.service';
import { logger } from '../utils/logger';

export class LeadsController {
  /**
   * GET /api/leads - Get all leads with filters and pagination
   */
  async getLeads(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 50,
        industry,
        country,
        status,
        source,
        minScore,
      } = req.query;

      logger.info('[LeadsController] Getting leads', { query: req.query });

      let query = db.select().from(leads);

      // Apply filters
      const filters = [];
      if (industry) filters.push(eq(leads.industry, industry as string));
      if (country) filters.push(eq(leads.country, country as string));
      if (status) filters.push(eq(leads.status, status as any));
      if (source) filters.push(eq(leads.source, source as string));
      if (minScore) filters.push(gte(leads.qualityScore, parseInt(minScore as string)));

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      // Pagination
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      query = query.limit(parseInt(limit as string)).offset(offset);
      query = query.orderBy(desc(leads.createdAt));

      const results = await query;

      // Get total count
      const total = await db.select().from(leads);

      res.json({
        success: true,
        data: results,
        meta: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: total.length,
        },
      });
    } catch (error: any) {
      logger.error('[LeadsController] Error getting leads', { error: error.message });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/leads/generate - Generate new leads
   */
  async generateLeads(req: Request, res: Response) {
    try {
      const { industry, country, city, maxResults = 50, sources } = req.body;

      logger.info('[LeadsController] Generating leads', { body: req.body });

      const allLeads: any[] = [];

      // Generate from each source
      if (sources.includes('apollo')) {
        const apolloLeads = await apolloService.searchLeads({
          industry,
          country,
          city,
          maxResults: Math.min(maxResults, 10),
        });
        allLeads.push(...apolloLeads);
      }

      if (sources.includes('google_places')) {
        const placesLeads = await googlePlacesService.searchLeads({
          industry,
          country,
          city,
          maxResults: Math.min(maxResults, 50),
        });
        allLeads.push(...placesLeads);
      }

      // Deduplicate and score leads
      const deduped = await this.deduplicateLeads(allLeads);
      const scored = deduped.map(lead => ({
        ...lead,
        qualityScore: leadScoringService.calculateScore(lead),
      }));

      // Save to database
      const saved = [];
      for (const lead of scored) {
        const result = await db.insert(leads).values(lead).returning();
        saved.push(result[0]);
      }

      res.json({
        success: true,
        data: {
          leads: saved,
          summary: {
            total: allLeads.length,
            newLeads: saved.length,
            duplicatesSkipped: allLeads.length - saved.length,
          },
        },
      });
    } catch (error: any) {
      logger.error('[LeadsController] Error generating leads', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  /**
   * POST /api/leads/import - Import LinkedIn CSV
   */
  async importLinkedIn(req: Request, res: Response) {
    try {
      const { csvData, industry, enrichEmail = true } = req.body;

      logger.info('[LeadsController] Importing LinkedIn CSV');

      const leads = await linkedInImportService.importCSV(csvData, industry);

      // Enrich emails if requested
      if (enrichEmail) {
        for (const lead of leads) {
          if (!lead.email && lead.website) {
            const domain = new URL(lead.website).hostname;
            const emailResult = await hunterService.findEmailByDomain(domain, 1);
            if (emailResult.emails.length > 0) {
              lead.email = emailResult.emails[0].value;
            }
          }
        }
      }

      res.json({
        success: true,
        data: { leads, count: leads.length },
      });
    } catch (error: any) {
      logger.error('[LeadsController] Error importing LinkedIn', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  private async deduplicateLeads(leads: any[]): Promise<any[]> {
    const seen = new Set<string>();
    return leads.filter(lead => {
      const key = `${lead.email || lead.companyName}-${lead.industry}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

export const leadsController = new LeadsController();
```

---

### 5. Routes

#### File: `apps/api/src/routes/leads.routes.ts`

```typescript
import { Router } from 'express';
import { leadsController } from '../controllers/leads.controller';

const router = Router();

router.get('/', (req, res) => leadsController.getLeads(req, res));
router.post('/generate', (req, res) => leadsController.generateLeads(req, res));
router.post('/import', (req, res) => leadsController.importLinkedIn(req, res));

export default router;
```

---

## DEPLOYMENT SCRIPTS

### File: `deploy-vps.sh`

```bash
#!/bin/bash

echo "🚀 LeadNexConnect v2 - VPS Deployment Script"
echo "============================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root (use sudo)"
  exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 18
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PostgreSQL
echo "📦 Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
apt install -y nginx

# Setup PostgreSQL database
echo "🗄️  Setting up PostgreSQL database..."
sudo -u postgres psql -c "CREATE DATABASE leadnexconnect;"
sudo -u postgres psql -c "CREATE USER leaduser WITH PASSWORD 'changeme123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE leadnexconnect TO leaduser;"

# Clone and setup application
echo "📥 Setting up application..."
cd /var/www
git clone YOUR_REPO_URL leadnexconnect
cd leadnexconnect

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy and configure environment
echo "⚙️  Configuring environment..."
cp .env.example .env
echo "⚠️  Please edit /var/www/leadnexconnect/.env with your configuration"
read -p "Press enter after editing .env file..."

# Run migrations
echo "🗄️  Running database migrations..."
npm run db:migrate
npm run db:seed

# Build application
echo "🔨 Building application..."
npm run build

# Start with PM2
echo "▶️  Starting application with PM2..."
pm2 start apps/api/dist/index.js --name leadnex-api
pm2 save
pm2 startup

# Configure Nginx
echo "🔧 Configuring Nginx..."
cat > /etc/nginx/sites-available/leadnex <<EOF
server {
    server_name YOUR_DOMAIN.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/leadnex /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Setup SSL
echo "🔒 Setting up SSL with Let's Encrypt..."
apt install -y certbot python3-certbot-nginx
certbot --nginx -d YOUR_DOMAIN.com

echo "✅ Deployment complete!"
echo "📊 View status: pm2 status"
echo "📝 View logs: pm2 logs leadnex-api"
echo "🌐 Access app at: https://YOUR_DOMAIN.com"
```

---

### File: `.replit` (For Replit Deployment)

```toml
run = "npm run build && npm run start"
hidden = [".config"]

[nix]
channel = "stable-22_11"

[env]
NODE_ENV = "production"

[packager]
language = "nodejs"

[packager.features]
packageSearch = true
guessImports = true
enabledForHosting = false

[languages.javascript]
pattern = "**/{*.js,*.jsx,*.ts,*.tsx}"

[languages.javascript.languageServer]
start = "typescript-language-server --stdio"
```

---

### File: `ecosystem.config.js` (PM2 Configuration)

```javascript
module.exports = {
  apps: [
    {
      name: 'leadnex-api',
      script: './apps/api/dist/index.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
```

---

## FRONTEND FILES (Basic Structure)

### File: `apps/web/package.json`

```json
{
  "name": "@leadnex/web",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@leadnex/shared": "*",
    "next": "^14.0.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "^5.17.9",
    "axios": "^1.6.5",
    "recharts": "^2.10.3",
    "tailwindcss": "^3.4.0",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/react": "^18.2.47",
    "@types/react-dom": "^18.2.18",
    "typescript": "^5.3.3"
  }
}
```

---

## ADDITIONAL CONTROLLERS TO GENERATE

You need to create similar controller files for:
- `campaigns.controller.ts`
- `emails.controller.ts`
- `analytics.controller.ts`
- `scraping.controller.ts`
- `settings.controller.ts`

And corresponding routes files:
- `campaigns.routes.ts`
- `emails.routes.ts`
- `analytics.routes.ts`
- `scraping.routes.ts`
- `settings.routes.ts`

---

Complete Frontend (React + Next.js)

- `Dashboard with metrics`
- `Leads management`
- `Campaign creator`
- `Analytics page`
- `Settings page`

## NEXT STEPS FOR CLAUDE CODE

1. Extract the partial archive created
2. Generate all remaining backend files listed above
3. Create complete frontend with React components
4. Test all API endpoints
5. Run deployment script

## Command to Run After Generation

```bash
# Install dependencies
npm install

# Setup database
npm run db:migrate
npm run db:seed

# Run development
npm run dev
```

---

END OF CODE GENERATION GUIDE
