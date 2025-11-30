CREATE TABLE IF NOT EXISTS "workflow_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"step_number" integer NOT NULL,
	"days_after_previous" integer DEFAULT 0,
	"subject" varchar(500) NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"steps_count" integer DEFAULT 1,
	"industry" varchar(100),
	"country" varchar(100),
	"ai_instructions" text,
	"is_active" boolean DEFAULT true,
	"usage_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "batch_id" uuid;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "workflow_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
