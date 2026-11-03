-- Forms get a default submission deadline; per-document expiration becomes an admin-only feature
-- that defaults to "no expiration".

-- 1. Form-level default submission deadline.
CREATE TYPE "DeadlinePolicy" AS ENUM ('NONE', 'AFTER_ASSIGNMENT', 'FIXED_DATE');

ALTER TABLE "form_versions"
  ADD COLUMN "default_deadline_policy" "DeadlinePolicy" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "default_deadline_days" INTEGER,
  ADD COLUMN "default_deadline_date" DATE,
  ADD COLUMN "default_deadline_time" VARCHAR(5);

-- Deadline reminders also cover unsubmitted form questions; bookkeeping per assignment.
ALTER TABLE "form_assignments"
  ADD COLUMN "reminders_sent_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "overdue_reminders_sent_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "last_reminder_sent_at" TIMESTAMP(3);

-- Reminder emails now cover the whole form and mention the submission deadline. Seeded templates that were
-- never edited are replaced with the new default text; customised templates are left as written.
UPDATE "notification_templates"
SET "name" = 'Submission reminder',
    "subject" = 'Reminder: "{{form_name}}" is still pending',
    "body" = E'Hi {{client_name}},\n\nThis is a friendly reminder that "{{form_name}}" for {{company_name}} is not complete yet. Still outstanding:\n{{missing_documents}}\n\n{{deadline_notice}}You can complete everything securely in your client portal:\n{{portal_link}}\n\nThank you.'
WHERE "type" = 'MISSING_DOCUMENTS'
  AND "subject" = 'Reminder: documents still needed by {{company_name}}'
  AND "body" = E'Hi {{client_name}},\n\nThis is a friendly reminder that we are still waiting for the following documents:\n{{missing_documents}}\n\nPlease upload them in your client portal:\n{{portal_link}}\n\nThank you.';

UPDATE "notification_templates"
SET "name" = 'Υπενθύμιση υποβολής',
    "subject" = 'Υπενθύμιση: η φόρμα "{{form_name}}" εκκρεμεί',
    "body" = E'Αγαπητέ/ή {{client_name}},\n\nΣας υπενθυμίζουμε ευγενικά ότι η φόρμα "{{form_name}}" για {{company_name}} δεν έχει ολοκληρωθεί ακόμη. Εκκρεμούν:\n{{missing_documents}}\n\n{{deadline_notice}}Μπορείτε να τα ολοκληρώσετε με ασφάλεια στην πύλη πελάτη σας:\n{{portal_link}}\n\nΣας ευχαριστούμε.'
WHERE "type" = 'MISSING_DOCUMENTS'
  AND "subject" = 'Υπενθύμιση: εκκρεμούν έγγραφα για {{company_name}}'
  AND "body" = E'Αγαπητέ/ή {{client_name}},\n\nΣας υπενθυμίζουμε ευγενικά ότι αναμένουμε ακόμη τα παρακάτω έγγραφα:\n{{missing_documents}}\n\nΠαρακαλούμε ανεβάστε τα στην πύλη πελάτη σας:\n{{portal_link}}\n\nΣας ευχαριστούμε.';

UPDATE "automation_rules" SET "name" = 'Submission reminders' WHERE "trigger" = 'MISSING_DOCUMENTS' AND "name" = 'Missing documents reminders';
UPDATE "automation_rules" SET "name" = 'Υπενθυμίσεις υποβολής' WHERE "trigger" = 'MISSING_DOCUMENTS' AND "name" = 'Υπενθυμίσεις για έγγραφα που λείπουν';

-- 2. "No expiration" is the new default everywhere.
ALTER TABLE "organization_document_settings" ALTER COLUMN "default_expiration_policy" SET DEFAULT 'NONE';
ALTER TABLE "form_versions" ALTER COLUMN "default_expiration_policy" SET DEFAULT 'NONE';
ALTER TABLE "document_requirements" ALTER COLUMN "expiration_policy" SET DEFAULT 'NONE';

-- 3. Existing data switches to "no expiration". Documents that already carry an expiration date keep it.
UPDATE "organization_document_settings" SET "default_expiration_policy" = 'NONE', "default_expiration_days" = NULL;

UPDATE "form_versions"
SET "default_expiration_policy" = 'NONE', "default_expiration_days" = NULL, "default_fixed_expiration_date" = NULL;

UPDATE "document_requirements"
SET "expiration_policy" = 'NONE', "expiration_days" = NULL, "fixed_expiration_date" = NULL;

-- Per-field overrides inside the builder JSON (sections[].fields[].file) are removed so fields inherit
-- the form default (now NONE) the next time a version is published.
UPDATE "form_versions" fv
SET "definition" = jsonb_set(
  fv."definition",
  '{sections}',
  (
    SELECT COALESCE(jsonb_agg(
      CASE
        WHEN jsonb_typeof(s -> 'fields') = 'array' THEN jsonb_set(
          s,
          '{fields}',
          (
            SELECT COALESCE(jsonb_agg(
              CASE
                WHEN jsonb_typeof(f -> 'file') = 'object'
                  THEN jsonb_set(f, '{file}', (f -> 'file') - 'expiration_policy' - 'expiration_days' - 'fixed_expiration_date')
                ELSE f
              END
              ORDER BY fi
            ), '[]'::jsonb)
            FROM jsonb_array_elements(s -> 'fields') WITH ORDINALITY AS x(f, fi)
          )
        )
        ELSE s
      END
      ORDER BY si
    ), '[]'::jsonb)
    FROM jsonb_array_elements(fv."definition" -> 'sections') WITH ORDINALITY AS y(s, si)
  )
)
WHERE jsonb_typeof(fv."definition" -> 'sections') = 'array';
