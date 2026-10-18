# Kvarta

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmed: Next.js for the application, Vercel for deployment, and Neon
PostgreSQL for persistent lead storage. The user explicitly selected Vercel +
Neon after comparing hosting and database options. There is no existing
application or scaffold.

Implementation defaults selected within the user's delegated scope: TypeScript,
CSS Modules with CSS custom properties, a `POST /api/lead` Route Handler, Zod,
`libphonenumber-js/max`, the standard `pg` PostgreSQL client, and versioned SQL
migrations.
These are implementation choices rather than unresolved business requirements.

Local development must work offline after dependencies and the database image
have been downloaded. The user selected PostgreSQL in Docker. Run Next.js on the
host and PostgreSQL through Docker Compose, with a named volume for persistent
local data. Use the same PostgreSQL major version locally and on Neon. The `pg`
client replaces the earlier Neon-specific driver default so application SQL and
database access work against both environments.

Use Node.js 24 and npm for local development. Keep fonts and image assets local.
Cloud account setup, hosted configuration, and real Telegram bot connection are
deferred until the final release feature. Local development and integration
tests use Docker PostgreSQL and a simulated Telegram transport.

Development follows `task -> data-modeler -> builder -> test -> review`. Keep
acceptance criteria, data/API decisions, implementation notes, test evidence,
and review outcomes in the conversation and agent handoffs. Per-feature files
are not required; optional scratch notes under `features/` stay local and are
ignored by Git. The shared workflow and implementation order live in `AGENTS.md`.

Telegram delivery uses a durable `notification_outbox`: create a lead and its
notification job atomically with the duplicate guard, then attempt delivery
after commit. Claim jobs atomically, recover abandoned claims, and persist
attempts, next eligible attempt, delivery state, and safe error details. Retry
transient failures with backoff and honor Telegram's `retry_after`; retain
terminal failures for operator correction and retry.

Send a readable message containing the stable lead ID, contact fields, interest,
product context, comment, and useful attribution, with correct escaping and a
bounded length. An ambiguous external timeout can cause a repeated message;
delivery is at least once, not an exactly-once guarantee across both systems.

