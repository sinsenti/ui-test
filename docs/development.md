# Local development

These commands describe the landing page, [lead API](api.md), and local
notification delivery. Cloud release remains planned. The
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
Open http://127.0.0.1:3000 for the landing page and its real local callback form.
The database is PostgreSQL 17 on `127.0.0.1:54329`, bound only to loopback.
Credentials in Compose and `.env.example` are local examples, not production secrets.

The first package install and Docker image pull require internet. After those
downloads, development, migrations, tests, and builds use local cached resources.
Fonts and imagery are stored locally. Use the simulated Telegram
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
| `npm run test:db` | Run migrations, HTTP/worker checks, and Chromium browser tests against separate temporary PostgreSQL. |
| `npm run build` | Build the production application. |
| `npm start` | Serve a previously built application locally. |
| `npm run check` | Run lint, typecheck, API/database/browser tests, and production build. |

Do not add `--volumes` to development database teardown unless you intend to
erase local data. The named volume is `kvarta_postgres_data`. Recreating the
application or database container does not normally remove this volume.

Migration `1792281603000` introduces multi-coffee line items. Its down migration
refuses while any request contains multiple coffees, since the older schema
cannot retain that list. Never delete customer data to make the rollback pass.
For a database containing only singleton/general/subscription requests, it
projects saved singleton snapshots to the legacy parent before dropping the new
table. Roll back application code before removing a schema it depends on.

## Environment variables

| Variable | Current use |
| --- | --- |
| `DATABASE_URL` | Server-only application connection to local PostgreSQL. |
| `DATABASE_URL_DIRECT` | Preferred migration connection; optional locally because migration scripts fall back to `DATABASE_URL`. Required as a separate direct URL in the planned Neon setup. |
| `SITE_URL` | Public absolute origin used at build time for social-image metadata. Local default `http://localhost:3000`; set the real HTTPS origin and rebuild at release. Not a secret. |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` | Optional test-only browser executable override; otherwise use Playwright's installed Chromium. Not used by application code. |
| `TELEGRAM_TRANSPORT` | `mock` (default) or explicit `telegram`. Real mode requires valid bot/chat settings and never falls back to mock. |
| `TELEGRAM_MOCK_SCENARIO` | `success` by default; also `transient`, `transient-once`, `throttled`, `throttled-once`, `terminal`, or `timeout`. Applied server-side, never from visitor fields. |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Server-only real adapter configuration. Leave blank locally; configure/verify the actual bot only in F5. |
| `CRON_SECRET` | Optional protected-operation credential: at least 32 printable ASCII characters, no spaces. Blank disables management; ordinary lead intake still works. Use a fresh random value per environment at release. |

Scripts use Next.js environment-file precedence, including shell overrides.
Keep `.env.local` and real credentials ignored. Commit placeholders only in
`.env.example`. The database test harness intentionally does not load your env
file and overrides inherited database URLs for its child test process. Tests also
force the successful mock transport, clear bot/chat values, and create an ephemeral
management secret, so a caller's real Telegram settings cannot leak into the suite.

## Notification operations

The simulator performs no network request and never logs rendered messages or
submitted contacts. `success` marks a job sent **in simulation only**. `transient`
keeps retrying; `transient-once` succeeds after the first claim. Throttling behaves
similarly, with a 120-second minimum delay; the `-once` variant succeeds on later
claims. `terminal` retains a failed job. `timeout` waits for the three-second send
deadline and returns a retryable ambiguous result. Restart the local app after
changing environment settings; lifetime attempt counts determine `-once` behavior.

Every valid saved or duplicate lead request schedules at most three eligible
notifications after the response. The worker prioritizes a new lead, then older
due jobs. It claims one job at a time with a 30-second lease and UUID token;
expired claims recover automatically during later drains. A 20-second start
budget stops new claims; an already started attempt may finish afterward.
Each send is bounded to three seconds and database work has its own short
timeouts. There is no resident worker or local background timer. During an idle
outage, trigger recovery manually; daily cloud recovery is configured in F5.

To enable local management, generate a random value and place it in the ignored
`.env.local` as `CRON_SECRET` (do not paste it into shared evidence):

```sh
node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))'
```

Use the same value in your shell's `CRON_SECRET` variable when calling management
routes. Do not put it in a URL. Drain eligible jobs with:

```sh
curl --fail-with-body -X POST http://127.0.0.1:3000/api/notifications/drain \
  -H "Authorization: Bearer $CRON_SECRET"
