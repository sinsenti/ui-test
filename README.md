# Кварта

Coffee-roastery landing page in progress. The local foundation is implemented;
lead intake, Telegram delivery, and the approved design are the next features.
The current home page is a development placeholder.

## Run locally

Use Node.js 24 (`nvm use` if available), npm 11+, and Docker with Compose v2+.
From the repository root:

```sh
npm ci
cp .env.example .env.local
npm run db:up
npm run db:migrate
npm run db:check
npm run dev
```

Open http://127.0.0.1:3000. PostgreSQL 17 is bound only to
`127.0.0.1:54329`; its example credentials are for local development only.
If that port is occupied, change both `compose.yaml` and the URLs in `.env.local`.
The first install/image pull needs internet. Subsequent development, builds,
migrations, and tests use cached packages/images and need no cloud connection.
There are no remote font, image, or API dependencies in this foundation.

`npm run db:stop` stops PostgreSQL; `npm run db:up` resumes it.
`npm run db:down` removes its container/network but preserves the named volume
and data. Do not add `--volumes` unless you intend to erase local data.
Changing the initialization credentials in Compose does not update an existing
volume. Keep real secrets in ignored environment files; never commit them.

## Checks and migrations

```sh
npm run check
```

This runs ESLint, TypeScript, real PostgreSQL integration tests, and a production
build. `npm run test:db` creates a randomly named, separate Compose project with
a temporary database on a random loopback port, then removes only that project.
It does not read `.env.local` or use your development/production database URLs.
Tests verify migration apply/reapply/rollback, safe rollback failure, and a
parameterized query through the application's server-only `pg` pool.

`npm run db:migrate` applies pending timestamped SQL files in `migrations/`.
`npm run db:rollback` reverts **one** migration and may remove its data; use it
deliberately. Migrations run transactionally with advisory locking, separately
from app startup/builds. Never edit a migration that has been deployed; add a
new file with `-- Up Migration` and `-- Down Migration` sections instead.
The first migration owns the empty `app` schema; business tables come later.
Scripts load environment files with Next.js precedence. Runtime uses
`DATABASE_URL`; migrations prefer `DATABASE_URL_DIRECT` and fall back to it.

`npm run build` then `npm start` checks the production server locally.
No database URL or running database is needed to build the current static page.

## Decisions and current limits

Next.js App Router + TypeScript, standard `pg`, and versioned SQL keep one codebase
for local Docker and the selected Vercel + Neon deployment. CSS Modules and local
assets will implement the approved `cosy-pack.png` design. Cloud setup and the
real Telegram bot belong to the final release feature; select PostgreSQL 17 on
Neon, use a pooled runtime URL and a direct migration URL then.

AI work follows the roles in `AGENTS.md`; tasks and evidence stay in the actual
conversation. This foundation was implemented by the AI builder with separate
data-model, test, and review sessions under the user's agreed requirements.
It does not yet accept leads or send notifications. Release evidence, mobile
Lighthouse measurements, and the final contribution/limitations note remain to
be added when those features exist.

The production dependency audit currently reports no known vulnerabilities.
Next.js's development-only ESLint plugin brings in the unpatched
[braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
Its glob patterns come from this repository, not visitor input. Keep this
tooling limitation under review; do not force an unrelated framework downgrade
to suppress the audit report. ESLint 10 uses compatible Next.js, TypeScript,
and React Hooks rules directly while the bundled Next.js config still depends
on plugins limited to ESLint 9.
