-- New workspaces no longer require employee approval of client uploads by default.
-- Only the column default changes; existing rows keep their saved value.
ALTER TABLE "organization_document_settings" ALTER COLUMN "require_approval_by_default" SET DEFAULT false;
