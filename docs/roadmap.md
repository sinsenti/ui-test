# Development roadmap and backlog

Updated 2026-10-19. This is the shared plan for the whole initial delivery.
Task definitions and AI role handoffs stay in the conversation; no separate
committed file is required for each feature. Implementation follows the workflow
in [AGENTS.md](../AGENTS.md).

## Current status and order

| ID | Feature | Status | Depends on |
| --- | --- | --- | --- |
| F1 | Local application and database foundation | Done — `f44feb7` | None |
| F2 | Reliable lead intake | Done — `f06ad9c` | F1 |
| F3 | Required Telegram delivery | Done — local evidence below | F2 and its atomic outbox |
| F4 | Complete responsive landing page | Verified locally — interface approved; fresh performance evidence below | F2–F3 for end-to-end local verification |
| F5 | Cloud connection, release, and submission | In progress — PostgreSQL 18 aligned; public-page screenshot supplied; end-to-end release checks pending | F1–F4 passing local checks and review |

The original [cosy-pack.png](../.impeccable/mocks/decision/cosy-pack.png) is the
approved composition, extended by the user's white-canvas and orange-linework
direction recorded in [Design](DESIGN.md). Vercel + Neon and Docker PostgreSQL for offline development
are decided. Telegram is required. Cloud account setup and the real bot connection
remain the final feature's release checks. The supplied public-page screenshot is
recorded in the [README](../README.md) and [release results](release.md#release-results).
The landing page connects to the lead API; notification
checks use an offline simulator for local verification.

Work on one feature at a time. The following sections can be broken into smaller
implementation commits while retaining these dependency and completion gates.
Status changes require actual evidence, not just completed code.

## F1 — Local foundation

Outcome: a fresh checkout can run and verify the app with a persistent local
database and no cloud account.

- [x] Next.js App Router + TypeScript, Node.js 24/npm, and a semantic placeholder.
- [x] Docker PostgreSQL on loopback with a persistent named volume (initially 17; upgraded to 18 during F5).
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

- [x] Data-modeler: define the lead/outbox schema, database duplicate coordination,
  field bounds, attribution fields, API request/response contract, and migrations.
- [x] Implement `POST /api/lead` in the Node.js runtime with strict server
  validation using Zod and `libphonenumber-js/max`.
- [x] Normalize Belarusian phone numbers; validate name, supported interest,
  optional comment, and bounded product context/attribution.
- [x] Persist a stable lead ID, accepted timestamp, contact, interest, context,
  and available UTM/click identifiers, landing URL, and referrer.
- [x] Coordinate by normalized phone inside PostgreSQL and enforce the rolling
  ten-minute duplicate window across requests and application instances.
- [x] Create exactly one pending notification job in the same transaction as
  each accepted lead. Delivery itself belongs to F3.
- [x] Return clear saved, duplicate, validation-error, and recoverable-failure
  results without exposing private lead data.
- [x] Extend the disposable-database harness for the new migrations and actual
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

Completion evidence (2026-10-18): `npm run check` passed lint, types, all 13
PostgreSQL/real Next.js HTTP integration checks, and the production build.
Independent testing verified an actual production-process restart, 24 concurrent
requests across two production instances yielding one lead/job, three-second
lock and five-second statement timeouts with rollback/retry, actual database
unavailability and recovery without an app restart, Unicode/unknown-key behavior,
and SIGINT/SIGTERM cleanup including repeated signals. Independent code review
passed with no material findings. `npm audit --omit=dev` reported zero known
vulnerabilities. Local `db:up`, `db:migrate`, and `db:check` passed.
See the [API contract](api.md) for the implemented interface. The page remains
a placeholder; browser form, Telegram delivery, and cloud verification are later
features. Detailed role evidence stays in the conversation.

## F3 — Required Telegram delivery

Outcome: every accepted lead has a durable notification path; a Telegram failure
cannot lose the lead or turn a saved submission into an error for the visitor.

Work to do:

- [x] Implement a transport boundary and deterministic local Telegram simulator.
- [x] Format a bounded, readable message with stable lead ID, contact, interest,
  context, comment, and useful attribution; safely handle user-supplied text.
- [x] Attempt delivery after commit using `after()` with a bounded timeout.
- [x] Atomically claim jobs, record attempts, recover expired claims, persist
  delivery state, and schedule backoff, including Telegram `retry_after`.
- [x] Retain terminal failures, add a protected manual retry path, and drain due
  jobs in bounded batches on subsequent lead requests.
- [x] Add placeholder configuration and operator instructions with the actual
  chosen variable names; keep real bot credentials and cloud cron setup for F5.
- [x] Test success, throttling, transient/terminal failures, ambiguous timeouts,
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

Completion evidence (2026-10-18): `npm run check` passed lint, generated types,
all 24 real-PostgreSQL/Next.js integration checks, and the production build.
Independent testing passed 15 production probe groups: all simulator failure modes
returned saved responses in 350–374 ms with durable delivery state; restart and
duplicate-request recovery; invalid requests leaving due jobs untouched; eight
concurrent drains across two production instances sending 17 jobs with one claim
each; failed-only manual recovery preserving attempts/future eligibility; and
management rejection before database access. A production app killed during
`after()` recovered in a fresh process after the genuine 30-second lease, without
editing its expiry. Response/log privacy and resource cleanup passed.
Independent review passed with no material findings; its framework HEAD/OPTIONS
documentation correction was incorporated. Existing migrations were unchanged;
51 local documentation links resolved and the root product symlink was preserved.
See [API](api.md) and [notification operations](development.md#notification-operations).
No real Telegram, browser form, cloud, or hosting lifecycle verification is claimed;
those remain explicit F4/F5 gates. Detailed role evidence stays in the conversation.

## F4 — Complete responsive landing page

Outcome: visitors understand the offer on a phone and can submit a callback
request through the real locally tested endpoint.

Implementation and local verification (2026-10-19): the original comp has a measured region
map and font comparison proofs under `.impeccable/build/`. The user approved the
local production still life and plan before assembly; see [asset sources](assets.md).
The responsive page and shared callback form are implemented. Independent
PostgreSQL/browser testing passed 34 checks, including ten browser groups.
Independent code review found no material runtime defect. Production Chromium
checks passed after the font optimization: two local fonts, complete high-priority
image, all eight offer actions, no overflow at 320/390/768/1440, and zero axe
violations in default/menu/comment states. No production form was submitted.
Mobile Lighthouse measured 96 performance and 100 accessibility/best practices/SEO,
LCP 2.7 s, TBT 90 ms, CLS 0; conditions and original reports are in
[development](development.md#visual-and-performance-evidence).

The historical Impeccable hero comparison was 79% at the reference viewport,
with phone/radio drift after three attempts. The static review capture rejected
the real Next.js TSX entry (`pinned snapshot requires its HTML entry`); no browser
receipt or automated pixel-gate pass has been fabricated. Its old phase state
still records that failed automated workflow. The raw desktop comparison used
mismatched scaling and cannot prove missing elements. Later valid production
captures and independent reviews cover the implemented interface. The user has
now accepted that interface explicitly, as recorded below; do not request the
same approval again. F5 has not begun.

Catalog follow-up (2026-10-19): the user requested an individual box for each
coffee offer. The four offers now use flat warm-toned cards, two columns above
600px and a single column at 600px and below, with unchanged facts, prices and
shared callback selection. Lint, types and the production build passed. The
expanded disposable-PostgreSQL suite passed all 34 tests, including ten browser
groups covering saved product context, input retention, and card bounds at
320/390/600/601/768/1440px. Independent production probes found no external
requests and zero axe violations at 601px; code/visual review found no material
runtime defect. Separate [capture evidence](development.md#visual-and-performance-evidence)
records this refinement; the earlier Lighthouse result predates it. The scoped
review's design-record finding was resolved in `docs/DESIGN.md` and its machine
companion, then independently scored resolved with a ship verdict for that fix.

Quantity follow-up (2026-10-19): the user requested visible selection feedback,
pack counts and totals. Selection now stays on the card with a pressed state;
separate continuation opens the callback form. Shared pack controls and subtotals
stay synchronized. At that stage requests contained one variety; the subsequent
multi-selection extension below supersedes that limit. The fixed subscription
remains intact.
Migration `1792281602000` adds validated quantity, a server-owned unit-price
snapshot and a database-generated subtotal. Notifications use that saved snapshot.
Lint, types and production build passed. Independent isolated testing passed
40/40 checks, including 13 browser groups, maximum-quantity layout at six widths,
zero axe violations, API validation, duplicate/rollback behavior and legacy
migration backfill/down preservation. A validation-focus race was corrected and
the full suite rerun successfully. Independent source/data/UI review found no
material defect; source-derived design records and current
[quantity captures](development.md#visual-and-performance-evidence) are updated.
Local `db:up`, `db:migrate` and `db:check` passed. No real Telegram, cloud or
deployed performance verification is claimed. Interface approval was pending at
that stage and was subsequently given, as recorded below.

Multiple-coffee follow-up (2026-10-19): selecting another variety now keeps the
existing choices. Card and form quantities/removal controls remain independent;
a combined catalog summary and callback list show all lines and their total.
Free delivery uses the combined amount. The fixed subscription stays separate.
Migration `1792281603000` adds canonical saved line items and backfills existing
snapshots; rollback refuses unrepresentable multi-item requests. The atomic
acceptance transaction and one notification carry the complete list and saved
prices, while legacy scalar requests remain supported. Lint, types and production
build passed; independent isolated testing passed 47/47 checks, including all four
coffees at 99 packs, six-width layout/focus checks, strict API validation, complete
snapshot persistence, concurrency/duplicate invariants, rollback/backfill and
notification aggregation. Current [multi-selection captures](development.md#visual-and-performance-evidence)
show the same three coffees totaling 99 BYN in catalog and form. Independent
source/data/UI review found no material defect. Local `db:up`, `db:migrate` and
`db:check` passed. Physical devices, other browser engines and real Telegram remain
outside this local evidence; subsequent interface acceptance is recorded below.

Current interface acceptance and fresh performance (2026-10-19): the user stated
«i check interface, everything is fine now. run Fresh performance check» after
reviewing the multi-coffee interface. Lighthouse measured source `0a9602f`, build
`Kmi4xnLtpQ7VihW4ftPm1`, with three sequential mobile runs (99, 99, 97; median 99)
and one desktop run (100). Accessibility, best practices and SEO were 100 in all
four. Median mobile LCP was 2.258 s, TBT 32.5 ms and CLS 0; individual LCP ranged
2.256–2.674 s. The [conditions and original reports](development.md#visual-and-performance-evidence)
preserve all results and remaining optimization suggestions. Application code
was unchanged; the existing 47-test passing result and independent runtime
reviews still apply. These are local lab measurements, not deployed or real-user
performance. The requested interface acceptance and fresh measurement are complete;
cloud setup, real Telegram and public-URL verification remain F5.

Subsequent user-requested refinement (2026-10-19): catalog controls now say
«Количество», with matching product-specific accessible group names. The phone
field groups supported Belarusian input with spaces and hyphens, such as
`+375 29 123-45-67`, while preserving local prefixes, editable digits and existing
server validation/normalization. No schema, API, migration or client dependency
was added. The final `npm run check` passed lint, types, all 52 tests including
19 browser groups, and the production build. Tests caught selected-separator
deletion losing a digit; the correction passed all eight separator/key cases.
[Production captures and verification limits](development.md#visual-and-performance-evidence)
record the scoped change. Independent code and scoped design review passed
with no material findings. Earlier Lighthouse reports remain measurements of their
named source/build; they were not rerun for this input refinement.

Work to do:

- [x] Use the local Impeccable skill and the approved original composition.
  Match local Cyrillic font assets; record licensing/provenance and implemented
  tokens/components in `docs/DESIGN.md` when they are established.
- [x] Build the peach `#FCEDE3`, cream, cocoa, and warm-orange visual direction,
  organic coffee still life, readable typography, and rounded callback panel.
- [x] Implement semantic text and controls; use photography as assets rather
  than rendering the whole page as one raster mockup.
- [x] Add all required content: freshness/story, four products with correct
  prices, subscription, Friday delivery, pickup address/hours, and contacts.
- [x] Extend the catalog with individual warm-toned product cards as requested.
- [x] Show visible selection, editable pack quantity and matching card/form totals;
  persist quantity and trusted prices and include them in local notifications.
- [x] Allow multiple coffee types together, independent line removal, combined
  pricing/delivery, and complete persisted and notified item lists.
- [x] Give product and subscription actions equal useful access to one shared
  form; preselect interest and preserve relevant product context.
- [x] Build labeled name/phone/interest fields and optional comment, phone help,
  pending, saved, duplicate, validation-error, and retry states.
- [x] Capture attribution from the entry page/referrer and preserve it through
  selection changes and submission retries.
- [x] Add complete link-preview metadata and a local social image; keep motion
  restrained and respect reduced-motion preferences.
- [x] Verify keyboard/focus/error announcements, contrast, touch targets,
  responsive layouts, image/font loading, and browser form behavior.
- [x] Run local end-to-end checks and a mobile performance pass; complete visual,
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

The later coffee-title spacing refinement preserves the approved fonts and copy
while separating country and variety with `word-spacing: .1em`. Production build
and independent browser checks passed at six widths and actual 200% Chromium
zoom, including selection, quantities and form handoff without submitting a lead.
Independent review passed the scoped refinement. See
[capture and check evidence](development.md#visual-and-performance-evidence).

White-canvas and linework refinement (2026-10-19): the user approved the full-page
orange paths and requested a white background with supporting color changes.
The accepted composition now uses white, lighter warm product cards, a peach
subscription panel and a pale warm footer. Section-anchored paths stay decorative
as selections/comments expand. The shared control border was darkened after an
independent check found a 2.970:1 boundary on the oat card; its final minimum is
3.134:1. Lint, types, an isolated Next.js webpack production build and independent
Chromium checks at six widths passed; phone/desktop interactions and axe checks
passed without a lead submission. Independent review returned `ship` for this
scoped refinement with no material findings. See the [current visual evidence](development.md#visual-and-performance-evidence).
No new performance measurement, backend or deployed-service verification is
claimed by this UI change.

## F5 — Cloud connection, release, and submission

Outcome: the reviewed app is available at a live URL, stores leads durably, and
sends a real Telegram notification with safe environment separation.

Work to do:

- [ ] Execute the [release checklist](release.md) only after local features pass.
- [x] Recheck Vercel/Neon free-plan eligibility, storage/compute/cron limits, and
  any constraints that affect this app; do not assume earlier quoted allowances.
- [ ] Create/configure Vercel and Neon PostgreSQL 18, production and isolated
  preview settings, pooled runtime and direct migration connections, and secrets.
- [ ] Configure the real bot/chat, authenticated retry/recovery, daily cron,
  and operational checks using the implementation from F3.
- [ ] Apply and verify migrations, deploy, and test real production persistence
  plus one real Telegram delivery with synthetic contact data.
- [ ] Verify preview isolation, failure behavior, link previews, responsive pages,
  and mobile Lighthouse on the deployed URL; fix material findings.
- [x] Finalize the concise root README with decisions, assumptions, actual human/AI
  contributions, caught mistakes, and remaining limitations.
- [ ] Prepare live/repository URLs, genuine AI session export or screenshots, and
  mobile Lighthouse evidence; complete final review of the deliverable.

Acceptance criteria: all applicable release checklist items have actual results;
preview cannot write production leads or message the production chat; production
stores a synthetic request and sends it to the intended real chat; pending jobs
survive a deployment; evidence and README describe what was actually verified.
Submitting the prepared package to the assignment contact remains a user action
unless the user explicitly asks us to send it.

Release preparation (2026-10-19): the user chose to keep the newly created Neon
PostgreSQL 18.6 project in Frankfurt and align local/test PostgreSQL to 18. Direct
and pooled connections passed independent read-only TLS checks. The local 17→18
logical upgrade preserved every row and schema/sequence inventory across a
container recreation; the original PostgreSQL 17 volume and private backups remain.
`vercel.json` now declares Frankfurt and daily recovery, but deployment and
scheduler execution are unverified. Independent `npm run check` passed all 52
tests, lint, types and the production build on PostgreSQL 18.6. The four existing
migrations were applied to the verified empty Neon database, their second run
applied zero, and the pooled application check passed. No cloud lead or
notification rows were created. Preview isolation, Vercel deployment, real
Telegram, live persistence/recovery and the remaining release checks are still
pending. Independent review passed this database/deployment preparation step;
F5 is not complete.

Submission documentation (2026-10-19): the root [README](../README.md) now records
the user's AI workflow, step-by-step review and manual testing, concrete human
feedback and automated-test findings, the supplied public Lighthouse screenshot,
implementation scope and remaining verification. The former README's setup
instructions are preserved in the [project guide](project-guide.md). Relative
file/heading links and preservation of setup commands passed checks; independent
documentation review passed with no material findings. Data modeling and runtime
tests were not applicable to this documentation-only change. The screenshot
records an earlier peach deployment at 85/100/100/100; it does not verify the
current white build's performance or the remaining production release gates.

## Decisions and remaining implementation choices

There is no outstanding stack or visual-direction decision blocking the next feature. Resolve
routine technical details in the relevant role handoff and record durable changes
in architecture/product docs. These remaining items have a planned home:

| Item | When and default approach |
| --- | --- |
| API field limits, statuses, tables/indexes and lock strategy | Resolved in F2; see [API](api.md), [architecture](architecture.md), and the lead-intake migration. |
| Retry timing, lease durations, mock controls, protected-operation configuration | Resolved in F3; see [API](api.md), [architecture](architecture.md), and [notification operations](development.md#notification-operations). |
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
