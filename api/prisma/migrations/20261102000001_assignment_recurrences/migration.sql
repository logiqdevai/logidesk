-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'YEARLY');

-- CreateEnum
CREATE TYPE "RecurrenceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "RecurrenceEndMode" AS ENUM ('NEVER', 'AFTER_COUNT', 'ON_DATE');

-- CreateEnum
CREATE TYPE "RecurrenceDeadlineMode" AS ENUM ('NONE', 'AFTER_ASSIGNMENT', 'END_OF_PERIOD', 'DAY_IN_PERIOD', 'BEFORE_NEXT');

-- CreateEnum
CREATE TYPE "RecurrenceOverlapPolicy" AS ENUM ('CREATE_ANYWAY', 'SKIP');

-- AlterEnum
ALTER TYPE "JobQueue" ADD VALUE 'ASSIGNMENTS';

-- AlterTable
ALTER TABLE "form_assignments" ADD COLUMN     "occurrence_number" INTEGER,
ADD COLUMN     "recurrence_id" UUID;

-- CreateTable
CREATE TABLE "assignment_recurrences" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "form_ids" UUID[],
    "created_by_user_id" UUID,
    "status" "RecurrenceStatus" NOT NULL DEFAULT 'ACTIVE',
    "frequency" "RecurrenceFrequency" NOT NULL,
    "interval_count" INTEGER NOT NULL DEFAULT 1,
    "weekday" INTEGER,
    "day_of_month" INTEGER,
    "last_day_of_month" BOOLEAN NOT NULL DEFAULT false,
    "month_of_year" INTEGER,
    "run_time" VARCHAR(5) NOT NULL,
    "time_zone" TEXT NOT NULL,
    "starts_on" DATE NOT NULL,
    "end_mode" "RecurrenceEndMode" NOT NULL DEFAULT 'NEVER',
    "end_count" INTEGER,
    "end_date" DATE,
    "deadline_mode" "RecurrenceDeadlineMode" NOT NULL DEFAULT 'NONE',
    "deadline_offset_days" INTEGER,
    "deadline_time" VARCHAR(5),
    "deadline_day" INTEGER,
    "deadline_last_day" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT,
    "reminder" JSONB,
    "notify_client" BOOLEAN NOT NULL DEFAULT true,
    "overlap_policy" "RecurrenceOverlapPolicy" NOT NULL DEFAULT 'CREATE_ANYWAY',
    "next_run_at" TIMESTAMP(3),
    "last_run_at" TIMESTAMP(3),
    "occurrences_created" INTEGER NOT NULL DEFAULT 0,
    "paused_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_recurrences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assignment_recurrences_status_next_run_at_idx" ON "assignment_recurrences"("status", "next_run_at");

-- CreateIndex
CREATE INDEX "assignment_recurrences_organization_id_client_id_idx" ON "assignment_recurrences"("organization_id", "client_id");

-- CreateIndex
CREATE INDEX "form_assignments_recurrence_id_idx" ON "form_assignments"("recurrence_id");

-- CreateIndex
CREATE UNIQUE INDEX "form_assignments_recurrence_id_form_id_occurrence_number_key" ON "form_assignments"("recurrence_id", "form_id", "occurrence_number");

-- AddForeignKey
ALTER TABLE "assignment_recurrences" ADD CONSTRAINT "assignment_recurrences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_recurrences" ADD CONSTRAINT "assignment_recurrences_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_recurrences" ADD CONSTRAINT "assignment_recurrences_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_assignments" ADD CONSTRAINT "form_assignments_recurrence_id_fkey" FOREIGN KEY ("recurrence_id") REFERENCES "assignment_recurrences"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Row-level security: same tenant isolation policy as the other organization tables.
ALTER TABLE "assignment_recurrences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assignment_recurrences" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "assignment_recurrences" FOR ALL
  USING (app.bypass_rls() OR organization_id = app.current_organization_id())
  WITH CHECK (app.bypass_rls() OR organization_id = app.current_organization_id());
