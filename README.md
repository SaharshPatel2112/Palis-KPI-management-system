# KPI Management System — Phase 1 scaffold

Sign-in via Clerk, a Postgres schema (via Prisma) covering all 6 departments
generically, and a dashboard pulling real target-vs-achieved numbers per
department. No department-specific entry forms yet — that's Phase 2 onward.

Stack matches your other sprints: React + Vite + TypeScript + Tailwind,
Node/Express + TypeScript, Prisma, Supabase Postgres, Clerk for auth.

## 1. Accounts you need
- Supabase project (free tier) → copy the Postgres connection string.
- Clerk application (free tier) → copy the publishable key and secret key.

## 2. Backend
    cd backend
    npm install
    cp .env.example .env      # fill in DATABASE_URL and CLERK_SECRET_KEY
    npx prisma migrate dev --name init
    npx prisma db seed
    npm run dev

API runs on http://localhost:5000.

## 3. Frontend
    cd frontend
    npm install
    cp .env.example .env      # fill in VITE_CLERK_PUBLISHABLE_KEY
    npm run dev

App runs on http://localhost:5173.

## 4. First login
Sign up through the app once (any email works). The dashboard's first load
calls `/api/employees/sync`, which creates your Employee row with role
`EMPLOYEE`. Open `npx prisma studio` (from `backend/`) and change your own
row's `role` to `ADMIN` — every login after that carries admin rights.

## What's simplified for now — fix before this goes near production
- Open sign-up: anyone can create an account and get an Employee row. Add an
  invite-only setup or an email-domain restriction in Clerk's dashboard if
  that's not acceptable for a company tool.
- No request validation (zod/joi) — the API currently trusts the shape of the
  request body.
- No rate limiting on the API.
- Role lives only in our own DB, not synced back to Clerk's metadata — fine
  for one app, worth revisiting if a second app ever reads the same Clerk users.
