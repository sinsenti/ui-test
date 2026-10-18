# Architecture

Status as of 2026-10-18: the local foundation is implemented in `f44feb7`.
Business tables, lead API, Telegram delivery, and the full landing page below
are planned. Use the [roadmap](roadmap.md) for progress and the
[product document](PRODUCT.md) for requirements.

## Stack and boundaries

| Area | Selected approach | Current state |
| --- | --- | --- |
| Application | Next.js App Router, TypeScript, Node.js 24, npm | Implemented; placeholder page only. |
| UI | CSS Modules, CSS custom properties, local Cyrillic fonts and imagery | Planned against the approved original `cosy-pack.png`. |
| Lead endpoint | `POST /api/lead`, Node.js runtime, Zod, `libphonenumber-js/max` | Planned. |
| Database | PostgreSQL 17; `pg` with parameterized SQL | Docker and lazy server-only pool implemented. |
| Migrations | Timestamped SQL through stable `node-pg-migrate` | Implemented; only the empty `app` schema exists. |
| Catalog | Typed source content and local assets | Planned; no catalog database or CMS needed. |
| Notifications | PostgreSQL outbox and bounded Telegram delivery worker | Planned; local mock first. |
| Verification | Node.js test runner and disposable real PostgreSQL; browser checks for the form | Database harness implemented; feature and browser coverage planned. |
| Hosting | Vercel application + Neon PostgreSQL | Selected; provision only in the final release feature. |

One application serves the page and API. Server components can render the static
content; client code handles the form and necessary interactions. Database code
and credentials stay server-only. Leads are stored in PostgreSQL so deployments
and process restarts do not erase them. A filesystem file or function memory is
not the lead store. No ORM, separate backend, authentication system, admin app,
cart, or payment service is required for the agreed scope.

The current pool is initialized on first database use and reused during local
hot reload. It is capped at five connections. Builds of the current static page
do not require a database. Reassess connection limits and the Vercel pool lifecycle
at release; do not initialize migrations during a request or application build.

## Planned lead flow

```mermaid
flowchart TD
    Page[Landing page and shared form] --> API[POST /api/lead: validate and normalize]
    API --> Transaction[PostgreSQL transaction: coordinate by normalized phone]
    Transaction --> Duplicate[Existing lead inside ten minutes: acknowledge duplicate]
    Transaction --> Save[Create lead and one pending notification job]
    Save --> Commit[Commit transaction]
    Commit --> Success[Return saved result to visitor]
    Commit --> Attempt[Bounded notification attempt after commit]
    Attempt --> Mock[Local simulated transport]
    Attempt --> Telegram[Real Telegram at release]
    Attempt --> State[Persist delivery state and retry timing]
```

Validation failures never create a lead or notification job. Normalize valid
Belarusian phone numbers to one canonical representation before duplicate checks.
Validate interest against the product's three supported choices. Bound accepted
field sizes and product context; enforce validation on the server even when the
browser also checks input. The data-modeler stage of lead intake will settle
exact field limits, response shapes, and HTTP statuses before implementation.

Coordinate same-phone writes in the database, including simultaneous requests
across application instances. A transaction performs the duplicate decision and
creates the lead plus its outbox job atomically. An application-only lookup
followed by an uncoordinated insert is insufficient. Use database time for the
decision. Accept a new lead when the previous accepted lead is at least ten
minutes old; rejected duplicates do not extend the window. Recheck this boundary
under concurrent requests and with differently formatted versions of one number.

A committed lead is success even when Telegram is unavailable. A database error
before commit is a recoverable submission failure. Duplicate responses should
acknowledge the earlier request without exposing another lead's private fields.
The browser preserves entered values on recoverable errors.

## Planned data ownership

These are logical responsibilities; exact columns and indexes are defined in the
data-modeler handoff and implemented in migrations.

