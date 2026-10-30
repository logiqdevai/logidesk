-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AuthRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN', 'SUPPORT');

-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "InvitationType" AS ENUM ('TEAM', 'CLIENT');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SessionKind" AS ENUM ('WORKSPACE', 'PORTAL');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ClientUserStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "PortalAccessMode" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FormVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "FormFieldType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'NUMBER', 'EMAIL', 'PHONE', 'DATE', 'DROPDOWN', 'MULTIPLE_CHOICE', 'CHECKBOXES', 'FILE_UPLOAD', 'YES_NO', 'HEADING', 'DESCRIPTION', 'DIVIDER');

-- CreateEnum
CREATE TYPE "FileFormat" AS ENUM ('PDF', 'IMAGE', 'WORD', 'EXCEL');

-- CreateEnum
CREATE TYPE "ExpirationPolicy" AS ENUM ('NONE', 'MANUAL', 'FROM_UPLOAD_DATE', 'FIXED_DATE');

-- CreateEnum
CREATE TYPE "ExpirationSource" AS ENUM ('MANUAL', 'CALCULATED', 'FIXED', 'EXTRACTED');

-- CreateEnum
CREATE TYPE "ReminderIntervalUnit" AS ENUM ('DAYS', 'WEEKS');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETE', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('MISSING', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "FormResponseStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "UploadSource" AS ENUM ('EMPLOYEE_UPLOAD', 'CLIENT_PORTAL', 'EMAIL', 'PUBLIC_PORTAL');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentVersionChangeType" AS ENUM ('CREATED', 'FILE_REPLACED', 'METADATA_UPDATED', 'EXPIRATION_CHANGED', 'REVIEW_CHANGED', 'RESTORED');

-- CreateEnum
CREATE TYPE "InboxProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'MATCHED', 'NEEDS_REVIEW', 'UNMATCHED', 'FAILED', 'DUPLICATE', 'RESOLVED');

