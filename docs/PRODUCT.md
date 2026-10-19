# Kvarta

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Selected: Next.js App Router + TypeScript, Node.js 24/npm, CSS Modules and CSS
custom properties, standard `pg`, and versioned SQL migrations. Production will
use Vercel + Neon PostgreSQL. Local development uses host Next.js and Docker
PostgreSQL 17 with a persistent volume, and must work offline after dependencies
and images are downloaded. Keep fonts and imagery local.

The local foundation, lead API, and durable notification worker are implemented.
Local notification checks use an offline simulator. The landing page implements
the approved cosy-pack composition and connects to the shared callback API.
See the [roadmap](roadmap.md) for status and acceptance criteria, the
[architecture](architecture.md) for implemented and planned boundaries, and the
[development guide](development.md) for commands.

Lead intake uses `POST /api/lead`, Zod, `libphonenumber-js/max`, and atomic
database coordination for duplicate protection and a durable notification
outbox. Telegram delivery attempts after commit, persists failures and retry
state, and recovers pending jobs. A repeated Telegram message is possible after
an ambiguous timeout; delivery is at least once. These are selected implementation
defaults, not unresolved business requirements.

Cloud provisioning and the real Telegram bot connection belong to the final
release feature. Earlier features use Docker PostgreSQL and a simulated Telegram
transport. Preview environments must stay separate from production.

Development follows `task -> data-modeler -> builder -> test -> review`, defined
in [AGENTS.md](../AGENTS.md). Task details and handoffs stay in the conversation;
optional `features/` scratch notes stay ignored by Git. Maintain the shared
roadmap rather than creating a committed file for every feature.

## Users

Russian-speaking customers aged 25–45 in Minsk who drink coffee at home or in an
office. Most visitors arrive on a phone from Instagram or Yandex advertisements.
They need to understand the offer, choose an interest, and request a callback.

## Product Purpose

A landing page for the fictional Minsk coffee roastery «Кварта». Success is a
persisted request for a subscription, one-time order, or question. A manager calls
the visitor and finalizes the order. No online payment is required.

## Positioning

Founded in 2019 by former baristas Anya and Dmitry. Coffee is roasted in 5 kg
batches on Thursdays and delivered around Minsk on Fridays. The brief states that
customers receive beans 1–3 days after roasting. Freshness is the central benefit.

## Operating Context

- Assignment: [kvarta-brief.md](kvarta-brief.md), the supplied business facts.
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
- Individual coffee cards show a visible selected state, pack quantity and
  product subtotal. Visitors can choose several varieties together, independently
  adjust each pack count on the cards or in the form, and remove individual
  selections. The catalog and form show the full list and combined coffee total.
  A pack is 250 g of beans or
  one box of 10 drip bags. Selection stays on the card; «Перейти к заявке» opens
  the shared form with the same selections and total. Subscription is a separate
  fixed monthly offer; choosing it clears the individual coffee selections.
  The server saves every selected line with quantity and its own price snapshot.
  Free delivery uses the combined coffee total of at least 50 BYN; delivery below
  that amount is confirmed by the manager.
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

Typography reference: [assets/screen.png](../assets/screen.png), supplied by the
user. Use its broad, bold geometric wordmark character and compact, tightly stacked plain sans-serif
copy as inspiration for a Cyrillic Kvarta identity. The implementation uses
locally served Pliant text and an Unbounded wordmark, matched to the approved comp.
Do not copy the reference brand name, registered mark,
food offerings, or other business claims. Compare layouts within this visual
direction before implementation.

The user selected [cosy-pack.png](../.impeccable/mocks/decision/cosy-pack.png)
("Your morning table") as the preferred composition: peach canvas, a coffee bag and ceramic
cup inside a large organic oval, followed by the offers and rounded callback
panel. The user subsequently confirmed the original `cosy-pack.png` as the design
to keep, including its original headline direction. The serif experiment is
unselected. Use the original as the approved baseline; further design additions
can be explored later. The user approved the generated production still life and
build plan before assembly. Font licenses and generation provenance live in
[asset sources](assets.md).

The user subsequently requested an individual box for each offered coffee.
The catalog uses four separate warm-toned product cards, with the existing
names, tasting notes, pack sizes, prices, and shared callback selection. This
extends the cosy-pack direction; the opening composition remains the baseline.

After the multi-coffee flow was implemented, the user approved the current
assembled interface on 2026-10-19: «i check interface, everything is fine now».
Keep that accepted interface as the current visual reference. This acceptance
does not configure cloud services or verify a public deployment.

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
