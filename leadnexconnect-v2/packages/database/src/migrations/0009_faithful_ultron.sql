ALTER TABLE "api_config" DROP CONSTRAINT "api_config_user_id_api_source_unique";--> statement-breakpoint
ALTER TABLE "api_config" DROP CONSTRAINT "api_config_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "smtp_config" DROP CONSTRAINT "smtp_config_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "api_config" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
ALTER TABLE "smtp_config" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
ALTER TABLE "api_config" ADD CONSTRAINT "api_config_api_source_unique" UNIQUE("api_source");