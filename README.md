# NGO Youth Club System

Role-based NGO platform for board members, youth club members, and a super admin.

## What is included

- Admin, board, and member roles
- Member circles: members can add new members under their own profile while admins keep full visibility of the hierarchy
- Announcement categories for events, urgent updates, and opportunities
- Rewards and monthly top 10 leaderboard model
- Board meeting management with attendance and minutes URL support
- Approval workflow for announcements and events
- Board chat data model plus Socket.io channels for `general`, `meetings`, and `decisions`
- Next.js dashboard UI
- Express API backed by Prisma/PostgreSQL

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
