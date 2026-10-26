BEGIN;
ALTER TYPE "OrganisationRole" ADD VALUE IF NOT EXISTS 'PROGRAMME_MANAGER';
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES organisations(id);
CREATE INDEX IF NOT EXISTS organisations_parent_id_idx ON organisations(parent_id);
ALTER TABLE organisation_memberships ADD COLUMN IF NOT EXISTS number TEXT, ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Ordinary Member', ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP(3);
INSERT INTO organisation_memberships (id,organisation_id,user_id,role,status,number,created_at,updated_at)
SELECT 'legacy-' || md5(u.organisation_id || u.id),u.organisation_id,u.id,
 (CASE WHEN u.role::text='PRESIDENT' THEN 'OWNER' WHEN u.role::text='ADMIN' THEN 'ADMIN' ELSE 'MEMBER' END)::"OrganisationRole",
 CASE WHEN u."isActive" THEN 'ACTIVE' ELSE 'INACTIVE' END,
 'YB-' || upper(substr(md5(u.organisation_id || u.id),1,8)),CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM users u WHERE u.organisation_id IS NOT NULL
ON CONFLICT (organisation_id,user_id) DO NOTHING;
ALTER TABLE programmes ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 60, ADD COLUMN IF NOT EXISTS details JSONB;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMP(3);
-- Stop for review if legacy records contain duplicate attendance. Never delete NGO records automatically.
DO $$ BEGIN IF EXISTS (SELECT 1 FROM attendance_records WHERE programme_id IS NOT NULL GROUP BY programme_id,user_id HAVING COUNT(*)>1) THEN RAISE EXCEPTION 'Duplicate attendance exists. Review the duplicate records before applying this migration.'; END IF; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS attendance_records_programme_id_user_id_key ON attendance_records(programme_id,user_id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS size INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly', ADD COLUMN IF NOT EXISTS provider_customer_id TEXT, ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT, ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP(3), ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP(3), ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP(3), ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_provider_subscription_id_key ON subscriptions(provider_subscription_id);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS grace_ends_at TIMESTAMP(3);
CREATE TABLE IF NOT EXISTS payment_events (id TEXT PRIMARY KEY, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
-- These tables are served through the authenticated application API, not the public Data API.
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS audit_logs_organisation_created_idx ON audit_logs(organisation_id,created_at);
CREATE INDEX IF NOT EXISTS subscriptions_organisation_created_idx ON subscriptions(organisation_id,created_at);
-- Database access is through server-side Prisma; browsers do not need direct table access.
DO $$ DECLARE table_name text; BEGIN FOREACH table_name IN ARRAY ARRAY['users','organisations','organisation_profiles','organisation_memberships','committee_positions','programmes','programme_tasks','programme_registrations','attendance_records','volunteer_profiles','volunteer_assignments','volunteer_hours','meetings','meeting_attendance','meeting_minutes','announcements','approvals','documents','budgets','expenses','donations','grant_applications','assistance_cases','case_complaints','citizen_reports','government_agencies','agency_organisation_access','notifications','audit_logs','subscriptions','report_snapshots','activity','rewards','messages','events','event_registrations'] LOOP IF to_regclass('public.' || table_name) IS NOT NULL THEN EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name); EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',table_name); END IF; END LOOP; END $$;
COMMIT;
