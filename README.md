# Catapult Finance Hub

Internal backoffice for **Catapult Content GbR**: BWA PDF archive with KPI capture, finance dashboard, monthly overview with tax outlook, and simplified tax reserve tracking. **UI language:** German. **Code:** English.

**MVP 1.0** — feature-complete for local single-user use; no authentication.

- **Auth:** none (local use).
- **Stack:** Next.js (App Router), TypeScript strict, Tailwind v4, shadcn/ui, Prisma + SQLite, Recharts.

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
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
```

The seed upserts a default `TaxConfig` for the **current calendar year** (defaults: Hebesatz 400, ESt 35 % / 35 %, split 50 / 50). Adjust `prisma/seed.ts` if you need a fixed year.

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Routes: `/` (dashboard), `/monatsueberblick` (monthly rhythm + tax outlook), `/bwa`, `/steuern`, `/einstellungen`.

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
| `db:studio` | Prisma Studio (SQLite browser) |

## Data on disk

| Path | Contents |
|------|------------|
| `prisma/finance.db` | SQLite database (gitignored) |
| `public/uploads/bwa/` | Uploaded BWA PDFs (PDF files gitignored; `.gitkeep` kept) |

Back up both when moving machines.

## CI (GitHub Actions)

On push/PR to `main` or `master`: **install → lint → build**. No database or uploads required; `DATABASE_URL` is set to a dummy SQLite path for the build only.

## Production build

```bash
npm run build
npm start
```

## Deployment notes (Vercel / serverless)

This app is **optimized for localhost**: Prisma uses **SQLite** and PDFs are stored on the **local filesystem**. Serverless hosts typically have **ephemeral storage**, so the database and uploads would not persist reliably without changes (e.g. move to Postgres + object storage). Treat **Vercel as optional** only after that migration.

## Tax and finance disclaimers

All tax figures are **estimates** for internal orientation only—not a substitute for professional tax advice. The same applies to KPIs derived from manually entered BWA fields.

## Project layout (short)

- `src/app/` — App Router pages and route-level server actions (`bwa/actions`, `steuern/actions`)
- `src/components/` — Layout, dashboard, BWA, tax, UI primitives
- `src/lib/` — Prisma client, formatting, tax math, dashboard loaders
- `prisma/` — Schema, migrations, seed
