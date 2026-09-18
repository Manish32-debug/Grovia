# Grovia

**Fresh choices. Everyday.**

A production-style grocery commerce platform: catalog and typo-tolerant search, persistent cart,
delivery slots, a real coupon engine, UPI QR payments with webhook verification, an order state
machine, inventory with reservation semantics, and data-driven recommendations.

Built in phases. This README tracks what actually works, not what is planned.

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Architecture, ER design, design system | Done |
| 1 | Monorepo, frontend, API, config, database connection | Done |
| 2 | Prisma schema, migrations, seed | Done |
| 3 | Authentication, roles, email verification, password reset | Done |
| 4 | Catalog, search, filters, product pages | Next |
| 5–16 | Auth → catalog → cart → checkout → payments → orders → delivery → admin → intelligence → tests → security → deploy | Planned |

## Stack

React 18 · Vite 6 · TypeScript · Tailwind CSS v4 · TanStack Query · Zustand · React Router
Node 22 · Express · TypeScript · Zod · pino
PostgreSQL 16 · Prisma (phase 2)
Cashfree Payments sandbox (phase 7) · Vitest + Supertest + Playwright (phase 13)

## Layout

```
apps/
  api/                 Express API — routes → controllers → services → database
  web/                 React SPA
packages/
  shared/              Zod schemas, enums, money helpers, design tokens
docker-compose.yml     PostgreSQL 16 on port 5433
```

`packages/shared` is consumed as TypeScript source, not a build artifact, so a change to an enum or
a response type breaks compilation on both sides immediately.

## Running locally

Requires Node 20.11+, pnpm 9, Docker.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm pg:up          # PostgreSQL on localhost:5433

# first run only — see apps/api/prisma/migrations/README.md
pnpm db:migrate:create --name init
cat apps/api/prisma/sql/init-extras.sql >> apps/api/prisma/migrations/*_init/migration.sql
pnpm db:migrate
pnpm db:seed

pnpm dev            # API on :4000, web on :5173
```

Open http://localhost:5173. The status card on the home page is a live request to
`/api/v1/health/ready`, which really queries Postgres — if the database is down it says so.

| Command | Effect |
| --- | --- |
| `pnpm dev` | API and web in watch mode |
| `pnpm typecheck` | `tsc --noEmit` across all packages |
| `pnpm test` | Vitest suites |
| `pnpm lint` | ESLint flat config |
| `pnpm build` | Production build of both apps |
| `pnpm pg:up` / `pg:down` / `pg:nuke` | PostgreSQL container lifecycle |
| `pnpm db:migrate` / `db:seed` / `db:reset` | Schema migrations and seed data |
| `pnpm db:studio` | Prisma Studio |

Postgres is mapped to **5433**, not 5432, so it never collides with a local install.

## Conventions

**Money is integer paise everywhere.** Every monetary column, field and calculation. Rupee decimals
exist at exactly two boundaries: the payment gateway and the rendered UI. See
`packages/shared/src/money.ts`.

**The backend is authoritative.** The client sends intent — product id, quantity, coupon code, slot
id, address id. It never sends price, discount, stock, total, status or role, and the API never
reads them from a request body.

**Errors are structured.** Every failure is
`{ error: { code, message, details?, requestId } }` where `code` is a stable machine string the
frontend maps to user-facing copy. `x-request-id` is echoed on every response and appears in the
logs, so a screenshot is enough to find the request.

**The database enforces what the code assumes.** Price denormalisation, stock non-negativity, one
default address per user, one open payment attempt per order, order totals adding up, slot capacity
— all of these are `CHECK` and partial-unique constraints, not just service-layer validation. See
`apps/api/prisma/sql/init-extras.sql`.

**Design tokens have one source.** `packages/shared/src/design-tokens.ts` is canonical for
TypeScript consumers; `apps/web/src/styles/index.css` mirrors it inside Tailwind's `@theme`.

## Authentication

Passwords are argon2id (19 MiB, t=2, p=1). Sessions are a 15-minute HS256 access token held in
memory by the browser plus a 7-day opaque refresh token in an httpOnly cookie scoped to
`/api/v1/auth`. The refresh token is stored only as a SHA-256 digest, so a database dump cannot be
replayed as sessions.

Refresh uses rotation with reuse detection: every refresh issues a new token and revokes the one
spent, so presenting an already-revoked token means it was stolen. That revokes the entire token
family and forces a fresh sign-in for everyone holding it. The decision is a pure function in
`services/auth/refreshPolicy.ts` and is exhaustively unit-tested.

A password reset or change bumps the user's `tokenVersion`, which invalidates every live access
token without a revocation list, and revokes all refresh tokens. Login answers identically for a
wrong password and a nonexistent account, and equalises timing by verifying against a decoy hash.
`forgot-password` always returns 202.

CSRF: the cookie is `SameSite=Lax` and every auth route additionally requires
`X-Requested-With: grovia-web`, which a cross-origin form cannot set and a cross-origin fetch cannot
send without a preflight the CORS allowlist rejects.

In development, verification and reset links are printed to the API log rather than emailed.

## Seed data

`pnpm db:seed` is idempotent and deterministic. Catalog rows are upserted on natural keys; the
generated order history is rebuilt from a fixed PRNG seed so the association rules and Smart Basket
predictions derived from it in phase 11 are reproducible rather than a different draw each run.

It creates 10 categories, 49 products with inventory and images, 1 admin, 2 delivery partners,
5 customers, 4 slot templates across 7 days, 4 coupons (one deliberately expired, for negative-path
tests), roughly 50 delivered orders drawn from realistic co-purchase baskets, and verified reviews
with recomputed rating aggregates.

Every seeded account signs in with `Grovia@123`. Product images are placeholders until phase 4
replaces them with credited stock photography.

## Environment

Both apps ship a `.env.example`. The API parses `process.env` with Zod at import time and exits
with a readable list of problems if anything is missing — a misconfigured deploy fails at startup,
not mid-request. No secret is ever committed; `.env` is git-ignored.

## Licence and assets

Product photography is sourced from openly licensed stock and attributed in `docs/CREDITS.md` from
phase 4 onward. The visual identity is original; the layout reference used during design was not
copied.
