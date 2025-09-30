# Deployment Runbook

This document covers environment setup, database initialization/migrations, build/run commands, and rollback for the Secure Gate app.

## Components
- Server (Express + PostgreSQL): `secure-gate-access/server`
- Client (React): `secure-gate-access/client`

## Prerequisites
- Node.js 20+
- PostgreSQL 14+ (local or managed)
- Git

## 1) Environment variables

### Server (`secure-gate-access/server/.env`)
Copy `.env.example` to `.env` and update for your environment:

Required keys:
- `PGUSER`, `PGPASSWORD`, `PGHOST`, `PGPORT`, `PGDATABASE`
- `JWT_SECRET` (32+ random hex string)

Optional flags:
- `OTP_DEBUG_ECHO=false`
- `ALERT_ON_OTP_FAILS=false`
- `ENFORCE_HTTPS=false`

### Client (`secure-gate-access/client/.env`)
If the client needs runtime config, create `.env` and set:
- `VITE_API_BASE` or `REACT_APP_API_BASE` (depending on client build tooling) pointing to server base URL (e.g., `http://localhost:3001`)

## 2) Install dependencies
From repo root:

- Root (shared tooling):
  - `npm ci`
- Server:
  - `cd secure-gate-access/server`
  - `npm ci`
- Client:
  - `cd ../client`
  - `npm ci`

## 3) Database init and migrations
Run initial schema and then apply Phase 3 migration.

- Initialize baseline schema:
  - From `secure-gate-access/server`:
    - `npm run db:init`
- Apply Phase 3 migration:
  - `node -e "(async()=>{const {default:pool}=await import('./src/database/db.js');const fs=await import('fs');const sql=fs.readFileSync('./migrations/20250912_phase3_lifecycle_notifications_audit.sql','utf8');await pool.query(sql);console.log('Migration applied');process.exit(0);})().catch(e=>{console.error(e);process.exit(1);})"`

Notes:
- The migration is idempotent (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS) and can be run multiple times safely.

## 4) Build and run

### Server
- Dev: `npm run dev` (from `secure-gate-access/server`)
- Prod:
  - `npm run start:prod`

Server listens on the port defined by your server entry (check `server.js`) or environment.

### Client
- Dev: `npm run dev` (from `secure-gate-access/client`)
- Build: `npm run build`
- Preview: `npm run preview`

Ensure the client points to the correct server API base (via `.env`).

## 5) Health checks
- Server: `GET /health` returns `{ status: 'ok' }`

## 6) Rollback

### Code rollback
- Identify the last known good commit SHA: `git log --oneline`
- Roll back working tree: `git checkout <GOOD_SHA>`
- Optionally create a rollback branch: `git checkout -b rollback/<date>`

### Database rollback
If you have logical backups:

- Create a backup before applying new migrations:
  - `pg_dump -h <host> -U <user> -d <db> -Fc -f backup_<date>.dump`
- Restore to the backup:
  - `pg_restore -h <host> -U <user> -d <db> --clean --if-exists backup_<date>.dump`

If using managed PostgreSQL, consult provider’s point-in-time recovery (PITR) features.

## 7) CI summary
GitHub Actions workflow `.github/workflows/ci.yml` spins up Postgres, runs `db:init`, applies the migration, then runs tests with Node 20.

---
For production, ensure strong `JWT_SECRET`, TLS termination, and secure SMTP/SMS providers if notifications are enabled.