-- CreateEnum
CREATE TYPE "MatchConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "InboxReviewAction" AS ENUM ('CONFIRMED', 'CHANGED', 'DISMISSED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PublicSubmissionStatus" AS ENUM ('PENDING_REVIEW', 'ACCEPTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "EmailProvider" AS ENUM ('RESEND', 'SMTP');

-- CreateEnum
CREATE TYPE "SmsProvider" AS ENUM ('TWILIO');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FORM_ASSIGNED', 'MISSING_DOCUMENTS', 'EXPIRING_DOCUMENTS', 'EXPIRED_DOCUMENTS', 'DOCUMENT_REJECTED', 'DOCUMENT_APPROVED', 'CLIENT_INVITATION', 'TEAM_INVITATION', 'EMAIL_VERIFICATION', 'PASSWORD_RESET', 'MANUAL_REMINDER', 'EMPLOYEE_ALERT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationTrigger" AS ENUM ('MANUAL', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('FORM_ASSIGNED', 'MISSING_DOCUMENTS', 'DOCUMENT_EXPIRING', 'DOCUMENT_EXPIRED', 'DOCUMENT_REJECTED', 'DOCUMENT_APPROVED');

-- CreateEnum
CREATE TYPE "EmailIntegrationProvider" AS ENUM ('IMAP', 'GMAIL', 'MICROSOFT_GRAPH');

-- CreateEnum
CREATE TYPE "EmailIntegrationStatus" AS ENUM ('DISCONNECTED', 'CONNECTED', 'ERROR', 'NEEDS_REAUTH');

-- CreateEnum
CREATE TYPE "ProcessedEmailStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'IGNORED', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailAttachmentStatus" AS ENUM ('PENDING', 'EXTRACTING', 'EXTRACTED', 'MATCHED', 'NEEDS_REVIEW', 'UNMATCHED', 'DUPLICATE', 'FAILED', 'IGNORED');

-- CreateEnum
CREATE TYPE "TextExtractionMethod" AS ENUM ('NONE', 'TEXT_LAYER', 'OCR');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'CLIENT_USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "JobQueue" AS ENUM ('NOTIFICATIONS', 'REMINDERS', 'EXPIRATION', 'EMAIL_SYNC', 'EMAIL_PROCESSING', 'DOCUMENT_PROCESSING', 'EXPORTS', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "JobRunStatus" AS ENUM ('QUEUED', 'DELAYED', 'ACTIVE', 'COMPLETED', 'FAILED', 'RETRYING', 'STALLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobTrigger" AS ENUM ('SCHEDULER', 'API_REQUEST', 'WEBHOOK', 'JOB', 'MANUAL_RETRY', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "avatar_url" TEXT,
    "role" "AuthRole" NOT NULL DEFAULT 'USER',
    "email_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_uuid" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "SessionKind" NOT NULL,
    "organization_id" UUID,
    "client_user_id" UUID,
    "token_hash" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_storage_key" TEXT,
    "logo_url" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "address" TEXT,
    "time_zone" TEXT NOT NULL DEFAULT 'UTC',
    "default_language" TEXT NOT NULL DEFAULT 'en',
    "storage_limit_bytes" BIGINT NOT NULL DEFAULT 53687091200,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_portal_settings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "access_mode" "PortalAccessMode" NOT NULL DEFAULT 'PRIVATE',
    "public_slug" TEXT,
    "welcome_message" TEXT,
    "accent_color" VARCHAR(16),
    "invitation_validity_days" INTEGER NOT NULL DEFAULT 7,
    "invite_on_first_assignment" BOOLEAN NOT NULL DEFAULT true,
    "require_email_verification" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_portal_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_document_settings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "default_max_upload_mb" INTEGER NOT NULL DEFAULT 10,
    "accepted_formats" "FileFormat"[] DEFAULT ARRAY['PDF', 'IMAGE', 'WORD', 'EXCEL']::"FileFormat"[],
    "default_expiration_policy" "ExpirationPolicy" NOT NULL DEFAULT 'MANUAL',
    "default_expiration_days" INTEGER,
    "require_approval_by_default" BOOLEAN NOT NULL DEFAULT true,
    "match_high_threshold" DECIMAL(4,3) NOT NULL DEFAULT 0.90,
    "match_medium_threshold" DECIMAL(4,3) NOT NULL DEFAULT 0.60,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_document_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMP(3),
    "removed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "type" "InvitationType" NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrganizationRole",
    "client_id" UUID,
    "token_hash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "invited_by_user_id" UUID,
    "accepted_by_user_id" UUID,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "last_sent_at" TIMESTAMP(3),
    "send_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "tax_id" TEXT,
    "address" TEXT,
    "company_info" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_user_id" UUID,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_assignments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "organization_member_id" UUID NOT NULL,
    "assigned_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_users" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "user_id" UUID,
    "email" TEXT NOT NULL,
    "status" "ClientUserStatus" NOT NULL DEFAULT 'INVITED',
    "invited_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "disabled_at" TIMESTAMP(3),
    "notify_reminders" BOOLEAN NOT NULL DEFAULT true,
    "notify_review_updates" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_notes" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "author_user_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "client_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forms" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "FormStatus" NOT NULL DEFAULT 'DRAFT',
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "current_version_id" UUID,
    "duplicated_from_id" UUID,
    "created_by_user_id" UUID,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_versions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "form_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "FormVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "definition" JSONB NOT NULL,
    "default_expiration_policy" "ExpirationPolicy" NOT NULL DEFAULT 'MANUAL',
    "default_expiration_days" INTEGER,
    "default_fixed_expiration_date" DATE,
    "default_reminder_schedule_id" UUID,
    "field_count" INTEGER NOT NULL DEFAULT 0,
    "document_count" INTEGER NOT NULL DEFAULT 0,
    "created_by_user_id" UUID,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_requirements" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "form_version_id" UUID NOT NULL,
    "field_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "accepted_formats" "FileFormat"[] DEFAULT ARRAY['PDF', 'IMAGE']::"FileFormat"[],
    "max_file_size_mb" INTEGER NOT NULL DEFAULT 10,
    "max_files" INTEGER NOT NULL DEFAULT 1,
    "allow_multiple_submissions" BOOLEAN NOT NULL DEFAULT false,
    "requires_approval" BOOLEAN NOT NULL DEFAULT true,
    "expiration_policy" "ExpirationPolicy" NOT NULL DEFAULT 'MANUAL',
    "expiration_days" INTEGER,
    "fixed_expiration_date" DATE,
    "reminder_schedule_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_assignments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "form_id" UUID NOT NULL,
    "form_version_id" UUID NOT NULL,
    "assigned_by_user_id" UUID,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" DATE,
    "reminder_schedule_id" UUID,
    "message" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "requirements_total" INTEGER NOT NULL DEFAULT 0,
    "requirements_completed" INTEGER NOT NULL DEFAULT 0,
    "requirements_missing" INTEGER NOT NULL DEFAULT 0,
    "requirements_expired" INTEGER NOT NULL DEFAULT 0,
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "last_submission_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_requirements" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "document_requirement_id" UUID NOT NULL,
    "status" "RequirementStatus" NOT NULL DEFAULT 'MISSING',
    "deadline" DATE,
    "reminder_schedule_id" UUID,
    "current_document_id" UUID,
    "not_required_reason" TEXT,
    "not_required_by_user_id" UUID,
    "not_required_at" TIMESTAMP(3),
    "reminders_sent_count" INTEGER NOT NULL DEFAULT 0,
    "overdue_reminders_sent_count" INTEGER NOT NULL DEFAULT 0,
    "last_reminder_sent_at" TIMESTAMP(3),
    "next_reminder_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_responses" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "status" "FormResponseStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "submitted_by_user_id" UUID,
    "submitted_by_client_user_id" UUID,
    "last_saved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_answers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "response_id" UUID NOT NULL,
    "field_key" TEXT NOT NULL,
    "field_type" "FormFieldType" NOT NULL,
    "value" JSONB,
    "updated_by_user_id" UUID,
    "updated_by_client_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_submissions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "form_id" UUID NOT NULL,
    "form_version_id" UUID NOT NULL,
    "submitter_name" TEXT,
    "submitter_email" TEXT,
    "submitter_company" TEXT,
    "answers" JSONB,
    "status" "PublicSubmissionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "ip_address" TEXT,
    "resolved_client_id" UUID,
    "resolved_assignment_id" UUID,
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID,
    "assignment_id" UUID,
    "assignment_requirement_id" UUID,
    "document_requirement_id" UUID,
    "public_submission_id" UUID,
    "title" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "storage_bucket" TEXT,
    "mime_type" TEXT NOT NULL,
    "file_format" "FileFormat" NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum_sha256" TEXT,
    "source" "UploadSource" NOT NULL,
    "uploaded_by_user_id" UUID,
    "uploaded_by_client_user_id" UUID,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiration_date" DATE,
    "expiration_source" "ExpirationSource",
    "expiration_verified_at" TIMESTAMP(3),
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "superseded_by_id" UUID,
    "superseded_at" TIMESTAMP(3),
    "is_verified" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "change_type" "DocumentVersionChangeType" NOT NULL,
    "original_filename" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "expiration_date" DATE,
    "review_status" "ReviewStatus" NOT NULL,
    "snapshot" JSONB,
    "change_reason" TEXT,
    "changed_by_user_id" UUID,
    "changed_by_client_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_inbox_items" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "source" "UploadSource" NOT NULL,
    "processing_status" "InboxProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT true,
    "detected_client_id" UUID,
    "detected_document_type" TEXT,
    "suggested_assignment_id" UUID,
    "suggested_requirement_id" UUID,
    "confidence" "MatchConfidence",
    "confidence_score" DECIMAL(4,3),
    "match_signals" JSONB,
    "is_ambiguous" BOOLEAN NOT NULL DEFAULT false,
    "document_id" UUID,
    "email_attachment_id" UUID,
    "public_submission_id" UUID,
    "review_action" "InboxReviewAction",
    "resolved_client_id" UUID,
    "resolved_assignment_id" UUID,
    "resolved_requirement_id" UUID,
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "failure_reason" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_inbox_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_schedules" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "enabled" BOOLEAN,
    "start_days_before" INTEGER,
    "interval_count" INTEGER,
    "interval_unit" "ReminderIntervalUnit",
    "send_time" VARCHAR(5),
    "overdue_enabled" BOOLEAN,
    "overdue_interval_count" INTEGER,
    "overdue_interval_unit" "ReminderIntervalUnit",
    "overdue_max_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminder_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "enabled_channels" "NotificationChannel"[] DEFAULT ARRAY['EMAIL']::"NotificationChannel"[],
    "email_provider" "EmailProvider" NOT NULL DEFAULT 'RESEND',
    "sms_provider" "SmsProvider",
    "sender_name" TEXT,
    "sender_email" TEXT,
    "sms_sender" TEXT,
    "auto_reminders_enabled" BOOLEAN NOT NULL DEFAULT true,
    "default_reminder_schedule_id" UUID,
    "quiet_hours_start" VARCHAR(5),
    "quiet_hours_end" VARCHAR(5),
    "retry_max_attempts" INTEGER NOT NULL DEFAULT 3,
    "retry_interval_minutes" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "form_id" UUID,
    "name" TEXT NOT NULL,
    "trigger" "AutomationTrigger" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "channels" "NotificationChannel"[] DEFAULT ARRAY['EMAIL']::"NotificationChannel"[],
    "template_id" UUID,
    "offsets_days" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "repeat_enabled" BOOLEAN NOT NULL DEFAULT false,
    "repeat_interval_count" INTEGER,
    "repeat_interval_unit" "ReminderIntervalUnit",
    "max_sends" INTEGER,
    "config" JSONB,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "type" "NotificationType" NOT NULL,
    "trigger" "NotificationTrigger" NOT NULL DEFAULT 'AUTOMATIC',
    "recipient_address" TEXT NOT NULL,
    "recipient_name" TEXT,
    "client_id" UUID,
    "client_user_id" UUID,
    "assignment_id" UUID,
    "template_id" UUID,
    "automation_rule_id" UUID,
    "sent_by_user_id" UUID,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "body_html" TEXT,
    "idempotency_key" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "provider_message_id" TEXT,
    "provider_response" JSONB,
    "failure_reason" TEXT,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "scheduled_for" TIMESTAMP(3),
    "next_retry_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_integrations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider" "EmailIntegrationProvider" NOT NULL,
    "label" TEXT NOT NULL,
    "email_address" TEXT NOT NULL,
    "status" "EmailIntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "scanning_enabled" BOOLEAN NOT NULL DEFAULT false,
    "auto_upload_enabled" BOOLEAN NOT NULL DEFAULT false,
    "scan_interval_minutes" INTEGER NOT NULL DEFAULT 15,
    "imap_host" TEXT,
    "imap_port" INTEGER,
    "imap_use_tls" BOOLEAN,
    "imap_username" TEXT,
    "imap_password_encrypted" TEXT,
    "oauth_access_token_encrypted" TEXT,
    "oauth_refresh_token_encrypted" TEXT,
    "oauth_token_expires_at" TIMESTAMP(3),
    "oauth_scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sync_cursor" TEXT,
    "scanning_since" TIMESTAMP(3),
    "last_sync_at" TIMESTAMP(3),
    "last_successful_sync_at" TIMESTAMP(3),
    "last_sync_error" TEXT,
    "connected_by_user_id" UUID,
    "connected_at" TIMESTAMP(3),
    "disconnected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_emails" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "email_integration_id" UUID NOT NULL,
    "provider_message_id" TEXT NOT NULL,
    "message_id_header" TEXT,
    "thread_id" TEXT,
    "from_address" TEXT NOT NULL,
    "from_name" TEXT,
    "to_addresses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT,
    "body_snippet" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL,
    "status" "ProcessedEmailStatus" NOT NULL DEFAULT 'RECEIVED',
    "ignore_reason" TEXT,
    "attachments_count" INTEGER NOT NULL DEFAULT 0,
    "pdf_attachments_count" INTEGER NOT NULL DEFAULT 0,
    "matched_client_id" UUID,
    "error" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processed_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_attachments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "processed_email_id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "content_hash" TEXT NOT NULL,
    "storage_key" TEXT,
    "status" "EmailAttachmentStatus" NOT NULL DEFAULT 'PENDING',
    "extraction_method" "TextExtractionMethod" NOT NULL DEFAULT 'NONE',
    "extracted_text" TEXT,
    "extracted_metadata" JSONB,
    "duplicate_of_id" UUID,
    "document_id" UUID,
    "error" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "actor_type" "ActorType" NOT NULL,
    "actor_user_id" UUID,
    "actor_client_user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "client_id" UUID,
    "assignment_id" UUID,
    "document_id" UUID,
    "description" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "queue" "JobQueue" NOT NULL,
    "job_name" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "status" "JobRunStatus" NOT NULL DEFAULT 'QUEUED',
    "trigger" "JobTrigger" NOT NULL DEFAULT 'SYSTEM',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "priority" INTEGER,
    "payload" JSONB,
    "result" JSONB,
    "progress" INTEGER,
    "error_message" TEXT,
    "error_stack" TEXT,
    "worker_id" TEXT,
    "worker_host" TEXT,
    "worker_pid" INTEGER,
    "entity_type" TEXT,
    "entity_id" UUID,
    "parent_job_run_id" UUID,
    "triggered_by_user_id" UUID,
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_for" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "wait_ms" INTEGER,
    "duration_ms" INTEGER,
    "logs" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_uuid_idx" ON "password_reset_tokens"("user_uuid");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id");

