CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity" varchar(100) NOT NULL,
	"entity_id" uuid,
	"changes" jsonb,
	"ip_address" varchar(50),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "automated_campaign_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"run_number" integer NOT NULL,
	"batch_id" uuid,
	"leads_generated" integer DEFAULT 0,
	"outreach_campaign_id" uuid,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scheduled_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"template_id" uuid,
	"workflow_id" uuid,
	"workflow_step_number" integer DEFAULT 1,
	"scheduled_for" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"failed_at" timestamp,
	"failure_reason" text,
	"retry_count" integer DEFAULT 0,
	"email_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(500) NOT NULL,
	"refresh_token" varchar(500),
	"ip_address" varchar(50),
	"user_agent" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"last_used_at" timestamp DEFAULT now(),
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp,
	"last_active_at" timestamp,
	"failed_login_attempts" integer DEFAULT 0,
	"locked_until" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "campaign_type" SET DEFAULT 'outreach';--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "campaign_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "status" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_steps" ALTER COLUMN "subject" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_steps" ALTER COLUMN "body" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "api_config" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "api_performance" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "api_usage" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "campaign_leads" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "lead_sources" jsonb;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "max_results_per_run" integer;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "batch_ids" jsonb;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "use_workflow" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "is_recurring" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "recurring_interval" varchar(50);--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "next_run_at" timestamp;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "outreach_delay_days" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "start_type" varchar(20) DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "scheduled_start_at" timestamp;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "actual_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "paused_at" timestamp;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "resumed_at" timestamp;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "failed_at" timestamp;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "failure_reason" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "total_leads_targeted" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "emails_sent_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "emails_scheduled_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "emails_failed_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "current_workflow_step" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "custom_variables" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "lead_batches" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "lead_batches" ADD COLUMN "active_campaign_id" uuid;--> statement-breakpoint
ALTER TABLE "lead_batches" ADD COLUMN "campaign_history" jsonb;--> statement-breakpoint
ALTER TABLE "lead_batches" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "lead_source_roi" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "scraping_jobs" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "smtp_config" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_steps" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_steps" ADD COLUMN "email_template_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_steps" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automated_campaign_runs" ADD CONSTRAINT "automated_campaign_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automated_campaign_runs" ADD CONSTRAINT "automated_campaign_runs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automated_campaign_runs" ADD CONSTRAINT "automated_campaign_runs_batch_id_lead_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."lead_batches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automated_campaign_runs" ADD CONSTRAINT "automated_campaign_runs_outreach_campaign_id_campaigns_id_fk" FOREIGN KEY ("outreach_campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scheduled_emails" ADD CONSTRAINT "scheduled_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scheduled_emails" ADD CONSTRAINT "scheduled_emails_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scheduled_emails" ADD CONSTRAINT "scheduled_emails_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scheduled_emails" ADD CONSTRAINT "scheduled_emails_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scheduled_emails" ADD CONSTRAINT "scheduled_emails_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scheduled_emails" ADD CONSTRAINT "scheduled_emails_email_id_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_config" ADD CONSTRAINT "api_config_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_performance" ADD CONSTRAINT "api_performance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_leads" ADD CONSTRAINT "campaign_leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_variables" ADD CONSTRAINT "custom_variables_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "emails" ADD CONSTRAINT "emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lead_batches" ADD CONSTRAINT "lead_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lead_batches" ADD CONSTRAINT "lead_batches_active_campaign_id_campaigns_id_fk" FOREIGN KEY ("active_campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lead_source_roi" ADD CONSTRAINT "lead_source_roi_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scraping_jobs" ADD CONSTRAINT "scraping_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "smtp_config" ADD CONSTRAINT "smtp_config_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_email_template_id_email_templates_id_fk" FOREIGN KEY ("email_template_id") REFERENCES "public"."email_templates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflows" ADD CONSTRAINT "workflows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
