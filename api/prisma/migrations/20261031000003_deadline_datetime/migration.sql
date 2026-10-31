-- Deadlines become full timestamps (UTC instants). Existing date-only deadlines are moved to
-- the end of that day (23:59:59) in the organization's time zone.
ALTER TABLE "form_assignments" ADD COLUMN "deadline_at" TIMESTAMP(3);
SELECT set_config('app.bypass_rls', 'on', true);

UPDATE "form_assignments" fa
SET "deadline_at" = ((fa."deadline"::timestamp + INTERVAL '23 hours 59 minutes 59 seconds') AT TIME ZONE COALESCE(
  (SELECT o."time_zone" FROM "organizations" o WHERE o."id" = fa."organization_id" AND o."time_zone" IN (SELECT name FROM pg_timezone_names)),
  'UTC'
)) AT TIME ZONE 'UTC'
WHERE fa."deadline" IS NOT NULL;
ALTER TABLE "form_assignments" DROP COLUMN "deadline";
ALTER TABLE "form_assignments" RENAME COLUMN "deadline_at" TO "deadline";
CREATE INDEX "form_assignments_organization_id_deadline_idx" ON "form_assignments"("organization_id", "deadline");

ALTER TABLE "assignment_requirements" ADD COLUMN "deadline_at" TIMESTAMP(3);
UPDATE "assignment_requirements" ar
SET "deadline_at" = ((ar."deadline"::timestamp + INTERVAL '23 hours 59 minutes 59 seconds') AT TIME ZONE COALESCE(
  (SELECT o."time_zone" FROM "organizations" o WHERE o."id" = ar."organization_id" AND o."time_zone" IN (SELECT name FROM pg_timezone_names)),
  'UTC'
)) AT TIME ZONE 'UTC'
WHERE ar."deadline" IS NOT NULL;
ALTER TABLE "assignment_requirements" DROP COLUMN "deadline";
ALTER TABLE "assignment_requirements" RENAME COLUMN "deadline_at" TO "deadline";

-- New organizations default to Athens time.
ALTER TABLE "organizations" ALTER COLUMN "time_zone" SET DEFAULT 'Europe/Athens';
