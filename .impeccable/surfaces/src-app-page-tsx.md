---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

# Landing page

Mode: Persuade. Russian-speaking visitors in Minsk choose coffee or a subscription and request a callback, usually on a phone arriving from an advertisement.

## Direction contract

THESIS: A familiar morning table makes fresh local coffee inviting. Preserve the user's selected original cosy-pack composition rather than reopening visual options.

OWN-WORLD: White page ground, peach #FCEDE3 and warm cream supporting surfaces, lighter honey/apricot/oat cards, deep cocoa and warm orange. Broad geometric Cyrillic sans, rounded form controls and one complete organic still-life plate. Thin amber freehand paths add warmth around the image and in section margins.

STORY: See the coffee, understand the Thursday roast and Friday delivery, compare the four products or monthly subscription, and leave a request in one shared form.

FIRST VIEWPORT: Mobile follows the approved vertical path: wordmark and menu, bold two-line headline, full-width organic coffee still life, offer text, cream callback panel, catalog opening. Desktop preserves the sequence with a bounded reading canvas and carefully enlarged image; no split hero.

FORM: User-selected “Your morning table”, original cosy-pack.png. No new concept-seed roll was run for F4: this implementation began directly from the existing user-pinned approved comp (`build-phase start --comp`, direction null). Offer selection moves to the shared form and retains entered values; reduced motion removes smooth movement.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Catalog extension

The user requested individual boxes for the four coffee offers. Keep the
surrounding composition and shared callback behavior. Use flat warm-toned cards
in two columns on wider screens and one on phones, with clear product facts,
prices and dedicated selection buttons. This authorizes the catalog component
change; it does not record assembled-page approval or replace the opening comp.

The user then requested clear selection feedback, pack quantities and prices.
Keep selection on the card with a visible pressed state, a shared +/− pack
control and updated subtotal. A separate «Перейти к заявке» action opens the
form, which repeats the chosen variety, quantity, subtotal and truthful delivery
information. The later user request supersedes the single-variety limit: several
coffees can stay selected together, each with its own pack count and removal.
The catalog and form repeat the complete list and combined coffee total; delivery
uses that sum. Subscription remains a separate fixed offer and clears the coffee
list when selected.

## Interface acceptance

On 2026-10-19 the user reviewed the current interface and stated:
«i check interface, everything is fine now. run Fresh performance check».
The assembled interface is accepted; preserve the current composition and
multi-coffee behavior. This conversational approval does not fabricate an HTML
capture receipt or an automated pixel-gate pass, and does not verify deployment.

## Approved linework and white canvas

On 2026-10-19 the user approved the local orange-linework preview: «regarding
current changes: they look good to me, let's add them», and requested «let's make
white background back» with possible supporting color changes. Preserve that
line geometry and the accepted composition, restore a white page ground, and use
lighter warm card and panel fills. This later instruction supersedes the original
comp's peach canvas. Ornament stays static, hidden from assistive technology and
non-interactive; section anchoring keeps it clear when selections/comments grow.
This approval authorizes the refinement and its commit, not deployment or closure
of historical full-comp pixel gates.
