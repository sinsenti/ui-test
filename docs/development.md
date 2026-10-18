# Local development

These commands describe the implemented foundation. Lead API, Telegram, browser
test commands, and release operations will be added with their features. The
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
| `npm run test:db` | Run integration tests in a separate temporary PostgreSQL instance. |
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
a random loopback port, and temporary database storage. Cleanup removes only
that generated project. It does not use the development database or a caller's
production URL. Normal completion and SIGINT/SIGTERM cleanup were independently
verified for the foundation; SIGKILL cannot run process cleanup.

Current integration checks cover migration apply/reapply/rollback, refusal of
an unsafe schema rollback, and a parameterized query through the real application
pool. When adding business migrations, update these assertions: the current test
expects one migration and an otherwise empty schema. Add meaningful endpoint,
concurrency, and delivery checks with the relevant feature.

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
