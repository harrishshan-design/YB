-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'BOARD', 'MEMBER');

-- CreateEnum
CREATE TYPE "AnnouncementCategory" AS ENUM ('EVENTS', 'URGENT', 'OPPORTUNITIES');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MeetingAttendanceStatus" AS ENUM ('INVITED', 'ATTENDED', 'ABSENT');

-- CreateEnum
CREATE TYPE "ProgrammeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "GrantStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrganisationRole" AS ENUM ('OWNER', 'ADMIN', 'COMMITTEE', 'MEMBER', 'VOLUNTEER');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('READ', 'REVIEW', 'APPROVE', 'ADMIN');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'WAITLISTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "points" INTEGER NOT NULL DEFAULT 0,
    "avatarUrl" TEXT,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "invite_code" TEXT,
    "invited_by_id" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "AnnouncementCategory" NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),
    "requires_approval" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_registrations" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT,
    "title" TEXT NOT NULL,
    "agenda" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "meet_url" TEXT,
    "minutes_url" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_attendance" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "MeetingAttendanceStatus" NOT NULL DEFAULT 'INVITED',

    CONSTRAINT "meeting_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "type" TEXT NOT NULL,
    "announcement_id" TEXT,
    "event_id" TEXT,
    "reviewer_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registration_no" TEXT,
    "contact_email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation_profiles" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "mission" TEXT,
    "address" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "logo_url" TEXT,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisation_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation_memberships" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "OrganisationRole" NOT NULL DEFAULT 'MEMBER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisation_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "committee_positions" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "term_starts_at" TIMESTAMP(3),
    "term_ends_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "committee_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programmes" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ProgrammeStatus" NOT NULL DEFAULT 'DRAFT',
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programmes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programme_tasks" (
    "id" TEXT NOT NULL,
    "programme_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigned_to" TEXT,
    "due_at" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programme_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programme_registrations" (
    "id" TEXT NOT NULL,
    "programme_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programme_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "programme_id" TEXT,
    "meeting_id" TEXT,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "checked_in_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "skills" TEXT[],
    "availability" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volunteer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_assignments" (
    "id" TEXT NOT NULL,
    "programme_id" TEXT NOT NULL,
    "volunteer_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "hours" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volunteer_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_hours" (
    "id" TEXT NOT NULL,
    "volunteer_id" TEXT NOT NULL,
    "programme_id" TEXT,
    "hours" DECIMAL(8,2) NOT NULL,
    "service_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volunteer_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_complaints" (
    "id" TEXT NOT NULL,
    "reference_no" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_to_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "case_complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_minutes" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "document_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_minutes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "programme_id" TEXT,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "budget_id" TEXT,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "receipt_document_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "donor_name" TEXT,
    "donor_email" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_ref" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grant_applications" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "GrantStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grant_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistance_cases" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "citizen_name" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistance_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citizen_reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "citizen_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_agencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_organisation_access" (
    "id" TEXT NOT NULL,
    "agency_id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "access_level" "AccessLevel" NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_organisation_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_snapshots" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT,
    "owner_type" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "channel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "organisation_id" TEXT,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_invite_code_key" ON "users"("invite_code");

-- CreateIndex
CREATE UNIQUE INDEX "event_registrations_event_id_user_id_key" ON "event_registrations"("event_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_attendance_meeting_id_user_id_key" ON "meeting_attendance"("meeting_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "approvals_announcement_id_key" ON "approvals"("announcement_id");

-- CreateIndex
CREATE UNIQUE INDEX "approvals_event_id_key" ON "approvals"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "organisations_registration_no_key" ON "organisations"("registration_no");

-- CreateIndex
CREATE UNIQUE INDEX "organisation_profiles_organisation_id_key" ON "organisation_profiles"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "organisation_memberships_organisation_id_user_id_key" ON "organisation_memberships"("organisation_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "programme_registrations_programme_id_user_id_key" ON "programme_registrations"("programme_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_profiles_user_id_key" ON "volunteer_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_assignments_programme_id_volunteer_id_key" ON "volunteer_assignments"("programme_id", "volunteer_id");

-- CreateIndex
CREATE UNIQUE INDEX "case_complaints_reference_no_key" ON "case_complaints"("reference_no");

-- CreateIndex
CREATE UNIQUE INDEX "donations_payment_ref_key" ON "donations"("payment_ref");

-- CreateIndex
CREATE UNIQUE INDEX "government_agencies_code_key" ON "government_agencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "agency_organisation_access_agency_id_organisation_id_key" ON "agency_organisation_access"("agency_id", "organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "documents_storage_key_key" ON "documents"("storage_key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_attendance" ADD CONSTRAINT "meeting_attendance_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_attendance" ADD CONSTRAINT "meeting_attendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_profiles" ADD CONSTRAINT "organisation_profiles_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_memberships" ADD CONSTRAINT "organisation_memberships_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_memberships" ADD CONSTRAINT "organisation_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_positions" ADD CONSTRAINT "committee_positions_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_positions" ADD CONSTRAINT "committee_positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programmes" ADD CONSTRAINT "programmes_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_tasks" ADD CONSTRAINT "programme_tasks_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_registrations" ADD CONSTRAINT "programme_registrations_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_registrations" ADD CONSTRAINT "programme_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_profiles" ADD CONSTRAINT "volunteer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "volunteer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_hours" ADD CONSTRAINT "volunteer_hours_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "volunteer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_complaints" ADD CONSTRAINT "case_complaints_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_applications" ADD CONSTRAINT "grant_applications_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistance_cases" ADD CONSTRAINT "assistance_cases_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_organisation_access" ADD CONSTRAINT "agency_organisation_access_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "government_agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_organisation_access" ADD CONSTRAINT "agency_organisation_access_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