The current default is a prompt first attempt through Next.js `after()`, retries
of due jobs on subsequent lead requests, a protected manual retry path, and a
daily recovery cron at release. Keep per-invocation work bounded and unfinished
jobs persisted. The recorded Vercel Hobby cron limit is once per day with
imprecise timing (checked 2026-10-18); recheck at release. Normal delivery is
prompt, while outage recovery has no rapid delivery guarantee under this plan.
See the [Telegram API](https://core.telegram.org/bots/api#sendmessage),
[Next.js after](https://nextjs.org/docs/app/api-reference/functions/after), and
[Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## Users

Russian-speaking customers aged 25–45 in Minsk who drink coffee at home or in an
office. Most visitors arrive on a phone from Instagram or Yandex advertisements.
They need to understand the offer, choose an interest, and request a callback.

## Product Purpose

A landing page for the fictional Minsk coffee roastery «Кварта». Success is a
persisted request for a subscription, one-time order, or question. A manager calls
the visitor and finalizes the order. No cart or online payment is required.

## Positioning

Founded in 2019 by former baristas Anya and Dmitry. Coffee is roasted in 5 kg
batches on Thursdays and delivered around Minsk on Fridays. The brief states that
customers receive beans 1–3 days after roasting. Freshness is the central benefit.

## Operating Context

- Assignment: `kvarta-brief.md`, the source of the supplied business facts.
- Budget: 4–6 hours of focused work, with free hosting required.
- Deadline: Monday, 19 October, 18:00 Moscow time, as stated in the brief.
- Submission includes the live site, repository with incremental commits,
  authentic AI work log or key screenshots, mobile Lighthouse measurement, and
  a concise README describing choices, assumptions, contributions, and limits.
- The final release phase includes environment separation, migrations, real
  bot/chat configuration, and a real test notification with synthetic lead data.
  Preview checks must not write production leads or message the production chat.

## Capabilities and Constraints

- Include the roastery story and freshness explanation, products with prices,
  subscription, delivery and pickup information, contacts, and a lead form.
- Form fields: name, Belarusian phone number, interest (subscription, one-time
  order, question), and comment.
- One shared form; product and subscription actions preselect the interest and
  preserve the relevant product context.
- Validate Belarusian numbers and show understandable feedback.
- The same normalized phone number must not create a second lead within ten
  minutes, including simultaneous requests and repeated clicks.
- Persist leads across application restarts and deployments. Enforce duplicate
  protection on the server with database coordination.
- Save advertising attribution with each lead: UTM parameters, advertising click
  identifiers when present, landing URL, and referrer when available.
- Show submission progress, success, duplicate acknowledgement, and recoverable
  failure without losing entered values.
- Include social link-preview metadata and an image. Keep motion restrained.
- Telegram notifications are required by the user's expanded scope. Persist
  each new lead and one pending notification atomically, then attempt delivery.
  Telegram failures must not discard the lead or turn a saved lead into a failed
  form submission. Persist delivery state for retries. Duplicate submissions
  must not create another lead or notification job.
- Unknown business details are confirmed by the manager: the delivery charge
  below 50 BYN and the composition of the subscription.
- No phone number, email, or social account was supplied. Use the supplied
  workshop address and lead form for contacts; do not invent contact details.

## Brand Commitments

The name is «Кварта». The voice is warm, simple, and unpretentious. The assignment
asks for a distinctive design for this particular roastery without premium gloss
or a generic generated appearance. A text wordmark is allowed. The user wants
the local Impeccable skill to guide the UI work.

The latest user direction is a warmer, cozier design with more visual forms.
Use the suggested peach `#FCEDE3` alongside warm cream and warm-tone accents;
the previous white-only direction is superseded. Add purposeful rounded or
organic shapes and inviting coffee imagery. Avoid a dry, austere, form-dominated
opening. Retain readable controls and the typography reference below, with a
gentler hierarchy and warmer overall expression.

Typography reference: `assets/screen.png`, supplied by the user. Use its broad,
bold geometric wordmark character and compact, tightly stacked plain sans-serif
copy as inspiration for a Cyrillic Kvarta identity. The exact font has not been
identified or selected. Do not copy the reference brand name, registered mark,
food offerings, or other business claims. Compare layouts within this visual
direction before implementation.

The user selected `.impeccable/mocks/decision/cosy-pack.png` ("Your morning
table") as the preferred composition: peach canvas, a coffee bag and ceramic
cup inside a large organic oval, followed by the offers and rounded callback
panel. The user subsequently confirmed the original `cosy-pack.png` as the design
to keep, including its original headline direction. The serif experiment is
unselected. Use the original as the approved baseline; further design additions
can be explored later. Exact font assets still need to be matched to this visual
direction during implementation.

## Evidence on Hand

The client is fictional; the following are supplied assignment facts, not
independently verified real-world claims.

| Offer | Details | Price |
| --- | --- | --- |
| Эфиопия Иргачеффе | Floral, bergamot, light roast; 250 g | 32 BYN |
| Колумбия Уила | Caramel, red apple; 250 g | 29 BYN |
| Бразилия Серрадо | Nuts, chocolate, suited to espresso; 250 g | 26 BYN |
| Дрип-пакеты, ассорти | 10 drip bags | 18 BYN |
| Подписка | Two 250 g packs monthly; delivery included | 54 BYN/month |

Workshop and pickup: Минск, ул. Короля, 9. Hours: Monday–Friday 08:00–20:00;
Saturday–Sunday 10:00–18:00. Minsk delivery on Fridays is free for orders of
50 BYN or more; subscription delivery is included.

No brand assets, photographs, testimonials, customer counts, or awards have been
provided. Images may be generated or sourced under an appropriate free license.

## Product Principles

- Make the offer and the next action understandable on a phone.
- Ground claims in the supplied business facts.
- Treat a lead as received only when it has been persisted.
- Preserve the visitor's input and make recovery straightforward.
- Keep the scope achievable within the assignment.
