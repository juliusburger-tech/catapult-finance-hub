# Catapult Finance Hub

Internal backoffice for **Catapult Content GbR**: BWA PDF archive with KPI capture, finance dashboard, monthly overview with tax outlook, and simplified tax reserve tracking. **UI language:** German. **Code:** English.

**MVP 1.0** — feature-complete for local single-user use; no authentication.

- **Auth:** none (local use).
- **Stack:** Next.js (App Router), TypeScript strict, Tailwind v4, shadcn/ui, Prisma + Supabase Postgres, Supabase Storage, Recharts.

### Shipped in 1.0

| Area | What you get |
|------|----------------|
| Dashboard | KPIs, year filter, revenue/profit chart, tax preview, entry to monthly rhythm |
| Monatsüberblick | Month/year navigation, cumulative KPIs, tax estimate on cumulative profit, BWA upload deep-link |
| BWA-Archiv | PDF upload, KPIs, list, delete, one BWA per month/year |
| Steuern | Config, reserve card, payments, archive row/year |
| Einstellungen | Version, paths, quick links |
| CI | GitHub Actions: `npm ci` → lint → build |

## Requirements

- Node.js 20+ (LTS recommended)
- npm

## First-time setup

```bash
cd catapult-finance-hub
cp .env.example .env.local
# Fill DATABASE_URL, DIRECT_URL, and SUPABASE_* in .env.local (see .env.example).
# Prisma CLI reads .env by default — copy before db push:
cp .env.local .env
npm install
npx prisma db push
npm run db:seed
```

Use **transaction pooler** (`…pooler…:6543?pgbouncer=true`) for `DATABASE_URL` (app runtime). Use **direct Postgres** for `DIRECT_URL` (host `db.<project-ref>.supabase.co`, port `5432`, no `pgbouncer`) — Prisma `db push` / migrations need this or the CLI can hang on the pooler.

The seed upserts a default `TaxConfig` for the **current calendar year** (defaults: Hebesatz 400, ESt 35 % / 35 %, split 50 / 50). Adjust `prisma/seed.ts` if you need a fixed year.

## Development

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) (`npm run dev` uses port **3001** on purpose so Sales Hub can keep **3000**). Routes: `/` (dashboard), `/monatsueberblick` (monthly rhythm + tax outlook), `/bwa`, `/steuern`, `/einstellungen`.

## npm scripts

| Script | Purpose |
|--------|---------|
| `dev` | Next.js dev server |
| `build` | Production build |
| `start` | Run production server (after `build`) |
| `lint` | ESLint |
| `db:generate` | Regenerate Prisma Client |
| `db:migrate` | Create/apply migrations (interactive dev) |
| `db:push` | Push schema without migration files (dev only) |
| `db:seed` | Run `prisma/seed.ts` |
| `db:studio` | Prisma Studio (browse Postgres) |

## Data on disk

| Path | Contents |
|------|------------|
| Supabase Postgres | Primary database (`DATABASE_URL`) |
| Supabase Storage bucket `bwa` | Uploaded BWA PDFs |

Backups are managed on Supabase (database + storage).

## CI (GitHub Actions)

On push/PR to `main` or `master`: **install → lint → build**.

## Production build

```bash
npm run build
npm start
```

## Deployment notes (Vercel / serverless)

This app is ready for Vercel deployment with Supabase:
- Postgres via `DATABASE_URL` (pooler) + `DIRECT_URL` (direct; for Prisma migrations if you use them)
- Storage via `SUPABASE_*` variables

## Tax and finance disclaimers

All tax figures are **estimates** for internal orientation only—not a substitute for professional tax advice. The same applies to KPIs derived from manually entered BWA fields.

## Project layout (short)

- `src/app/` — App Router pages and route-level server actions (`bwa/actions`, `steuern/actions`)
- `src/components/` — Layout, dashboard, BWA, tax, UI primitives
- `src/lib/` — Prisma client, formatting, tax math, dashboard loaders
- `prisma/` — Schema, migrations, seed
