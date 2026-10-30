-- Row-level security for tenant isolation.
--
-- The API sets these settings per transaction (SET LOCAL inside prisma.$transaction):
--   app.current_organization_id  uuid of the active workspace (employee requests, portal requests)
--   app.current_user_id          uuid of the signed-in user (lets a user list their own
--                                memberships / portals before a workspace is selected)
--   app.bypass_rls = 'on'        background workers, migrations/seeds, platform support tooling
--
-- FORCE ROW LEVEL SECURITY makes the policies apply to the table owner too, so the application
-- connection cannot read across tenants by accident.

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_organization_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_organization_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app.bypass_rls() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(current_setting('app.bypass_rls', true), '') = 'on'
$$;

-- Standard tenant tables: every row carries a NOT NULL organization_id.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organization_portal_settings',
    'organization_document_settings',
    'invitations',
    'clients',
    'client_assignments',
    'client_notes',
    'forms',
    'form_versions',
    'document_requirements',
    'form_assignments',
    'assignment_requirements',
    'form_responses',
    'form_answers',
    'public_submissions',
    'documents',
    'document_versions',
    'document_inbox_items',
    'reminder_schedules',
    'notification_settings',
    'notification_templates',
    'automation_rules',
    'notifications',
    'email_integrations',
    'processed_emails',
    'email_attachments'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I FOR ALL
         USING (app.bypass_rls() OR organization_id = app.current_organization_id())
         WITH CHECK (app.bypass_rls() OR organization_id = app.current_organization_id())',
      t
    );
  END LOOP;
END $$;

-- organizations: visible when active, or when the current user is a member of it (workspace switcher).
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "organizations" FOR ALL
  USING (
    app.bypass_rls()
    OR id = app.current_organization_id()
    OR EXISTS (
      SELECT 1 FROM "organization_members" m
      WHERE m.organization_id = "organizations".id
        AND m.user_id = app.current_user_id()
        AND m.removed_at IS NULL
    )
  )
  WITH CHECK (app.bypass_rls() OR id = app.current_organization_id() OR created_by_user_id = app.current_user_id());

-- organization_members: rows of the active workspace, plus the current user's own memberships.
ALTER TABLE "organization_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_members" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "organization_members" FOR ALL
  USING (app.bypass_rls() OR organization_id = app.current_organization_id() OR user_id = app.current_user_id())
  WITH CHECK (app.bypass_rls() OR organization_id = app.current_organization_id());

-- client_users: rows of the active workspace, plus the current user's own portal accounts.
ALTER TABLE "client_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_users" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "client_users" FOR ALL
  USING (app.bypass_rls() OR organization_id = app.current_organization_id() OR user_id = app.current_user_id())
  WITH CHECK (app.bypass_rls() OR organization_id = app.current_organization_id());

-- sessions / job_runs: organization_id is optional.
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "sessions" FOR ALL
  USING (app.bypass_rls() OR user_id = app.current_user_id() OR organization_id = app.current_organization_id())
  WITH CHECK (app.bypass_rls() OR user_id = app.current_user_id());

ALTER TABLE "job_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_runs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "job_runs" FOR ALL
  USING (app.bypass_rls() OR organization_id = app.current_organization_id())
  WITH CHECK (app.bypass_rls() OR organization_id = app.current_organization_id());

-- activity_logs: append-only for organization users. UPDATE/DELETE require bypass.
ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY activity_logs_select ON "activity_logs" FOR SELECT
  USING (app.bypass_rls() OR organization_id = app.current_organization_id());
CREATE POLICY activity_logs_insert ON "activity_logs" FOR INSERT
  WITH CHECK (app.bypass_rls() OR organization_id = app.current_organization_id());
CREATE POLICY activity_logs_admin ON "activity_logs" FOR ALL
  USING (app.bypass_rls())
  WITH CHECK (app.bypass_rls());

-- Expiry helpers for "expiring soon" queries (partial indexes keep them small).
CREATE INDEX "documents_active_expiration_idx"
  ON "documents" ("organization_id", "expiration_date")
  WHERE "superseded_by_id" IS NULL AND "deleted_at" IS NULL AND "expiration_date" IS NOT NULL;
