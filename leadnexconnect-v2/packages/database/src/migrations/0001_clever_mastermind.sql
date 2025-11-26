CREATE TABLE IF NOT EXISTS "api_performance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_source" varchar(50) NOT NULL,
	"leads_generated" integer DEFAULT 0,
	"leads_converted" integer DEFAULT 0,
	"emails_found" integer DEFAULT 0,
	"emails_verified" integer DEFAULT 0,
	"avg_lead_score" numeric(5, 2),
	"hot_leads_percent" numeric(5, 2),
	"warm_leads_percent" numeric(5, 2),
	"demos_booked" integer DEFAULT 0,
	"trials_started" integer DEFAULT 0,
	"customers_converted" integer DEFAULT 0,
	"api_calls_used" integer DEFAULT 0,
	"api_calls_limit" integer,
	"cost_per_lead" numeric(10, 2),
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lead_source_roi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"source" varchar(50) NOT NULL,
	"first_contact_at" timestamp,
	"demo_booked_at" timestamp,
	"trial_started_at" timestamp,
	"converted_at" timestamp,
	"plan_type" varchar(50),
	"mrr" numeric(10, 2),
	"lifetime_value" numeric(10, 2),
	"attributed_source" varchar(50),
	"conversion_time_days" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "website_analysis_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain" varchar(255) NOT NULL,
	"has_booking_keywords" boolean,
	"booking_keyword_score" integer,
	"current_booking_tool" varchar(100),
	"has_appointment_form" boolean,
	"has_calendar" boolean,
	"has_pricing" boolean,
	"has_gallery" boolean,
	"has_reviews" boolean,
	"has_contact_form" boolean,
	"has_phone_only" boolean,
	"multi_location" boolean,
	"services_count" integer,
	"language_support" varchar(255)[],
	"analysis_data" jsonb,
	"last_analyzed_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "website_analysis_cache_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "has_google_maps_listing" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "google_rating" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "google_review_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "has_booking_keywords" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "booking_keyword_score" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "current_booking_tool" varchar(100);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "has_appointment_form" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "has_online_booking" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "has_multi_location" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "services_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "booking_potential" varchar(20) DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "digital_maturity_score" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "is_decision_maker" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "has_weekend_hours" boolean;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "response_time" varchar(50);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "price_level" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lead_source_roi" ADD CONSTRAINT "lead_source_roi_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