```

Inspect delivery state through your database client using this contact-free query:

```sql
SELECT lead_id, status, attempts, next_attempt_at, locked_until, sent_at, last_error
FROM app.notification_outbox ORDER BY created_at;
```

`pending` waits for eligibility; `processing` is leased; `sent` is acknowledged by
the selected transport; `failed` requires correcting configuration/target or
another terminal cause. `last_error` is a fixed category only: configuration,
rejected, network, timeout, upstream, protocol, or throttled. No raw Telegram
description, token, or submitted text is stored as an error.

Retryable failures use 30-second exponential backoff capped at one hour, with
valid Telegram `retry_after` as a lower bound (even beyond one hour). Attempts are
not exhausted automatically. Throttling stops the current batch; there is no
global bot/chat rate limiter. Management cannot force a pending job before its
eligible time. A terminal job can be requeued after correction, using the lead
UUID from the database or notification:

```sh
curl --fail-with-body -X POST \
  http://127.0.0.1:3000/api/notifications/retry/REPLACE_WITH_LEAD_UUID \
  -H "Authorization: Bearer $CRON_SECRET"
```

The 202 response confirms requeueing, preserving lifetime attempts and any future
eligibility. Check the subsequent state rather than treating 202 as delivery.
Sent/active/pending jobs cannot be force-requeued. GET/POST drain (and Next.js's
automatic HEAD alias) and retry authenticate before database work; exact response
codes are in [API](api.md).

Delivery is at least once. A crash after a send, lost acknowledgement, expired
lease, or network timeout may repeat a message. Use its stable lead ID to recognize
repeats. No real notification has been verified yet; simulation is local evidence,
and a real synthetic delivery plus scheduled recovery remain release gates.

## Migrations and database tests

Add a new timestamped SQL file in `migrations/` with `-- Up Migration` and
`-- Down Migration` sections. Never rewrite a migration already deployed to a
shared environment. Migrations run transactionally through `node-pg-migrate`
with advisory locking, separately from application startup and builds.
The first migration creates the empty `app` schema and refuses to drop it when
unexpected objects remain; it uses no `CASCADE`.

`npm run test:db` uses `compose.test.yaml`, a generated Compose project name,
a random loopback port, and temporary database storage. It copies current source/assets
into a temporary application fixture, links the installed dependencies, and starts
a separate Next.js development server on a random loopback port. Generated files
and server locks are isolated, so your development server can remain running.
No production build is required to run this command. Install the test browser
once before running checks:

```sh
npx playwright install chromium
# Linux hosts lacking browser system libraries: npx playwright install --with-deps chromium
```

The browser download needs internet once; cached binaries work offline. An
existing compatible Chrome can instead be selected with
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/absolute/path/to/chrome npm run check`.

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
constraints. Notification checks cover after-response delivery, concurrent claims,
worker termination/recovery, stale ownership, backoff/throttling, bounded timeouts,
terminal/manual recovery, result-write failure, authorization, and message bounds.
The real HTTP adapter is tested with injected stub responses only. Tests use
synthetic contacts and make no Telegram calls. Browser checks use the same
isolated database and simulator; they never submit to the development database.
They cover offer context, saved/duplicate/invalid submissions, network/response
loss, database rollback and retry, attribution, keyboard/reduced-motion behavior,
responsive overflow, local asset loading and automated axe accessibility checks.
Automated accessibility checks supplement visual and keyboard inspection.

For a local production smoke check, stop any server occupying port 3000, then:

```sh
npm run build
npm start
```

The current static page can build without a database URL or running database.
Do not make future builds run migrations or send real notifications.

