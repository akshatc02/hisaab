# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Next.js dev server (http://localhost:3000), using the local SQLite file at `DB_PATH` (default `./data/hisaab.db`)
- `npm run build` — production build
- `npm run start` — run a production build locally
- `npx tsc --noEmit` — typecheck (there is no separate lint or test script in this repo; `next build` also runs type checking)

Deploying:
- `vercel --prod` — deploy to production. **Pushing to GitHub does NOT trigger a deploy** — there is no GitHub↔Vercel integration configured, so production must be deployed manually via the Vercel CLI (already linked to project `akshatc02s-projects/hisaab`).

## Architecture

Single-user household-expense tracker ("Hisaab" = ledger/accounts). Next.js 14 App Router, TypeScript, Tailwind. No test suite.

**Auth**: `src/middleware.ts` gates every non-API route by checking for the presence of the `hisaab_session` cookie (not full validation — just presence) and redirects to `/login` if missing. Actual session validation happens per-API-route via a local `requireAuth()` helper (repeated in each `src/app/api/*/route.ts` file) that reads the iron-session cookie via `src/lib/session.ts`. There's a single seeded user (`Akshat` / `Akshat`, bcrypt-hashed) created on first DB init in `src/lib/db.ts` — there is no signup flow.

**Database** (`src/lib/db.ts`): uses `@libsql/client`, which speaks SQLite over either a local file or a remote Turso database, controlled by env vars:
- Local dev: no `TURSO_DATABASE_URL` set → falls back to `file:<DB_PATH>` (default `./data/hisaab.db`)
- Production: `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` point at the hosted Turso DB (free tier)

`db.ts` exports an async `getDb()` that lazily runs schema creation + seed data exactly once per process, then returns a `{ prepare(sql) }` object whose `.get()/.all()/.run()` methods mimic the `better-sqlite3` API shape but are **all async** — every call site must `await` them. This project used to run on `better-sqlite3` directly; it was migrated to `@libsql/client` to allow deploying without a persistent filesystem (Vercel serverless functions have none).

Gotcha: `next.config.js` marks `@libsql/client`/`libsql` as `serverComponentsExternalPackages`. This is required — `libsql` ships a native binding, and without this config webpack mis-bundles it and every DB call fails at runtime with a cryptic `ConnectionFailed`/`Invalid URL` error. If you ever touch DB setup, don't remove this.

**Domain model** (all in one SQLite schema, no ORM — raw SQL in each route):
- `ironing_batches` — a batch goes `PENDING` (sent) → `RECEIVED` (count matches) or `DISPUTED` (count mismatch) → `RESOLVED`. Only one batch can be `PENDING` at a time (enforced in `POST /api/ironing`).
- `milk_log` — one row per `(date, session, vendor)`, session is `morning`/`evening`.
- `settings` — key/value store for `ironing_rate` and `milk_rate` (₹ per piece / per liter).
- `monthly_settlements` — one row per `(year, month, service)`; created by `POST /api/billing`, which computes the amount due from current totals × current rate and locks it in (`settled = 1`). Once settled, changing rates in `settings` does not retroactively affect that month.

**Routes**: pages under `src/app/*/page.tsx` are client components (`'use client'`) that fetch their own data from the sibling `src/app/api/*/route.ts` handlers — there's no server-side data fetching in pages. `BottomNav` (`src/components/BottomNav.tsx`) is the shared tab bar across Home/Ironing/Milk/Billing/Settings.

## Git workflow

This repo is pushed to `https://github.com/akshatc02/hisaab.git` (`main` branch). After making and verifying a change in this project, commit it and push to `origin/main` as part of finishing the task, without waiting for a separate explicit request each time — unless the user says otherwise for that session.