-- CreateIndex
CREATE INDEX "email_verification_tokens_expires_at_idx" ON "email_verification_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_kind_idx" ON "sessions"("user_id", "kind");

-- CreateIndex
CREATE INDEX "sessions_organization_id_idx" ON "sessions"("organization_id");

-- CreateIndex
CREATE INDEX "sessions_client_user_id_idx" ON "sessions"("client_user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_slug_idx" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_deleted_at_idx" ON "organizations"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "organization_portal_settings_organization_id_key" ON "organization_portal_settings"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_portal_settings_public_slug_key" ON "organization_portal_settings"("public_slug");

-- CreateIndex
CREATE UNIQUE INDEX "organization_document_settings_organization_id_key" ON "organization_document_settings"("organization_id");

-- CreateIndex
CREATE INDEX "organization_members_organization_id_role_idx" ON "organization_members"("organization_id", "role");

-- CreateIndex
CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");

-- CreateIndex
CREATE INDEX "invitations_organization_id_type_status_idx" ON "invitations"("organization_id", "type", "status");

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "invitations"("email");

-- CreateIndex
CREATE INDEX "invitations_client_id_idx" ON "invitations"("client_id");

-- CreateIndex
CREATE INDEX "invitations_expires_at_idx" ON "invitations"("expires_at");

-- CreateIndex
CREATE INDEX "clients_organization_id_status_idx" ON "clients"("organization_id", "status");

-- CreateIndex
CREATE INDEX "clients_organization_id_last_name_first_name_idx" ON "clients"("organization_id", "last_name", "first_name");

-- CreateIndex
CREATE INDEX "clients_organization_id_company_idx" ON "clients"("organization_id", "company");

-- CreateIndex
CREATE INDEX "clients_organization_id_email_idx" ON "clients"("organization_id", "email");

-- CreateIndex
CREATE INDEX "clients_organization_id_tax_id_idx" ON "clients"("organization_id", "tax_id");

-- CreateIndex
CREATE INDEX "clients_organization_id_created_at_idx" ON "clients"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "client_assignments_organization_id_organization_member_id_idx" ON "client_assignments"("organization_id", "organization_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_assignments_client_id_organization_member_id_key" ON "client_assignments"("client_id", "organization_member_id");

-- CreateIndex
CREATE INDEX "client_users_organization_id_status_idx" ON "client_users"("organization_id", "status");

-- CreateIndex
CREATE INDEX "client_users_user_id_idx" ON "client_users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_users_client_id_email_key" ON "client_users"("client_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "client_users_client_id_user_id_key" ON "client_users"("client_id", "user_id");

-- CreateIndex
CREATE INDEX "client_notes_organization_id_client_id_created_at_idx" ON "client_notes"("organization_id", "client_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "forms_current_version_id_key" ON "forms"("current_version_id");

-- CreateIndex
CREATE INDEX "forms_organization_id_status_idx" ON "forms"("organization_id", "status");

-- CreateIndex
CREATE INDEX "forms_organization_id_is_template_idx" ON "forms"("organization_id", "is_template");

-- CreateIndex
CREATE INDEX "forms_organization_id_name_idx" ON "forms"("organization_id", "name");

-- CreateIndex
CREATE INDEX "form_versions_organization_id_form_id_status_idx" ON "form_versions"("organization_id", "form_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "form_versions_form_id_version_number_key" ON "form_versions"("form_id", "version_number");

-- CreateIndex
CREATE INDEX "document_requirements_organization_id_idx" ON "document_requirements"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_requirements_form_version_id_field_key_key" ON "document_requirements"("form_version_id", "field_key");

-- CreateIndex
CREATE INDEX "form_assignments_organization_id_status_idx" ON "form_assignments"("organization_id", "status");

-- CreateIndex
CREATE INDEX "form_assignments_organization_id_client_id_idx" ON "form_assignments"("organization_id", "client_id");

-- CreateIndex
CREATE INDEX "form_assignments_organization_id_form_id_idx" ON "form_assignments"("organization_id", "form_id");

-- CreateIndex
CREATE INDEX "form_assignments_organization_id_deadline_idx" ON "form_assignments"("organization_id", "deadline");

-- CreateIndex
CREATE INDEX "form_assignments_form_version_id_idx" ON "form_assignments"("form_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_requirements_current_document_id_key" ON "assignment_requirements"("current_document_id");

-- CreateIndex
CREATE INDEX "assignment_requirements_organization_id_status_idx" ON "assignment_requirements"("organization_id", "status");

-- CreateIndex
CREATE INDEX "assignment_requirements_organization_id_next_reminder_at_idx" ON "assignment_requirements"("organization_id", "next_reminder_at");

-- CreateIndex
CREATE INDEX "assignment_requirements_document_requirement_id_idx" ON "assignment_requirements"("document_requirement_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_requirements_assignment_id_document_requirement__key" ON "assignment_requirements"("assignment_id", "document_requirement_id");

-- CreateIndex
CREATE UNIQUE INDEX "form_responses_assignment_id_key" ON "form_responses"("assignment_id");

-- CreateIndex
CREATE INDEX "form_responses_organization_id_status_idx" ON "form_responses"("organization_id", "status");

-- CreateIndex
CREATE INDEX "form_answers_organization_id_idx" ON "form_answers"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "form_answers_response_id_field_key_key" ON "form_answers"("response_id", "field_key");

-- CreateIndex
CREATE INDEX "public_submissions_organization_id_status_idx" ON "public_submissions"("organization_id", "status");

-- CreateIndex
CREATE INDEX "public_submissions_organization_id_form_id_idx" ON "public_submissions"("organization_id", "form_id");

-- CreateIndex
CREATE UNIQUE INDEX "documents_storage_key_key" ON "documents"("storage_key");

-- CreateIndex
CREATE UNIQUE INDEX "documents_superseded_by_id_key" ON "documents"("superseded_by_id");

-- CreateIndex
CREATE INDEX "documents_organization_id_client_id_idx" ON "documents"("organization_id", "client_id");

-- CreateIndex
CREATE INDEX "documents_organization_id_assignment_id_idx" ON "documents"("organization_id", "assignment_id");

-- CreateIndex
CREATE INDEX "documents_organization_id_assignment_requirement_id_idx" ON "documents"("organization_id", "assignment_requirement_id");

-- CreateIndex
CREATE INDEX "documents_organization_id_document_requirement_id_idx" ON "documents"("organization_id", "document_requirement_id");

-- CreateIndex
CREATE INDEX "documents_organization_id_review_status_idx" ON "documents"("organization_id", "review_status");

-- CreateIndex
CREATE INDEX "documents_organization_id_expiration_date_idx" ON "documents"("organization_id", "expiration_date");

-- CreateIndex
CREATE INDEX "documents_organization_id_uploaded_at_idx" ON "documents"("organization_id", "uploaded_at");

-- CreateIndex
CREATE INDEX "documents_organization_id_file_format_idx" ON "documents"("organization_id", "file_format");

-- CreateIndex
CREATE INDEX "documents_organization_id_checksum_sha256_idx" ON "documents"("organization_id", "checksum_sha256");

-- CreateIndex
CREATE INDEX "document_versions_organization_id_idx" ON "document_versions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_document_id_version_number_key" ON "document_versions"("document_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "document_inbox_items_email_attachment_id_key" ON "document_inbox_items"("email_attachment_id");

-- CreateIndex
CREATE INDEX "document_inbox_items_organization_id_needs_review_received__idx" ON "document_inbox_items"("organization_id", "needs_review", "received_at");

-- CreateIndex
CREATE INDEX "document_inbox_items_organization_id_processing_status_idx" ON "document_inbox_items"("organization_id", "processing_status");

-- CreateIndex
CREATE INDEX "document_inbox_items_organization_id_source_idx" ON "document_inbox_items"("organization_id", "source");

-- CreateIndex
CREATE INDEX "document_inbox_items_organization_id_confidence_idx" ON "document_inbox_items"("organization_id", "confidence");

-- CreateIndex
CREATE INDEX "document_inbox_items_organization_id_detected_client_id_idx" ON "document_inbox_items"("organization_id", "detected_client_id");

-- CreateIndex
CREATE INDEX "document_inbox_items_document_id_idx" ON "document_inbox_items"("document_id");

-- CreateIndex
CREATE INDEX "reminder_schedules_organization_id_idx" ON "reminder_schedules"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_organization_id_key" ON "notification_settings"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_default_reminder_schedule_id_key" ON "notification_settings"("default_reminder_schedule_id");

-- CreateIndex
CREATE INDEX "notification_templates_organization_id_type_channel_is_defa_idx" ON "notification_templates"("organization_id", "type", "channel", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_organization_id_name_key" ON "notification_templates"("organization_id", "name");

-- CreateIndex
CREATE INDEX "automation_rules_organization_id_trigger_enabled_idx" ON "automation_rules"("organization_id", "trigger", "enabled");

-- CreateIndex
CREATE INDEX "automation_rules_form_id_idx" ON "automation_rules"("form_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_idempotency_key_key" ON "notifications"("idempotency_key");

-- CreateIndex
CREATE INDEX "notifications_organization_id_created_at_idx" ON "notifications"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_organization_id_status_idx" ON "notifications"("organization_id", "status");

-- CreateIndex
CREATE INDEX "notifications_organization_id_client_id_idx" ON "notifications"("organization_id", "client_id");

-- CreateIndex
CREATE INDEX "notifications_organization_id_type_idx" ON "notifications"("organization_id", "type");

-- CreateIndex
CREATE INDEX "notifications_status_next_retry_at_idx" ON "notifications"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "notifications_provider_message_id_idx" ON "notifications"("provider_message_id");

-- CreateIndex
CREATE INDEX "email_integrations_organization_id_status_idx" ON "email_integrations"("organization_id", "status");

-- CreateIndex
CREATE INDEX "email_integrations_scanning_enabled_status_idx" ON "email_integrations"("scanning_enabled", "status");

-- CreateIndex
CREATE UNIQUE INDEX "email_integrations_organization_id_email_address_key" ON "email_integrations"("organization_id", "email_address");

-- CreateIndex
CREATE INDEX "processed_emails_organization_id_received_at_idx" ON "processed_emails"("organization_id", "received_at");

-- CreateIndex
CREATE INDEX "processed_emails_organization_id_status_idx" ON "processed_emails"("organization_id", "status");

-- CreateIndex
CREATE INDEX "processed_emails_organization_id_from_address_idx" ON "processed_emails"("organization_id", "from_address");

-- CreateIndex
CREATE UNIQUE INDEX "processed_emails_email_integration_id_provider_message_id_key" ON "processed_emails"("email_integration_id", "provider_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_attachments_document_id_key" ON "email_attachments"("document_id");

-- CreateIndex
CREATE INDEX "email_attachments_organization_id_content_hash_idx" ON "email_attachments"("organization_id", "content_hash");

-- CreateIndex
CREATE INDEX "email_attachments_organization_id_status_idx" ON "email_attachments"("organization_id", "status");

-- CreateIndex
CREATE INDEX "email_attachments_processed_email_id_idx" ON "email_attachments"("processed_email_id");

-- CreateIndex
CREATE INDEX "activity_logs_organization_id_created_at_idx" ON "activity_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_logs_organization_id_client_id_created_at_idx" ON "activity_logs"("organization_id", "client_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_logs_organization_id_action_idx" ON "activity_logs"("organization_id", "action");

-- CreateIndex
CREATE INDEX "activity_logs_entity_type_entity_id_idx" ON "activity_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "job_runs_organization_id_queue_created_at_idx" ON "job_runs"("organization_id", "queue", "created_at");

-- CreateIndex
CREATE INDEX "job_runs_queue_status_created_at_idx" ON "job_runs"("queue", "status", "created_at");

-- CreateIndex
CREATE INDEX "job_runs_status_created_at_idx" ON "job_runs"("status", "created_at");

-- CreateIndex
CREATE INDEX "job_runs_job_name_created_at_idx" ON "job_runs"("job_name", "created_at");

-- CreateIndex
CREATE INDEX "job_runs_entity_type_entity_id_idx" ON "job_runs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "job_runs_worker_id_started_at_idx" ON "job_runs"("worker_id", "started_at");

-- CreateIndex
CREATE INDEX "job_runs_parent_job_run_id_idx" ON "job_runs"("parent_job_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_runs_queue_job_id_attempt_key" ON "job_runs"("queue", "job_id", "attempt");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_client_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "client_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_portal_settings" ADD CONSTRAINT "organization_portal_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_document_settings" ADD CONSTRAINT "organization_document_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_assignments" ADD CONSTRAINT "client_assignments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_assignments" ADD CONSTRAINT "client_assignments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_assignments" ADD CONSTRAINT "client_assignments_organization_member_id_fkey" FOREIGN KEY ("organization_member_id") REFERENCES "organization_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_assignments" ADD CONSTRAINT "client_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_users" ADD CONSTRAINT "client_users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_users" ADD CONSTRAINT "client_users_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_users" ADD CONSTRAINT "client_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "form_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_duplicated_from_id_fkey" FOREIGN KEY ("duplicated_from_id") REFERENCES "forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_default_reminder_schedule_id_fkey" FOREIGN KEY ("default_reminder_schedule_id") REFERENCES "reminder_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_requirements" ADD CONSTRAINT "document_requirements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_requirements" ADD CONSTRAINT "document_requirements_form_version_id_fkey" FOREIGN KEY ("form_version_id") REFERENCES "form_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_requirements" ADD CONSTRAINT "document_requirements_reminder_schedule_id_fkey" FOREIGN KEY ("reminder_schedule_id") REFERENCES "reminder_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_assignments" ADD CONSTRAINT "form_assignments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_assignments" ADD CONSTRAINT "form_assignments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_assignments" ADD CONSTRAINT "form_assignments_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_assignments" ADD CONSTRAINT "form_assignments_form_version_id_fkey" FOREIGN KEY ("form_version_id") REFERENCES "form_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_assignments" ADD CONSTRAINT "form_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_assignments" ADD CONSTRAINT "form_assignments_reminder_schedule_id_fkey" FOREIGN KEY ("reminder_schedule_id") REFERENCES "reminder_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_requirements" ADD CONSTRAINT "assignment_requirements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_requirements" ADD CONSTRAINT "assignment_requirements_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "form_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_requirements" ADD CONSTRAINT "assignment_requirements_document_requirement_id_fkey" FOREIGN KEY ("document_requirement_id") REFERENCES "document_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_requirements" ADD CONSTRAINT "assignment_requirements_reminder_schedule_id_fkey" FOREIGN KEY ("reminder_schedule_id") REFERENCES "reminder_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_requirements" ADD CONSTRAINT "assignment_requirements_current_document_id_fkey" FOREIGN KEY ("current_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_requirements" ADD CONSTRAINT "assignment_requirements_not_required_by_user_id_fkey" FOREIGN KEY ("not_required_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "form_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_submitted_by_client_user_id_fkey" FOREIGN KEY ("submitted_by_client_user_id") REFERENCES "client_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_answers" ADD CONSTRAINT "form_answers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_answers" ADD CONSTRAINT "form_answers_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "form_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_answers" ADD CONSTRAINT "form_answers_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_answers" ADD CONSTRAINT "form_answers_updated_by_client_user_id_fkey" FOREIGN KEY ("updated_by_client_user_id") REFERENCES "client_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_submissions" ADD CONSTRAINT "public_submissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_submissions" ADD CONSTRAINT "public_submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_submissions" ADD CONSTRAINT "public_submissions_form_version_id_fkey" FOREIGN KEY ("form_version_id") REFERENCES "form_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_submissions" ADD CONSTRAINT "public_submissions_resolved_client_id_fkey" FOREIGN KEY ("resolved_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_submissions" ADD CONSTRAINT "public_submissions_resolved_assignment_id_fkey" FOREIGN KEY ("resolved_assignment_id") REFERENCES "form_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_submissions" ADD CONSTRAINT "public_submissions_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "form_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_assignment_requirement_id_fkey" FOREIGN KEY ("assignment_requirement_id") REFERENCES "assignment_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_document_requirement_id_fkey" FOREIGN KEY ("document_requirement_id") REFERENCES "document_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_public_submission_id_fkey" FOREIGN KEY ("public_submission_id") REFERENCES "public_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_client_user_id_fkey" FOREIGN KEY ("uploaded_by_client_user_id") REFERENCES "client_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_superseded_by_id_fkey" FOREIGN KEY ("superseded_by_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_changed_by_client_user_id_fkey" FOREIGN KEY ("changed_by_client_user_id") REFERENCES "client_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_inbox_items" ADD CONSTRAINT "document_inbox_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_inbox_items" ADD CONSTRAINT "document_inbox_items_detected_client_id_fkey" FOREIGN KEY ("detected_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_inbox_items" ADD CONSTRAINT "document_inbox_items_suggested_assignment_id_fkey" FOREIGN KEY ("suggested_assignment_id") REFERENCES "form_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_inbox_items" ADD CONSTRAINT "document_inbox_items_suggested_requirement_id_fkey" FOREIGN KEY ("suggested_requirement_id") REFERENCES "assignment_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_inbox_items" ADD CONSTRAINT "document_inbox_items_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_inbox_items" ADD CONSTRAINT "document_inbox_items_email_attachment_id_fkey" FOREIGN KEY ("email_attachment_id") REFERENCES "email_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_inbox_items" ADD CONSTRAINT "document_inbox_items_public_submission_id_fkey" FOREIGN KEY ("public_submission_id") REFERENCES "public_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_inbox_items" ADD CONSTRAINT "document_inbox_items_resolved_client_id_fkey" FOREIGN KEY ("resolved_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_inbox_items" ADD CONSTRAINT "document_inbox_items_resolved_assignment_id_fkey" FOREIGN KEY ("resolved_assignment_id") REFERENCES "form_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_inbox_items" ADD CONSTRAINT "document_inbox_items_resolved_requirement_id_fkey" FOREIGN KEY ("resolved_requirement_id") REFERENCES "assignment_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_inbox_items" ADD CONSTRAINT "document_inbox_items_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_schedules" ADD CONSTRAINT "reminder_schedules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_default_reminder_schedule_id_fkey" FOREIGN KEY ("default_reminder_schedule_id") REFERENCES "reminder_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_client_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "client_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "form_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_automation_rule_id_fkey" FOREIGN KEY ("automation_rule_id") REFERENCES "automation_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sent_by_user_id_fkey" FOREIGN KEY ("sent_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_integrations" ADD CONSTRAINT "email_integrations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_integrations" ADD CONSTRAINT "email_integrations_connected_by_user_id_fkey" FOREIGN KEY ("connected_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processed_emails" ADD CONSTRAINT "processed_emails_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processed_emails" ADD CONSTRAINT "processed_emails_email_integration_id_fkey" FOREIGN KEY ("email_integration_id") REFERENCES "email_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processed_emails" ADD CONSTRAINT "processed_emails_matched_client_id_fkey" FOREIGN KEY ("matched_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_attachments" ADD CONSTRAINT "email_attachments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_attachments" ADD CONSTRAINT "email_attachments_processed_email_id_fkey" FOREIGN KEY ("processed_email_id") REFERENCES "processed_emails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_attachments" ADD CONSTRAINT "email_attachments_duplicate_of_id_fkey" FOREIGN KEY ("duplicate_of_id") REFERENCES "email_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_attachments" ADD CONSTRAINT "email_attachments_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_client_user_id_fkey" FOREIGN KEY ("actor_client_user_id") REFERENCES "client_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "form_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_parent_job_run_id_fkey" FOREIGN KEY ("parent_job_run_id") REFERENCES "job_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_triggered_by_user_id_fkey" FOREIGN KEY ("triggered_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

