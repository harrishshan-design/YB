# YBNGO

The operating system for Malaysian NGOs and community organisations.

## Run locally

```sh
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The public website is at `/`, plans at `/pricing`, and six usable demo roles at `/demo`.

The demo works without a database connection. Sample changes persist in browser local storage, separately for each club. Reset sample data from the demo bar. Demo sessions cannot authenticate server API requests.

## Main workflow

Create an organisation, import members, create a programme, register participants, record attendance and volunteer hours, attach photos, then prepare and download the programme PDF report.

Normal members have a compact portal. Staff navigation is based on their role **inside the selected organisation**, including committee member, programme manager, organisation admin and owner. The legacy `/member`, `/president`, `/admin` and `/master` entry URLs continue to work.

## Stack

Next.js App Router, React, Prisma 6, Supabase Auth and private Storage, PostgreSQL, Stripe, Recharts, Papa Parse, QRCode and jsPDF. Existing Resend, Maps and AI helpers remain available but are not invoked automatically.

## Configuration

Start from `.env.example`. Never commit `.env`, `.env.local` or `.env.render`.

- `DATABASE_URL`: the correct Supabase Postgres connection for the deployment host.
- `NEXT_PUBLIC_SITE_URL`: the actual public origin.
- `NEXT_PUBLIC_SUPABASE_URL` and either `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or the compatible anon key.
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`: server-only private storage access.
- `SUPABASE_STORAGE_BUCKET`: a private bucket, default `documents`.
- `YBNGO_SIGNING_SECRET`: random server-only secret for QR/member verification.
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`: payment checkout and verified callbacks.

Allow `/auth/callback` on the intended origins in Supabase Auth. Configure a transactional mail provider for real signup emails.

## Database and release

Read [docs/RELEASE.md](docs/RELEASE.md) before deployment. This release needs a schema migration before the new server accesses an existing database. It preserves existing primary-club memberships, adds capacity/billing fields and blocks direct browser access to application tables. It does not delete duplicate attendance; it stops for review if duplicates exist.

The local database was unreachable during implementation. No remote schema or customer data was modified. Restore that connection and test live registration, storage and payments before merging the release into the production branch.

## Verification

```sh
npm test
npm run build
```

Browser regression: `npm run test:ui`. Set `PLAYWRIGHT_MODULE` to an installed Playwright package if it is outside this project's dependencies, and `CHROME_PATH` if Chrome is installed at a non-default location. Screenshots and exported test PDFs are saved under ignored `artifacts/`.

## Billing

Community RM0, Organisation RM39/month or RM390/year, Professional RM89/month or RM890/year, Network RM199/month or RM1,990/year. New workspaces start a no-card 14-day Professional trial. Expired trials fall back to Community without deleting existing data.

Stripe callbacks at `/api/billing/webhook` verify signatures and event IDs, retrieve provider state and update the server subscription. Browser success redirects never grant entitlements. Current recurring checkout supports cards; FPX/DuitNow require a suitable provider flow.

See the release notes for the implementation boundary and remaining integrations.
