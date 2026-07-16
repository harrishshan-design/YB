# YB

Public website domain: `https://ybngo.my`

Role-based civic platform with four clear sides: Member, President, Admin, and Master.

## Platform architecture

```text
Member Side
President Side
Admin Side
Master Side
        |
        v
Next.js Application and API Layer
        |
        |-- Authentication and Permissions
        |-- NGO Management
        |-- Programme Management
        |-- Volunteer Management
        |-- Case and Complaint Management
        |-- Finance and Grant Management
        `-- Reporting and Analytics
        |
        v
PostgreSQL + Secure File Storage
        |
        |-- MyDigital ID
        |-- Payment Gateway
        |-- Email / WhatsApp / Telegram
        `-- Government Open Data APIs
```

## What is included

- Login screen with demo role accounts and role-based navigation
- Elderly-friendly simple mode with large buttons, plain wording, clear focus states, and task-first navigation
- Member, President, Admin, and Master roles
- Member circles: members can add new members under their own profile while admins keep full visibility of the hierarchy
- Announcement categories for events, urgent updates, and opportunities
- Rewards and monthly top 10 leaderboard model
- President and committee meeting management with attendance and minutes URL support
- Approval workflow for announcements and events
- President and committee chat data model plus Socket.io channels for `general`, `meetings`, and `decisions`
- Next.js dashboard UI
- Express API backed by Prisma/PostgreSQL
- Platform module models for NGOs, programmes, volunteers, cases, grants, reports, and secure files

## Demo login

All demo passwords are `123456`.

| Role | Email |
| --- | --- |
| Member | `member@demo.com` |
| President | `president@demo.com` |
| Admin | `admin@demo.com` |
| Master | `master@demo.com` |

The Express API also includes demo endpoints:

- `POST /auth/login`
- `GET /auth/me`

## Database tables

The Prisma schema maps to production-style snake_case PostgreSQL tables:

`users`, `organisations`, `organisation_profiles`, `organisation_memberships`, `committee_positions`, `programmes`, `programme_tasks`, `programme_registrations`, `attendance_records`, `volunteer_hours`, `meetings`, `meeting_minutes`, `announcements`, `documents`, `budgets`, `expenses`, `donations`, `grant_applications`, `assistance_cases`, `citizen_reports`, `government_agencies`, `agency_organisation_access`, `notifications`, `audit_logs`, and `subscriptions`.

Common operational columns include `organisation_id`, `created_by`, `created_at`, `updated_at`, and `status` where relevant.

`agency_organisation_access` includes `agency_id`, `organisation_id`, `access_level`, `approved_by`, `approved_at`, and `expires_at`.

## Getting started

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to your PostgreSQL database.
3. Install dependencies:

```bash
npm install
```

4. Generate Prisma client and create tables:

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Start the frontend:

```bash
npm run dev
```

6. Start the API in a second terminal:

```bash
npm run dev:api
```

The frontend runs on `http://localhost:3000`.
The API runs on `http://localhost:4000`.

Production website: `https://ybngo.my`