## Visual and performance evidence

With a production server running, capture the real page with:

```sh
node scripts/capture-page.ts http://127.0.0.1:3000
# Apply PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH if using an existing Chrome.
```

The script waits for local fonts and images and records 853 × 1844 comp,
390 × 844 mobile, and 1440 × 1000 desktop captures under `.impeccable/review/`.
The latter two are full-page images. `capture.json` records actual dimensions,
browser version, font/image completion, and overflow. Compare at the original
comp's viewport; mobile uses larger readable controls and phone help.

The subsequent user-requested coffee-card refinement has separate production
captures: [mobile catalog](../.impeccable/review/coffee-mobile.png),
[desktop catalog](../.impeccable/review/coffee-desktop.png), and full-page
[mobile](../.impeccable/review/coffee-mobile-page.png) and
[desktop](../.impeccable/review/coffee-desktop-page.png) renders.
[Capture metadata](../.impeccable/review/coffee-capture.json) records the actual
build, viewport, browser, and local asset loading. These preserve the earlier
opening-comparison evidence rather than replacing it.

The later quantity and visible-selection extension is captured separately in
[mobile](../.impeccable/review/quantity-mobile-catalog.png) and
[desktop](../.impeccable/review/quantity-desktop-catalog.png) catalog views,
the selected [mobile form](../.impeccable/review/quantity-mobile-form.png),
and full-page [mobile](../.impeccable/review/quantity-mobile-page.png) and
[desktop](../.impeccable/review/quantity-desktop-page.png) renders.
[Quantity capture metadata](../.impeccable/review/quantity-capture.json) identifies
the actual build and shows two packs of Brazil coffee at 52 BYN. Earlier coffee
captures document the preceding card layout. No new Lighthouse score is claimed.

The current simultaneous-selection extension has [mobile](../.impeccable/review/multi-mobile-catalog.png)
and [desktop](../.impeccable/review/multi-desktop-catalog.png) catalog captures,
matching [mobile form](../.impeccable/review/multi-mobile-form.png) and
[desktop form](../.impeccable/review/multi-desktop-form.png), plus full-page
[mobile](../.impeccable/review/multi-mobile-page.png) and
[desktop](../.impeccable/review/multi-desktop-page.png) renders.
[Multi-selection metadata](../.impeccable/review/multi-capture.json) records three
coffees totaling 99 BYN and verifies a visible focused contact field with all four
selected at six widths. The earlier quantity captures show the former single-item
behavior, and remain historical evidence.

Measured before that catalog refinement on 2026-10-19 (local date), using the
production application at
`http://127.0.0.1:3001`, Lighthouse 13.5.0 / headless Chrome 155:

| Category or metric | Measured result |
| --- | --- |
| Mobile performance | 96 |
| Accessibility / best practices / SEO | 100 / 100 / 100 |
| FCP / LCP | 0.9 s / 2.7 s |
| Total blocking time / cumulative layout shift | 90 ms / 0 |

This was one local lab run with a warm Next.js server, a fresh browser profile,
412 × 823 emulation at DPR 1.75, simulated 150 ms RTT / 1.6 Mbps networking and
4× CPU slowdown. The initial performance score was 89 (LCP 3.6 s). Subsetting
the wordmark font from 180 KB to 992 bytes and setting high/eager image priority
resolved the image-discovery finding. These scores are not field measurements
or deployed-site results. LCP remains above 2.5 seconds in this simulation;
measure again on the real deployment in F5.

The [JSON report](../.impeccable/review/lighthouse-mobile.report.json) and
[HTML report](../.impeccable/review/lighthouse-mobile.report.html) retain the actual
measurement. Reproduce with the cached browser executable (or omit `CHROME_PATH`
if Lighthouse finds Chrome automatically):

```sh
CHROME_PATH=/absolute/path/to/chrome npx lighthouse http://127.0.0.1:3000 \
  --chrome-flags='--headless --no-sandbox --disable-dev-shm-usage' \
  --output=json --output=html --output-path=.impeccable/review/lighthouse-mobile
```

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