| Data | Owner and lifecycle |
| --- | --- |
| Lead | PostgreSQL: stable ID, accepted timestamp, name, normalized phone, interest, optional comment, product context, and attribution. Persists independently of app deployments. |
| Duplicate coordination | Database transaction/constraint or lock strategy keyed by normalized phone; no process-local cache as the authority. |
| Notification outbox | PostgreSQL: one pending job per accepted lead, delivery state, attempt count, next eligible time, claim/lease information, and safe failure details. Created with the lead. |
| Attribution | Capture UTM parameters, applicable advertising click IDs, landing URL, and available referrer; bound and validate these as untrusted input. Preserve them through form retries. |
| Catalog and business copy | Versioned application source, grounded in the supplied brief; changes require a code change and deployment. |
| Images and fonts | Local application assets with source/license or generation provenance. Mockups remain design references. |
| Secrets | Ignored local environment files and deployment environment configuration; never catalog content, browser bundles, logs, or committed docs. |

There is no customer account or manager UI in the initial scope. Authorized
operators can inspect leads and notification state through database access and
the planned protected retry mechanism. Decide an appropriate retention and
deletion practice before collecting real contacts; do not add unrelated tracking
or log submitted phone numbers/comments for debugging.

## Planned Telegram reliability

Lead intake introduces the outbox table and atomic job creation. The following
feature adds delivery, so it does not have to retrofit reliable job creation
onto an already working endpoint.

- Use a simulated transport locally and in automated tests. It must support
  success, transient failure, throttling, terminal failure, and timeout scenarios.
- Attempt delivery promptly after commit using Next.js `after()`. Bound execution
  time and batch size; unfinished work remains in PostgreSQL.
- Claim due jobs atomically, prevent ordinary simultaneous sends of one job,
  and recover claims abandoned by a terminated process using an expiring lease.
- Persist attempt results, retry transient failures with backoff, and honor
  Telegram's `retry_after`. Retain terminal failures for correction and manual
  retry; do not silently delete them.
- Send a bounded plain-text or correctly escaped message containing the stable
  lead ID, contact, interest, context, comment, and useful attribution.
- Drain due jobs on subsequent lead requests, provide an authenticated manual
  retry path, and add a daily recovery cron during release. A public lead request
  must not act as an unrestricted job-management endpoint.

Delivery is at least once: an ambiguous network timeout can repeat a Telegram
message. A lease cannot provide exactly-once delivery across PostgreSQL and
Telegram. The saved lead ID helps the manager recognize repeats.

The recorded Vercel Hobby cron constraint was once per day with imprecise timing
when checked on 2026-10-18. It must be rechecked at release. Under this design,
normal delivery is prompt, but outage recovery has no rapid-delivery guarantee.
If a stricter recovery target becomes necessary, revisit scheduling and cost.
Reference APIs: [Telegram sendMessage](https://core.telegram.org/bots/api#sendmessage),
[Next.js after](https://nextjs.org/docs/app/api-reference/functions/after), and
[Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).
Read the installed Next.js documentation before implementing version-sensitive
APIs; these links are references, not evidence of a deployed integration.

## Environments

| Environment | Database | Telegram | Provisioning |
| --- | --- | --- | --- |
| Local development | Docker PostgreSQL 17, named volume | Simulated transport | Available now; transport comes with its feature. |
| Automated database tests | Separate generated Compose project, random loopback port, temporary storage | Simulated transport when added | Current database harness creates and removes its own resources. |
| Preview | Separate Neon development/preview branch; never production data | Mock or separate test target | Final release feature. |
| Production | Neon PostgreSQL 17, persistent lead/outbox tables | Real configured bot/chat | Final release feature. |

Runtime uses `DATABASE_URL`; migrations prefer `DATABASE_URL_DIRECT` and fall
back to the runtime URL locally. At release, use Neon's pooled URL for runtime
and direct URL for migration advisory locking. Require the provider's supported
TLS settings and scope environment values separately for preview and production.
Only the database variables exist in `.env.example` today; add notification and
retry authentication configuration with the corresponding implementation.

The [release checklist](release.md) covers migrations, environment separation,
actual external-service verification, and operating/recovery instructions.
