# Development roadmap and backlog

Updated 2026-10-18. This is the shared plan for the whole initial delivery.
Task definitions and AI role handoffs stay in the conversation; no separate
committed file is required for each feature. Implementation follows the workflow
in [AGENTS.md](../AGENTS.md).

## Current status and order

| ID | Feature | Status | Depends on |
| --- | --- | --- | --- |
| F1 | Local application and database foundation | Done — `f44feb7` | None |
| F2 | Reliable lead intake | Next | F1 |
| F3 | Required Telegram delivery | Planned | F2 and its atomic outbox |
| F4 | Complete responsive landing page | Planned | F2–F3 for end-to-end local verification |
| F5 | Cloud connection, release, and submission | Planned | F1–F4 passing local checks and review |

The original [cosy-pack.png](../.impeccable/mocks/decision/cosy-pack.png) is the
approved design. Vercel + Neon and Docker PostgreSQL for offline development
are decided. Telegram is required. Cloud account setup and the real bot connection
remain the final feature. The current home page is a placeholder and there is no
working lead endpoint yet.

Work on one feature at a time. The following sections can be broken into smaller
implementation commits while retaining these dependency and completion gates.
Status changes require actual evidence, not just completed code.

## F1 — Local foundation

Outcome: a fresh checkout can run and verify the app with a persistent local
database and no cloud account.

- [x] Next.js App Router + TypeScript, Node.js 24/npm, and a semantic placeholder.
- [x] Docker PostgreSQL 17 on loopback with a persistent named volume.
- [x] Server-only lazy `pg` pool and versioned transactional SQL migrations.
- [x] An isolated temporary database harness with interruption cleanup.
- [x] Setup commands, lint, types, integration tests, and production build.
- [x] Independent testing and review before completion.

Completion evidence: commit `f44feb7`; lint/types/database tests/build passed;
independent checks covered fresh-checkout offline install/build, development
and production HTTP responses, volume persistence, and SIGINT/SIGTERM test
resource cleanup. These are foundation checks, not evidence of a form or real
external integration. See [development](development.md) for commands and limits.

## F2 — Reliable lead intake

Outcome: a valid callback request is saved once, with its advertising source,
even when visitors double-click or requests arrive concurrently.

Work to do:

- [ ] Data-modeler: define the lead/outbox schema, database duplicate coordination,
  field bounds, attribution fields, API request/response contract, and migrations.
- [ ] Implement `POST /api/lead` in the Node.js runtime with strict server
  validation using Zod and `libphonenumber-js/max`.
- [ ] Normalize Belarusian phone numbers; validate name, supported interest,
  optional comment, and bounded product context/attribution.
- [ ] Persist a stable lead ID, accepted timestamp, contact, interest, context,
  and available UTM/click identifiers, landing URL, and referrer.
- [ ] Coordinate by normalized phone inside PostgreSQL and enforce the rolling
  ten-minute duplicate window across requests and application instances.
- [ ] Create exactly one pending notification job in the same transaction as
  each accepted lead. Delivery itself belongs to F3.
- [ ] Return clear saved, duplicate, validation-error, and recoverable-failure
  results without exposing private lead data.
- [ ] Extend the disposable-database harness for the new migrations and actual
  endpoint tests; complete independent testing and review.

Acceptance criteria:

- Valid input creates one lead and one pending outbox job atomically. Invalid
  or malformed input creates neither. A transaction failure leaves neither.
- Differently formatted versions of the same valid Belarusian number share one
  duplicate key. Invalid or non-Belarusian numbers receive understandable errors.
- Repeated and simultaneous requests inside ten minutes create no extra lead or
  job. A request is eligible again at ten minutes after the last accepted lead;
  duplicate attempts do not extend that window. Test just before and at the boundary.
- Attribution and product context round-trip through PostgreSQL, and accepted
  leads survive an application restart. Tests use synthetic contact data.
- Database failure produces a recoverable result, and no Telegram call is needed
  to accept a request. Exact response shapes/statuses are settled before building.

## F3 — Required Telegram delivery

Outcome: every accepted lead has a durable notification path; a Telegram failure
cannot lose the lead or turn a saved submission into an error for the visitor.

Work to do:

- [ ] Implement a transport boundary and deterministic local Telegram simulator.
- [ ] Format a bounded, readable message with stable lead ID, contact, interest,
  context, comment, and useful attribution; safely handle user-supplied text.
- [ ] Attempt delivery after commit using `after()` with a bounded timeout.
- [ ] Atomically claim jobs, record attempts, recover expired claims, persist
  delivery state, and schedule backoff, including Telegram `retry_after`.
- [ ] Retain terminal failures, add a protected manual retry path, and drain due
  jobs in bounded batches on subsequent lead requests.
- [ ] Add placeholder configuration and operator instructions with the actual
  chosen variable names; keep real bot credentials and cloud cron setup for F5.
- [ ] Test success, throttling, transient/terminal failures, ambiguous timeouts,
  concurrent workers, process interruption, and recovery; obtain independent review.

Acceptance criteria:

- New leads get a prompt local simulated attempt; duplicate submissions create
  no extra job. Failed delivery leaves the saved lead and retryable state intact.
- Multiple workers do not ordinarily send the same claimed job; abandoned jobs
  become eligible again. Retry timing and terminal/manual recovery are verified.
- Unauthorized callers cannot manage jobs or trigger an unrestricted drain.
  Logs and responses do not expose credentials or submitted personal details.
