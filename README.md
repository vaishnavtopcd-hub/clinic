# Physiotherapy Clinic Management System (v1)

Multi-tenant SaaS for physiotherapy clinics: patients, consultations, machine usage,
clinical notes, visit history, payments and reporting — with full clinic-wise data
isolation and role-based access control.

## Stack

| Layer    | Tech                                                        |
| -------- | ----------------------------------------------------------- |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS + TanStack Query |
| Backend  | NestJS + TypeORM + PostgreSQL + Passport JWT                 |
| Auth     | JWT access tokens, bcrypt password hashing, RBAC            |

## Roles

- **Super Admin** — manages all clinics, clinic admins, global machine master.
- **Clinic Admin** — manages one clinic: physiotherapists, patients, machines, reports.
- **Physiotherapist** — registers patients, creates consultations, records machine usage & payments.

## Prerequisites

- Node.js 18+
- PostgreSQL 13+ (install locally **or** use the bundled Docker Compose)

## Setup

```bash
# 1. Install everything (root + backend + frontend)
npm run install:all

# 2. Configure backend env
cp backend/.env.example backend/.env
#   edit DB credentials in backend/.env if needed

# 3. Start PostgreSQL
#    Option A — Docker (recommended, matches .env.example defaults):
docker compose up -d
#    Option B — your own Postgres: create the database
createdb physio_clinic        # or use pgAdmin / psql

# 4. Seed demo data (clinics, users, machines, patients, consultations).
#    The schema auto-creates on first connect (TypeORM synchronize).
npm run seed

# 5. Run both apps together
npm run dev
```

You can also run each app separately: `npm run dev:api` and `npm run dev:web`.

### Local PostgreSQL (no-admin install used on this machine)

This machine has a portable PostgreSQL 16 cluster under `C:\pglocal` (binaries from
Maven Central, data dir `C:\pglocal\data`, superuser `postgres`, trust auth, port 5432).
It is **not** a Windows service, so start it after each reboot:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pg-start.ps1   # start
powershell -ExecutionPolicy Bypass -File scripts/pg-stop.ps1    # stop
```

The `physio_clinic` database has already been created and seeded.

- API:  http://localhost:3000/api  (Swagger docs at `/api/docs`)
- Web:  http://localhost:5173

## Demo logins (after seeding)

| Role          | Email                       | Password    |
| ------------- | --------------------------- | ----------- |
| Super Admin   | super@admin.com             | Passw0rd!   |
| Clinic Admin  | admin@sunrise.com           | Passw0rd!   |
| Physiotherapist | physio@sunrise.com        | Passw0rd!   |

## Project structure

```
backend/   NestJS API (auth, clinics, users, patients, consultations, machines, dashboard, reports)
frontend/  React SPA (sidebar layout, role-aware routing, all modules)
```

See `backend/README` notes inline and module folders for details.
