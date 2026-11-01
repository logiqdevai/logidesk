-- New workspaces no longer require clients to verify their email before opening the portal.
-- Only the column default changes; existing rows keep their saved value.
ALTER TABLE "organization_portal_settings" ALTER COLUMN "require_email_verification" SET DEFAULT false;