- Tests make no real Telegram calls. At-least-once delivery and possible repeats
  after an ambiguous timeout are documented honestly.

## F4 — Complete responsive landing page

Outcome: visitors understand the offer on a phone and can submit a callback
request through the real locally tested endpoint.

Work to do:

- [ ] Use the local Impeccable skill and the approved original composition.
  Match local Cyrillic font assets; record licensing/provenance and implemented
  tokens/components in `docs/DESIGN.md` when they are established.
- [ ] Build the peach `#FCEDE3`, cream, cocoa, and warm-orange visual direction,
  organic coffee still life, readable typography, and rounded callback panel.
- [ ] Implement semantic text and controls; use photography as assets rather
  than rendering the whole page as one raster mockup.
- [ ] Add all required content: freshness/story, four products with correct
  prices, subscription, Friday delivery, pickup address/hours, and contacts.
- [ ] Give product and subscription actions equal useful access to one shared
  form; preselect interest and preserve relevant product context.
- [ ] Build labeled name/phone/interest fields and optional comment, phone help,
  pending, saved, duplicate, validation-error, and retry states.
- [ ] Capture attribution from the entry page/referrer and preserve it through
  selection changes and submission retries.
- [ ] Add complete link-preview metadata and a local social image; keep motion
  restrained and respect reduced-motion preferences.
- [ ] Verify keyboard/focus/error announcements, contrast, touch targets,
  responsive layouts, image/font loading, and browser form behavior.
- [ ] Run local end-to-end checks and a mobile performance pass; complete visual,
  test, and independent code review before moving to cloud setup.

Acceptance criteria:

- Mobile and desktop renders preserve the approved direction and contain every
  supplied product, price, delivery fact, address, and opening hour. No invented
  phone/email/social account, reviews, awards, discounts, or subscription composition.
- A keyboard and phone visitor can choose an offer and submit. Errors are clear,
  labels remain available, pending prevents accidental repeat clicks, and input
  is retained on recoverable failure. Server duplicate protection still applies.
- End-to-end browser checks cover accepted, invalid, duplicate, network/database
  failure and retry paths; verify the resulting database/outbox state locally.
- Asset sources or generation provenance are recorded, fonts work offline, and
  final responsive renders are visually inspected. Lighthouse results are measured,
  recorded with conditions, and used to fix material issues; do not invent a score.

## F5 — Cloud connection, release, and submission

Outcome: the reviewed app is available at a live URL, stores leads durably, and
sends a real Telegram notification with safe environment separation.

Work to do:

- [ ] Execute the [release checklist](release.md) only after local features pass.
- [ ] Recheck Vercel/Neon free-plan eligibility, storage/compute/cron limits, and
  any constraints that affect this app; do not assume earlier quoted allowances.
- [ ] Create/configure Vercel and Neon PostgreSQL 17, production and isolated
  preview settings, pooled runtime and direct migration connections, and secrets.
- [ ] Configure the real bot/chat, authenticated retry/recovery, daily cron,
  and operational checks using the implementation from F3.
- [ ] Apply and verify migrations, deploy, and test real production persistence
  plus one real Telegram delivery with synthetic contact data.
- [ ] Verify preview isolation, failure behavior, link previews, responsive pages,
  and mobile Lighthouse on the deployed URL; fix material findings.
- [ ] Finalize the concise root README with decisions, assumptions, actual human/AI
  contributions, caught mistakes, and remaining limitations.
- [ ] Prepare live/repository URLs, genuine AI session export or screenshots, and
  mobile Lighthouse evidence; complete final review of the deliverable.

Acceptance criteria: all applicable release checklist items have actual results;
preview cannot write production leads or message the production chat; production
stores a synthetic request and sends it to the intended real chat; pending jobs
survive a deployment; evidence and README describe what was actually verified.
Submitting the prepared package to the assignment contact remains a user action
unless the user explicitly asks us to send it.

## Decisions to close during implementation

There is no outstanding stack or visual-direction decision blocking F2. Resolve
routine technical details in the relevant role handoff and record durable changes
in architecture/product docs. These remaining items have a planned home:

| Item | When and default approach |
| --- | --- |
| API field limits, statuses, exact tables/indexes and lock strategy | F2 data-modeler; meet the existing validation, duplicate, and atomicity requirements. |
| Retry timing, lease durations, mock controls, protected-operation configuration | F3; bounded work and durable state, with exact values covered by tests. |
| Exact Cyrillic font files, image assets, desktop composition, design tokens | F4; preserve the approved original design and local asset requirement. |
| Delivery charge below 50 BYN and subscription composition | Do not invent them; page/form directs the visitor to manager confirmation. |
| Provider account access, actual limits/region, bot/chat target, secret values | F5 only; request access when needed and keep credentials out of docs/chat evidence. |
| Retention/deletion practice and operational ownership | Before collecting real contacts in F5; record an appropriate simple operating practice. |

## After initial delivery

These are optional follow-up candidates, not promised initial features:

- Additional design refinements requested by the user after the approved baseline.
- Faster scheduled outage recovery if the daily/free-plan approach is insufficient.
- Stronger abuse controls if observed traffic warrants them; the initial API still
  validates and bounds untrusted input.
- An operator dashboard, editable catalog, analytics/consent tooling, or richer
  customer communication only if a concrete need emerges.

Cart, online payment, customer accounts, and a full CMS remain outside the agreed
scope. Keep initial delivery focused on the callback flow and truthful evidence.
