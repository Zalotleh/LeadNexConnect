DO $$ BEGIN
 CREATE TYPE "template_category" AS ENUM('initial_outreach', 'follow_up', 'meeting_request', 'introduction', 'product_demo', 'partnership', 'general', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "schedule_type" ADD VALUE 'immediate';--> statement-breakpoint
ALTER TYPE "schedule_type" ADD VALUE 'scheduled';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_source" varchar(50) NOT NULL,
	"api_key" varchar(500),
	"api_secret" varchar(500),
	"plan_name" varchar(100),
	"monthly_limit" integer DEFAULT 0,
	"cost_per_lead" numeric(10, 2) DEFAULT '0',
	"cost_per_api_call" numeric(10, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"documentation_url" varchar(500),
	"setup_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "api_config_api_source_unique" UNIQUE("api_source")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "custom_variables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"label" varchar(255) NOT NULL,
	"value" varchar(255) NOT NULL,
	"category" varchar(50) DEFAULT 'custom' NOT NULL,
	"description" text,
	"usage_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"default_value" varchar(500),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "custom_variables_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "smtp_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(100) NOT NULL,
	"provider_name" varchar(100) NOT NULL,
	"host" varchar(255) NOT NULL,
	"port" integer NOT NULL,
	"secure" boolean DEFAULT true,
	"username" varchar(255),
	"password" varchar(500),
	"from_email" varchar(255) NOT NULL,
	"from_name" varchar(255),
	"daily_limit" integer DEFAULT 0,
	"hourly_limit" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"is_primary" boolean DEFAULT false,
	"priority" integer DEFAULT 0,
	"documentation_url" varchar(500),
	"setup_notes" text,
	"emails_sent_today" integer DEFAULT 0,
	"emails_sent_this_hour" integer DEFAULT 0,
	"last_reset_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "category" "template_category" DEFAULT 'general';--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "usage_count" integer DEFAULT 0;