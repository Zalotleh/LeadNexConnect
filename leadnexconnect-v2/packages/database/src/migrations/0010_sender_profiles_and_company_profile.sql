-- Migration: 0010_sender_profiles_and_company_profile
-- Adds sender_profiles table (per-user sender identity + signature)
-- Inserts company_profile key into settings table

-- ─────────────────────────────────────────────
-- 1. sender_profiles table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "sender_profiles" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"        uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "sender_name"    varchar(255),
  "sender_email"   varchar(255),
  "reply_to"       varchar(255),
  "signature_html" text,
  "created_at"     timestamp DEFAULT now(),
  "updated_at"     timestamp DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 2. company_profile settings entry
--    Uses INSERT ... ON CONFLICT DO NOTHING so re-running is safe.
-- ─────────────────────────────────────────────
INSERT INTO "settings" ("key", "value")
VALUES (
  'company_profile',
  '{
    "companyName":        "BookNex Solutions",
    "productName":        "BookNex",
    "productDescription": "All-in-one booking and CRM platform",
    "websiteUrl":         "https://www.booknexsolutions.com",
    "signUpLink":         "https://booknexsolutions.com/sign-up/",
    "featuresLink":       "https://booknexsolutions.com/features/",
    "pricingLink":        "https://booknexsolutions.com/pricing/",
    "demoLink":           "https://booknexsolutions.com/demo/",
    "integrationsLink":   "https://booknexsolutions.com/integrations/",
    "supportEmail":       "support@booknexsolutions.com"
  }'::jsonb
)
ON CONFLICT ("key") DO NOTHING;
