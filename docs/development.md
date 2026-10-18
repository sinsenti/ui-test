# Local development

These commands describe the implemented foundation and [lead API](api.md).
Telegram delivery, browser form checks, and release operations remain planned. The
[roadmap](roadmap.md) records what is still planned.

## First setup

Use Node.js 24 (`nvm use` if available), npm 11+, and Docker with Compose v2+.
Run commands from the repository root:

```sh
npm ci
cp .env.example .env.local
npm run db:up
npm run db:migrate
npm run db:check
npm run dev
```

Copy the example only on initial setup; preserve an existing `.env.local`.
Open http://127.0.0.1:3000. The current page is an unstyled development placeholder.
The database is PostgreSQL 17 on `127.0.0.1:54329`, bound only to loopback.
Credentials in Compose and `.env.example` are local examples, not production secrets.

The first package install and Docker image pull require internet. After those
downloads, development, migrations, tests, and builds use local cached resources.
Keep future fonts and imagery local, and use the planned simulated Telegram
transport to preserve offline development. A real Telegram send requires internet
and is a release check, not a prerequisite for local work.

If port 54329 is occupied, change the port in both `compose.yaml` and the URLs
in `.env.local`. Changing Compose initialization credentials does not change an
existing database volume; keep the existing credentials or deliberately migrate
the database configuration.

## Commands

| Command | Behavior |
| --- | --- |
| `npm run dev` | Run Next.js locally on loopback, port 3000 by default. |
| `npm run db:up` | Start Docker PostgreSQL and wait for health. |
| `npm run db:stop` | Stop the development database, keeping its container and data. |
| `npm run db:down` | Remove the development container/network, preserving its named volume. |
| `npm run db:migrate` | Apply pending SQL migrations. |
| `npm run db:rollback` | Revert one migration; it can remove data. |
| `npm run db:check` | Confirm the application can access its database schema. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Generate Next.js types and run TypeScript checking. |
| `npm run test:db` | Run migrations and real Next.js HTTP integration checks against separate temporary PostgreSQL. |
| `npm run build` | Build the production application. |
| `npm start` | Serve a previously built application locally. |
| `npm run check` | Run lint, typecheck, database tests, and production build. |

Do not add `--volumes` to development database teardown unless you intend to
erase local data. The named volume is `kvarta_postgres_data`. Recreating the
application or database container does not normally remove this volume.

## Environment variables

| Variable | Current use |
| --- | --- |
| `DATABASE_URL` | Server-only application connection to local PostgreSQL. |
| `DATABASE_URL_DIRECT` | Preferred migration connection; optional locally because migration scripts fall back to `DATABASE_URL`. Required as a separate direct URL in the planned Neon setup. |

Scripts use Next.js environment-file precedence, including shell overrides.
Keep `.env.local` and real credentials ignored. Commit placeholders only in
`.env.example`. The database test harness intentionally does not load your env
file and overrides inherited database URLs for its child test process.

## Migrations and database tests

Add a new timestamped SQL file in `migrations/` with `-- Up Migration` and
`-- Down Migration` sections. Never rewrite a migration already deployed to a
shared environment. Migrations run transactionally through `node-pg-migrate`
with advisory locking, separately from application startup and builds.
The first migration creates the empty `app` schema and refuses to drop it when
unexpected objects remain; it uses no `CASCADE`.

`npm run test:db` uses `compose.test.yaml`, a generated Compose project name,
a random loopback port, and temporary database storage. It copies current source
into a temporary application fixture, links the installed dependencies, and starts
a separate Next.js development server on a random loopback port. Generated files
and server locks are isolated, so your development server can remain running.
When runtime configuration or asset roots are introduced, include them in that
fixture as needed. No production build is required to run this command.

Cleanup removes the test application/fixture and only its generated Compose
project. It does not load `.env.local` or use a caller's production database URL.
SIGINT/SIGTERM, including repeated signals during cleanup, were independently
verified with the test application running. SIGKILL cannot run process cleanup.
If a process is forcibly killed, inspect
leftover `kvarta-test-*` resources and `kvarta-http-test-*` temporary directories
before removing only that test run's resources.

Integration checks cover both migrations' apply/reapply/rollback, the original
schema rollback guard, parameterized SQL, actual HTTP validation, attribution,
formatted-phone and concurrent duplicates, different-phone submissions, exact
microsecond window boundaries using the actual acceptance SQL, post-lock clock
sampling, outbox-insert rollback, recoverable query failure, and database
constraints. Tests use synthetic contacts and make no Telegram calls. Browser
interaction coverage comes with the actual form in F4.

For a local production smoke check, stop any server occupying port 3000, then:

```sh
npm run build
npm start
```

The current static page can build without a database URL or running database.
Do not make future builds run migrations or send real notifications.

## Development workflow

Choose the next ready feature from the [roadmap](roadmap.md). Follow the roles
and handoffs in root [AGENTS.md](../AGENTS.md):
`task -> data-modeler -> builder -> test -> review`.
Read `docs/PRODUCT.md`, the relevant source, and the current conversation.
For Next.js APIs, read the relevant installed guide in
`node_modules/next/dist/docs/`; for frontend work, apply the local Impeccable
skill and the approved original mockup.

Keep task details and role evidence in the conversation. Optional `features/`
notes remain local and ignored; a fresh checkout must not depend on them.
Commit implementation, migrations, tests, and durable documentation in coherent
increments. Update the shared roadmap after completion rather than adding
another permanent feature log. Documentation-only changes use task and review;
runtime tests are not applicable when application behavior is unchanged.

## Known tooling limitation

At foundation completion on 2026-10-18, `npm audit --omit=dev` reported no known
production dependency vulnerabilities. This is a dated result, not a continuing
guarantee. Next.js's development-only ESLint plugin brought in the unpatched
[braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
Its glob patterns come from this repository, not visitor input. Recheck the
tooling and audit at release; do not force an unrelated framework downgrade just
to suppress the report. ESLint 10 uses compatible Next.js, TypeScript, and React
Hooks rules directly because the bundled Next.js ESLint config still depended
on plugins limited to ESLint 9 when the foundation was implemented.
