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
`libphonenumber-js/max`, the Neon serverless driver, and versioned SQL migrations.
These are implementation choices rather than unresolved business requirements.

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
- Telegram forwarding is optional and follows the required working flow.
- Unknown business details are confirmed by the manager: the delivery charge
  below 50 BYN and the composition of the subscription.
- No phone number, email, or social account was supplied. Use the supplied
  workshop address and lead form for contacts; do not invent contact details.

## Brand Commitments

The name is «Кварта». The voice is warm, simple, and unpretentious. The assignment
asks for a distinctive design for this particular roastery without premium gloss
or a generic generated appearance. A text wordmark is allowed. The user wants
the local Impeccable skill to guide the UI work.

The user has no additional visual requirements or external references beyond
`kvarta-brief.md` and this product record. Visual concepts will be developed from
those constraints and compared before implementation.

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
