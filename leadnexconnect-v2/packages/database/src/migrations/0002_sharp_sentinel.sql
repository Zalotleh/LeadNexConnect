CREATE TABLE IF NOT EXISTS "campaign_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"added_at" timestamp DEFAULT now(),
	"processed" boolean DEFAULT false,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lead_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"source_file" varchar(255),
	"uploaded_by" varchar(255),
	"total_leads" integer DEFAULT 0,
	"successful_imports" integer DEFAULT 0,
	"failed_imports" integer DEFAULT 0,
	"duplicates_skipped" integer DEFAULT 0,
	"import_settings" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "campaign_type" varchar(50) DEFAULT 'automated';--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "source_type" varchar(50) DEFAULT 'automated';--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "batch_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_leads" ADD CONSTRAINT "campaign_leads_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_leads" ADD CONSTRAINT "campaign_leads_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
