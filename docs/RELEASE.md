# YBNGO SaaS redesign

This release replaces the login-first site with a public product website and a complete organisation workspace. The normal member portal is deliberately smaller than the staff interface.

## Implemented and locally verified

- Public homepage, monthly/yearly pricing, four plans, add-on descriptions, onboarding, support, terms and privacy pages.
- Create/join organisation flows. The creator owns the new organisation. Invitations create member applications; owners assign committee, programme manager and admin permissions. Platform admins remain manually provisioned.
- Separate club workspaces, per-club permissions and Network branch creation. Legacy primary club memberships are preserved by the migration.
- Persistent browser demo for six roles. Browser data never authenticates requests to production APIs.
- Member directory, status filters, membership types and expiry editing, CSV import/export, application approvals and staff role assignment.
- Programme creation, capacity, registration/cancellation, manual attendance, duplicate prevention and signed QR check-in links. Self check-in is limited to the programme window; staff can record attendance manually.
- Volunteer-hour records and certificate PDF exports, tasks, meeting agendas/minutes, announcements and scheduled notices.
- Private document uploads/downloads, programme photos, club details, logo/branding and audit records.
- Editable fourteen-section programme PDF reports with actual attendance, volunteer hours, expenses and photos.
- Plan capacity checks, a 14-day Professional trial, Community fallback, seven-day payment grace period, billing portal/checkout integration and signed, idempotent Stripe callbacks. No client callback can grant a paid plan.
- Platform subscription list, MRR, ARR, trials and recorded paid conversion. Branches do not inflate recurring revenue.

## Deployment prerequisites

The configured local database could not be reached during this work. The connected Supabase account did not list the YBNGO project. No remote schema or customer records were changed, and live signup, private storage and paid checkout were not tested against the production account.

1. Restore `DATABASE_URL` for the correct YBNGO database and verify access from the deployment host.
2. Apply the reviewed Prisma migration in `prisma/migrations/202610260001_product_workspaces/migration.sql` before releasing the new server. It adds columns and indexes, backfills existing primary memberships, and protects application tables from direct Data API access. If duplicate legacy attendance exists, the migration stops for review rather than deleting NGO records.
3. Configure Supabase Auth redirect allowlists for `/auth/callback` on the actual domain and local preview. Use a transactional SMTP provider for production confirmation emails.
4. Create a **private** Supabase Storage bucket named by `SUPABASE_STORAGE_BUCKET`. The application authorises each upload and download and uses short-lived signed download links. The server needs its Supabase secret key; it is never sent to clients.
5. Set `YBNGO_SIGNING_SECRET` to a random server-only secret of at least 32 bytes. This signs attendance and membership verification URLs.
6. Configure Stripe keys, the customer billing portal and webhook endpoint `/api/billing/webhook`. Subscribe to subscription-created/updated/deleted, checkout-completed, invoice-paid and invoice-payment-failed events. Verify a test payment, renewal, cancellation and failed payment before accepting real subscriptions.

For an existing database without Prisma migration history, use the project's Prisma 6 CLI after reviewing the SQL:

```sh
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/202610260001_product_workspaces/migration.sql
npx prisma generate
npm run build
```

For a brand-new empty database, initialise the full schema with `npx prisma db push`, then run the reviewed SQL to apply Data API restrictions and legacy compatibility checks. Do not run `db push` with destructive options against existing NGO records.

## Deliberately not represented as live integrations

- Recurring checkout uses cards. FPX/DuitNow need a provider and billing flow that support them; the provider interface allows that extension.
- Add-on purchases, custom domains, outbound organisation webhooks, AI-assisted report writing and SMS delivery need their operational integrations. The pricing page describes add-ons without collecting payment for them.
- Membership reminder delivery, bulk email notifications, custom member fields, guest-only registrations, document approval chains and finance automation need further implementation. The existing Resend/OpenAI/Maps helpers are retained but the redesign does not call them automatically.
- Advanced cohort churn and trial-to-paid reporting need a sufficient history of subscription transitions. The platform currently shows metrics calculated from recorded subscriptions; no illustrative revenue or conversion numbers are presented as real data.

## Verification

`npm test` covers role boundaries, attendance uniqueness, foreign-club identifiers, capacity, trial expiry, grace periods, token tampering and revenue calculations. `npm run build` verifies the production routes and types. `scripts/verify-ui.cjs` exercises the complete demo workflow and saves desktop/mobile screenshots plus an actual exported report under ignored `artifacts/`.

Next.js was updated to 16.4.3 and compatible dependency patches were applied. The remaining npm audit items are in the existing Prisma configuration toolchain and Maps client's transitive dependencies; they require reviewed dependency changes rather than a forced major upgrade.

Public illustrative photographs are bundled locally from Unsplash. Real programme uploads stay inside the organisation's authorised storage paths.
