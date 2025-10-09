# PriceDropp

Monorepo for a production-oriented price watch and alerting app.

- Frontend: Next.js 15 (App Router), TypeScript, Tailwind, TanStack Query
- Backend: Next.js route handlers + tRPC, NextAuth, Prisma (Postgres)
- Worker: BullMQ + Redis + Playwright for scraping and alert evaluation
- Notifications: Telegram Bot API, SMTP (via Mailhog in dev)
- Deployment: Docker Compose (web, worker, postgres, redis, mailhog)

## Quick Start (Dev)

- Copy `.env.example` to `.env` and set secrets
- Start services: `docker compose up --build`
- Migrate + seed: in another terminal, run inside the `web` container or locally:
  - `pnpm --filter @pricedropp/db prisma:migrate`
  - `pnpm --filter @pricedropp/db seed`
- App: http://localhost:3000
- Mailhog: http://localhost:8025

See [docs/manual-preview.md](./docs/manual-preview.md) if you need to manually trigger the product preview scraper (includes both Unix shell and Windows PowerShell examples).

## Structure

- `apps/web` — Next.js app with auth, tRPC, REST feeds
- `apps/worker` — BullMQ workers, Playwright scraper, alert logic, cron
- `packages/db` — Prisma schema, client, seed
- `packages/shared` — Zod schemas, alert logic, price parser, rate limiter, ETag, notify helpers

## Core Flows

- Users sign up with email/password or Google OAuth (NextAuth).
- Add watch: URL + target price; product is created/linked; background cron enqueues scraping.
- Scraper loads page, extracts price text via site rule selectors, parses price/currency.
- DB updates price + history, enqueues alert evaluation.
- Alert evaluator applies cooldowns, quiet hours (via user settings), daily caps; sends Telegram/email when applicable.
- Public feeds: `/api/products?sort=recent|popular` with ETag + SWR headers; `/api/product/[id]` for detail + history.

## Env Vars

See `.env.example` for required variables. Default timezone is Pacific/Auckland.

## Tests (skeleton)

- Add unit tests under `packages/shared` for price parsing and alert logic.
- Add integration/E2E as needed.

## Admin

- Basic admin dashboard at `/admin` to view users and site rules.

## Notes

- Rate limiting: per-user on watch.create (30/day). Add IP limits similarly using `rateLimitKey` with an IP key.
- Quiet hours/digest: hooks exist in shared/time and worker; extend digest worker to aggregate notifications at `digestHour`.
- Security: add CSRF on mutations, HMAC webhooks, and sanitize HTML when adding rich content.
