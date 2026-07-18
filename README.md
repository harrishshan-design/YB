# YB

Public website domain: `https://ybngo.my`

Role-based civic platform with four clear sides: Member, President, Admin, and Master.

## Production stack

- Domain: `ybngo.my` on Namecheap
- Hosting: Vercel (single Next.js app — pages and API both run as Vercel functions)
- Database: Supabase Postgres (accessed through Prisma)
- Authentication: Supabase Auth, via `@supabase/ssr` cookie-based sessions
- Storage: Supabase Storage
- Email: Resend
- Maps: Google Maps
- Payments: Stripe with FPX and cards
- AI: OpenAI API

## Platform architecture

```text
Member Side
President Side
Admin Side
Master Side
        |
        v
Next.js App Router (UI + /api Route Handlers, Vercel functions)
        |
        |-- Supabase Auth session (checked on every route handler)
        |-- Role checks per route (requireUser / requireRole)
        |-- NGO Management
        |-- Programme Management
        |-- Volunteer Management
        |-- Case and Complaint Management
        |-- Finance and Grant Management
        `-- Reporting and Analytics
        |
        v
Supabase Postgres (via Prisma) + Supabase Storage
        |
        |-- Stripe Payments
        |-- Resend Email
        |-- Google Maps
        |-- OpenAI API
        `-- Government Open Data APIs
```

There is no separate Express/Socket.io service. Earlier drafts of this project ran
a standalone API with an in-memory token store and a Socket.io server; both are
incompatible with Vercel's serverless model (no long-lived process, no shared
memory across invocations), so all API logic now lives in Next.js Route
Handlers under `src/app/api/*`, and real-time features are deferred to polling
or Supabase Realtime rather than a self-hosted Socket.io server.

## What is included

- Supabase Auth login (email + password) with a session cookie shared between the browser and the API route handlers
- Server-side authorization on every API route: each handler checks the caller's Supabase session and, where relevant, their role (`requireUser` / `requireRole` in `src/lib/auth.ts`)
- Elderly-friendly simple mode with large buttons, plain wording, clear focus states, and task-first navigation
- Member, President, Admin, and Master roles
- Member circles: members can add new members under their own profile while Admin/Master/President can place a new member under anyone
- Announcement categories for events, urgent updates, and opportunities
- Rewards and monthly top 10 leaderboard model
- Meeting scheduling with attendance
- Approval workflow for announcements and events, actioned by President/Admin/Master
- Platform module models for NGOs, programmes, volunteers, cases, grants, reports, and secure files
- Production integration helpers for Supabase, Resend, Stripe, Google Maps, and OpenAI

## Vercel environment variables

Add these in Vercel Project Settings -> Environment Variables:

```text
NEXT_PUBLIC_SITE_URL=https://ybngo.my
DATABASE_URL=your-supabase-connection-string
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_STORAGE_BUCKET=documents
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL=YB NGO <noreply@ybngo.my>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-browser-maps-key
GOOGLE_MAPS_API_KEY=your-server-maps-key
STRIPE_SECRET_KEY=your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
OPENAI_API_KEY=your-openai-api-key
```

`SUPABASE_SERVICE_ROLE_KEY` is only used server-side (seed script, admin-only
route handlers) — never expose it to the browser.

## Demo login

Demo accounts are created by the seed script as real Supabase Auth users, not
hardcoded credentials in the app. All of them share one password, which you
set via `SEED_DEMO_PASSWORD` before seeding (see below).

| Role | Email |
| --- | --- |
| Member | `member@demo.com` |
| President | `president@demo.com` |
| Admin | `admin@demo.com` |
| Master | `master@demo.com` |

Rotate or delete these accounts before onboarding real users.

## Database tables

The Prisma schema maps to production-style snake_case PostgreSQL tables:

`users`, `organisations`, `organisation_profiles`, `organisation_memberships`, `committee_positions`, `programmes`, `programme_tasks`, `programme_registrations`, `attendance_records`, `volunteer_hours`, `meetings`, `meeting_minutes`, `announcements`, `documents`, `budgets`, `expenses`, `donations`, `grant_applications`, `assistance_cases`, `case_complaints`, `citizen_reports`, `government_agencies`, `agency_organisation_access`, `notifications`, `audit_logs`, and `subscriptions`.

`users.auth_user_id` links each profile row to its Supabase Auth user (`auth.users.id`).

Common operational columns include `organisation_id`, `created_by`, `created_at`, `updated_at`, and `status` where relevant.

`agency_organisation_access` includes `agency_id`, `organisation_id`, `access_level`, `approved_by`, `approved_at`, and `expires_at`.

## Getting started

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to your PostgreSQL database, and `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` to a real Supabase project (seeding creates real Supabase Auth users, so a placeholder project won't work).
3. Install dependencies:

```bash
npm install
```

4. Generate Prisma client and create tables:

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Seed demo data (creates the Supabase Auth demo accounts too):

```bash
npm run db:seed
```

6. Start the app:

```bash
npm run dev
```

The app runs on `http://localhost:3000`, serving both the UI and the `/api/*` route handlers.

Production website: `https://ybngo.my`
