ALTER TABLE "api_config" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "api_performance" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "api_usage" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "automated_campaign_runs" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "campaign_leads" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "custom_variables" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "email_templates" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "emails" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "lead_batches" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "lead_source_roi" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_emails" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "scraping_jobs" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "smtp_config" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_steps" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workflows" ALTER COLUMN "user_id" SET NOT NULL;