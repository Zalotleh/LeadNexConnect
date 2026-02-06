DO $$ BEGIN
 CREATE TYPE "campaign_status" AS ENUM('draft', 'active', 'paused', 'completed', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "email_status" AS ENUM('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'spam');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "lead_status" AS ENUM('new', 'contacted', 'follow_up_1', 'follow_up_2', 'responded', 'interested', 'not_interested', 'invalid', 'converted');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "schedule_type" AS ENUM('manual', 'daily', 'weekly', 'custom');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "scraping_status" AS ENUM('queued', 'running', 'completed', 'failed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "verification_status" AS ENUM('unverified', 'email_verified', 'phone_verified', 'fully_verified');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service" varchar(50) NOT NULL,
	"requests_made" integer DEFAULT 0,
	"requests_limit" integer,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"cost" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"industry" varchar(100),
	"target_countries" varchar(100)[],
	"target_cities" varchar(100)[],
	"company_size" varchar(50),
	"leads_per_day" integer DEFAULT 50,
	"email_template_id" uuid,
	"follow_up_enabled" boolean DEFAULT true,
	"follow_up_1_delay_days" integer DEFAULT 3,
	"follow_up_2_delay_days" integer DEFAULT 5,
	"status" "campaign_status" DEFAULT 'draft',
	"schedule_type" "schedule_type" DEFAULT 'manual',
	"schedule_time" varchar(10),
	"start_date" timestamp,
	"end_date" timestamp,
	"uses_linkedin" boolean DEFAULT false,
	"uses_apollo" boolean DEFAULT false,
	"uses_people_dl" boolean DEFAULT false,
	"uses_google_places" boolean DEFAULT false,
	"uses_web_scraping" boolean DEFAULT false,
	"leads_generated" integer DEFAULT 0,
	"emails_sent" integer DEFAULT 0,
	"emails_opened" integer DEFAULT 0,
	"emails_clicked" integer DEFAULT 0,
	"responses_received" integer DEFAULT 0,
	"last_run_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"industry" varchar(100),
	"follow_up_stage" varchar(50) DEFAULT 'initial',
	"subject" varchar(500) NOT NULL,
	"body_text" text NOT NULL,
	"body_html" text,
	"variables" jsonb,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"campaign_id" uuid,
	"subject" varchar(500) NOT NULL,
	"body_text" text NOT NULL,
	"body_html" text,
	"follow_up_stage" varchar(50) DEFAULT 'initial',
	"status" "email_status" DEFAULT 'queued',
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"bounced_at" timestamp,
	"error_message" text,
	"external_id" varchar(255),
	"open_count" integer DEFAULT 0,
	"click_count" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"website" varchar(255),
	"email" varchar(255),
	"phone" varchar(50),
	"contact_name" varchar(255),
	"job_title" varchar(255),
	"country" varchar(100),
	"city" varchar(100),
	"address" text,
	"industry" varchar(100) NOT NULL,
	"business_type" varchar(100),
	"company_size" varchar(50),
	"source" varchar(50) NOT NULL,
	"quality_score" integer DEFAULT 0,
	"verification_status" "verification_status" DEFAULT 'unverified',
	"status" "lead_status" DEFAULT 'new',
	"follow_up_stage" varchar(50) DEFAULT 'initial',
	"last_contacted_at" timestamp,
	"last_responded_at" timestamp,
	"emails_sent" integer DEFAULT 0,
	"emails_opened" integer DEFAULT 0,
	"emails_clicked" integer DEFAULT 0,
	"notes" text,
	"tags" varchar(100)[],
	"custom_fields" jsonb,
	"linkedin_url" varchar(500),
	"linkedin_sales_nav_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scraping_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(50) NOT NULL,
	"industry" varchar(100),
	"country" varchar(100),
	"city" varchar(100),
	"max_results" integer DEFAULT 100,
	"filters" jsonb,
	"status" "scraping_status" DEFAULT 'queued',
	"progress" integer DEFAULT 0,
	"leads_found" integer DEFAULT 0,
	"leads_imported" integer DEFAULT 0,
	"error_message" text,
	"results_json" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "emails" ADD CONSTRAINT "emails_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "emails" ADD CONSTRAINT "emails_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
