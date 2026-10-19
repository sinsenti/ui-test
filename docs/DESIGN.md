---
name: Kvarta
description: Warm peach, geometric Cyrillic typography, and a familiar morning table.
colors:
  peach: "#fcede3"
  cream: "#fff8f0"
  cocoa: "#2b0c09"
  muted: "#795240"
  orange: "#f86725"
  orange-dark: "#b63d0b"
  line: "#d8b9a5"
  control-line: "#9c7b67"
  error: "#a12c1d"
  orange-hover: "#ff7c3e"
  comment-surface: "#f8e9de"
  feedback-surface: "#f5e6d6"
  subscription-surface: "#f5d9c3"
  footer-surface: "#f5dfcf"
  product-ethiopia: "#f8e7b7"
  product-colombia: "#f3d4c4"
  product-brazil: "#eddbc6"
typography:
  display:
    fontFamily: "var(--font-text), sans-serif"
    fontSize: "clamp(30px, 8.8vw, 96px)"
    fontWeight: 700
    lineHeight: 1.01
    letterSpacing: "-0.02em"
    fontVariation: '"wdth" 104'
  headline:
    fontFamily: "var(--font-text), sans-serif"
    fontSize: "clamp(28px, 5.6vw, 54px)"
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: "-0.03em"
  title:
    fontFamily: "var(--font-text), sans-serif"
    fontSize: "clamp(24px, 3vw, 32px)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.025em"
    wordSpacing: "0.1em"
  body:
    fontFamily: "var(--font-text), sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "var(--font-text), sans-serif"
    fontSize: "clamp(16px, 2.8vw, 24px)"
    fontWeight: 400
    lineHeight: 1.2
  wordmark:
    fontFamily: "var(--font-wordmark), sans-serif"
    fontSize: "clamp(30px, 9.14vw, 78px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.04em"
  action:
    fontFamily: "var(--font-text), sans-serif"
    fontSize: "clamp(18px, 3.6vw, 30px)"
    fontWeight: 700
  product-size:
    fontFamily: "var(--font-text), sans-serif"
    fontSize: "14px"
    fontWeight: 400
  product-tasting:
    fontFamily: "var(--font-text), sans-serif"
    fontSize: "clamp(19px, 2.2vw, 23px)"
    fontWeight: 400
    lineHeight: 1.25
  product-detail:
    fontFamily: "var(--font-text), sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  product-price:
    fontFamily: "var(--font-text), sans-serif"
    fontSize: "32px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  product-action:
    fontFamily: "var(--font-text), sans-serif"
    fontSize: "16px"
    fontWeight: 400
  quantity-value:
    fontFamily: "var(--font-text), sans-serif"
    fontSize: "18px"
    fontWeight: 400
  selection-copy:
    fontFamily: "var(--font-text), sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
  selection-total:
    fontFamily: "var(--font-text), sans-serif"
    fontSize: "24px"
    fontWeight: 700
rounded:
  link: "8px"
  control: "12px"
  quantity-button: "11px"
  action: "14px"
  product: "16px"
  menu: "20px"
  form: "clamp(24px, 5vw, 48px)"
  subscription: "36px"
  subscription-mobile: "28px"
  footer-top: "32px"
  radio: "50%"
spacing:
  field-gap: "6px"
  small: "12px"
  medium: "18px"
  large: "24px"
  column-gap: "40px"
  product-content-gap: "28px"
  product-grid-gap: "18px"
  product-grid-gap-mobile: "14px"
components:
  button-primary:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.cocoa}"
    typography: "{typography.action}"
    rounded: "{rounded.action}"
    padding: "16px 22px"
  button-primary-hover:
    backgroundColor: "{colors.orange-hover}"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.cocoa}"
    padding: "12px 0"
  button-text-hover:
    textColor: "{colors.orange-dark}"
  button-product:
    backgroundColor: "transparent"
    textColor: "{colors.cocoa}"
    typography: "{typography.product-action}"
    rounded: "{rounded.control}"
    padding: "11px 16px"
  button-product-hover:
    backgroundColor: "{colors.cocoa}"
    textColor: "{colors.cream}"
  button-product-selected:
    backgroundColor: "{colors.cocoa}"
    textColor: "{colors.cream}"
  quantity-control:
    backgroundColor: "transparent"
    textColor: "{colors.cocoa}"
    rounded: "{rounded.control}"
  quantity-button:
    backgroundColor: "transparent"
    rounded: "{rounded.quantity-button}"
    padding: "0"
    width: "44px"
    height: "44px"
  quantity-button-hover:
    backgroundColor: "{colors.cream}"
  selection-summary:
    textColor: "{colors.cocoa}"
    typography: "{typography.selection-copy}"
    padding: "0 0 18px"
  catalog-selection:
    textColor: "{colors.cocoa}"
    padding: "24px 0"
  button-remove-selection:
    backgroundColor: "transparent"
    padding: "10px 0"
  product-card:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.cocoa}"
    rounded: "{rounded.product}"
    padding: "clamp(22px, 3vw, 32px)"
  product-card-ethiopia:
    backgroundColor: "{colors.product-ethiopia}"
  product-card-colombia:
    backgroundColor: "{colors.product-colombia}"
  product-card-brazil:
    backgroundColor: "{colors.product-brazil}"
  product-card-drip:
    backgroundColor: "{colors.cream}"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.cocoa}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  radio:
    backgroundColor: "transparent"
    rounded: "{rounded.radio}"
    size: "clamp(23px, 4.8vw, 40px)"
  callback-panel:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.cocoa}"
    rounded: "{rounded.form}"
    padding: "2.7% 3%"
  menu-panel:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.cocoa}"
    rounded: "{rounded.menu}"
    padding: "18px"
  comment-disclosure:
    backgroundColor: "{colors.comment-surface}"
    textColor: "{colors.cocoa}"
    rounded: "{rounded.action}"
  feedback:
    backgroundColor: "{colors.feedback-surface}"
    textColor: "{colors.cocoa}"
    rounded: "{rounded.control}"
    padding: "15px"
  subscription-panel:
    backgroundColor: "{colors.subscription-surface}"
    textColor: "{colors.cocoa}"
    rounded: "{rounded.subscription}"
    padding: "5% 3%"
---

# Design System: Kvarta

## Overview

**Creative North Star: "Your morning table"**

The user-selected [original cosy-pack composition](../.impeccable/mocks/decision/cosy-pack.png)
establishes a warm, plainspoken world: peach paper, cream panels, cocoa text,
orange actions, and a coffee bag and ceramic cup arranged as one organic still
life. Broad Cyrillic lettering and compact sans-serif copy make the invitation
direct and familiar.

This document records the implemented local landing page, extracted from
[global styles](../src/app/globals.css), [page styles](../src/app/page.module.css),
and the [page](../src/app/page.tsx), [form](../src/app/lead-form.tsx), and
[header](../src/app/site-header.tsx). The still life and build plan were approved.
On 2026-10-19, after the multi-coffee extension, the user approved the current
assembled interface: «i check interface, everything is fine now».
The [roadmap](roadmap.md) owns completion status; deployment verification remains
a separate release step.

The user's later request for an individual box for each coffee extends the local
catalog with four warm-toned cards. The [surface brief](../.impeccable/surfaces/src-app-page-tsx.md)
records that scope. This merges the implemented card component into the existing
world; the original opening composition remains the baseline. At that stage,
assembled-page approval was still pending; the later acceptance is recorded above.
[Desktop](../.impeccable/review/coffee-desktop.png) and
[mobile](../.impeccable/review/coffee-mobile.png) catalog captures, their
[full-page desktop](../.impeccable/review/coffee-desktop-page.png) and
[mobile](../.impeccable/review/coffee-mobile-page.png) counterparts, and
[capture metadata](../.impeccable/review/coffee-capture.json) record the earlier
card-layout extension before the quantity interaction was added.

The subsequent selection-and-quantity request added the cocoa selected outline,
filled checked action, pack controls, and callback summary. The selected card
stays in view until its separate continuation action is used. Historical
production captures show the [idle mobile](../.impeccable/review/quantity-mobile-default.png)
and [desktop](../.impeccable/review/quantity-desktop-default.png) catalogs,
the selected [mobile](../.impeccable/review/quantity-mobile-catalog.png) and
[desktop](../.impeccable/review/quantity-desktop-catalog.png) cards, and their
[mobile](../.impeccable/review/quantity-mobile-form.png) and
[desktop](../.impeccable/review/quantity-desktop-form.png) form summaries.
[Full mobile](../.impeccable/review/quantity-mobile-page.png) and
[desktop](../.impeccable/review/quantity-desktop-page.png) captures and
[capture metadata](../.impeccable/review/quantity-capture.json) record the selected
Brazil example at two 250 g packs and 52 BYN. These are local production captures,
not a new assembled-page approval or release measurement.

The user then requested multiple coffee types in one callback request. Each card
now toggles independently, retains its own pack count and line subtotal, and shows
the combined coffee total when selected. A flat catalog summary lists the chosen
coffees and counts; the callback repeats the full list with per-line controls and
removal, a combined total, and delivery wording based on that total. This scoped
merge introduces no new palette, fonts, imagery, or visual world. The earlier
quantity captures document the previous single-variety behavior. Current local
production captures show the idle [mobile](../.impeccable/review/multi-mobile-default.png)
and [desktop](../.impeccable/review/multi-desktop-default.png) catalogs, the selected
[mobile](../.impeccable/review/multi-mobile-catalog.png) and
[desktop](../.impeccable/review/multi-desktop-catalog.png) catalogs, the
[mobile](../.impeccable/review/multi-mobile-form.png) and
[desktop](../.impeccable/review/multi-desktop-form.png) form summaries, and
[full mobile](../.impeccable/review/multi-mobile-page.png) and
[desktop](../.impeccable/review/multi-desktop-page.png) pages. The
[capture metadata](../.impeccable/review/multi-capture.json) records Colombia at
one pack, Brazil at two packs, and drip assortment at one box: 99 BYN combined,
with free Minsk delivery. It also records visible focused contact fields with
all four types selected across 320–1440px. These captures verify local rendering;
the user has since approved the assembled interface. Cloud and deployed-service
verification remain release work.

**Key Characteristics:**

- Warm peach and cream surfaces with cocoa text and orange actions.
- Broad geometric Cyrillic wordmarks and tightly stacked sans-serif headings.
- One complete organic coffee still life with a transparent exterior.
- Rounded callback controls, flat warm-toned product cards, and restrained motion.

## Colors

The palette stays within warm peach, cream, coffee brown, and orange; token values
in the frontmatter are the normative extracted values. The companion's tonal
ramps are synthesized preview strips, not additional colors implemented by the site.

### Primary

- **Warm orange** (`orange`): filled callback and subscription actions, checked
  radio centers, text selection, and the packaging accent within the image.
- **Orange hover** (`orange-hover`): enabled filled-button hover background.
- **Deep orange** (`orange-dark`): underlined-action hover, caret, checked-radio
  inner stroke, and the global keyboard focus outline.

### Neutral

- **Peach canvas** (`peach`): the page ground and menu-link hover fill.
- **Warm cream** (`cream`): the callback panel, navigation popover, skip link, and
  drip-assortment card.
- **Deep cocoa** (`cocoa`): primary text, icons, action text, selected-radio stroke,
  selected-card outline, and pressed product-button fill with cream text.
- **Soft cocoa** (`muted`): supporting copy, placeholders, and unselected radios.
- **Warm divider** (`line`): section dividers and product-card footer separators. The catalog's
  opening divider uses the local lighter value in its source. The same warm
  divider separates the combined catalog summary and callback selection rows.
- **Ethiopia, Colombia, and Brazil surfaces** (`product-ethiopia`,
  `product-colombia`, `product-brazil`): the individual catalog fills. Their
  product association stays consistent; drip assortment uses warm cream.
- **Control border** (`control-line`): text-field, comment-field, and shared
  quantity-control strokes.
- **Comment, feedback, subscription, and footer surfaces**: progressively warm
  tonal fields used for their named components; these are not interchangeable
  semantic status colors.
- **Error red** (`error`): invalid input strokes, field errors, and failure feedback.

**The Readable Controls Rule.** Keep the dedicated control border and persistent
labels; decorative section dividers do not replace field boundaries.

## Typography

**Display and Body Font:** local Pliant, exposed through `--font-text`, with a
sans-serif fallback. **Wordmark Font:** local Unbounded at weight 700, exposed
through `--font-wordmark`, with a sans-serif fallback.

Pliant carries headings, prices, prose, fields, and actions. Unbounded is confined
to the two uppercase «КВАРТА» wordmarks. The local Unbounded file is a static
subset for those letters, not a general text face. [Asset sources](assets.md)
records both licenses, conversion details, and image provenance.

### Hierarchy

- **Display**: the single two-line `h1`; its two spans preserve the approved
  headline break. The source requests the Pliant width axis at 104.
- **Headline**: `h2` section headings. Tight leading and negative tracking retain
  the compact, plain sans-serif character.
- **Title**: product `h3` names use weight 600, tight leading, balanced wrapping,
  and a 16ch maximum width. They use the frontmatter title clamp above 600px and
  a fixed 28px at 600px and below. Delivery subheadings retain medium weight at
  23px, reducing to 21px on small screens.
- **Body**: story and delivery prose use the frontmatter body role, reducing to
  17px at the small-screen breakpoint. Product size and supporting details have
  separate 14px roles in soft cocoa; details use 1.45 leading. Tasting notes use
  the product-tasting clamp with 1.25 leading.
  The global body relies on the browser's default size; there is no invented
  site-wide body clamp or modular type ratio.
- **Label**: visible field labels and the interest legend. Text inputs use
  `clamp(16px, 2.7vw, 24px)`; placeholders remain secondary to labels.
- **Wordmark**: the responsive header role; the footer repeats it at 27px.
- **Action**: the filled callback button. The full-width subscription action uses
  21px. Underlined actions use 16px; the delivery action reduces to 14px on small
  screens. Outlined product-selection buttons retain their 16px product-action role.
- **Prices**: product prices use the 32px product-price role, weight 600, tabular
  numerals, and no wrapping. Their BYN suffix uses 0.65em at weight 400.
  The form uses the bold selection-total role for its combined total; the catalog
  total uses the same size at regular weight. Quantity counts
  use the 18px quantity-value role and tabular numerals. Selected-offer copy uses
  the 16px selection-copy role with 1.45 leading. Form line information uses
  16px with 1.3 leading and tabular line prices; its pack description and delivery
  copy reduce to 14px. The catalog summary heading uses 24px at weight 600, and
  its list uses 16px with 1.5 leading.
  The subscription price uses weight 700 and
  `clamp(46px, 7vw, 72px)`, overridden to 52px on small screens.

**The Wordmark Scope Rule.** Use the supplied Unbounded subset only for «КВАРТА»;
use the complete local Pliant font for interface and editorial text.

## Layout

The landing page is one centered vertical canvas capped at 1120px, with a
6.5% horizontal gutter for ordinary text sections. The headline, complete still
life, offer copy, and callback panel remain sequential on wide screens. The
image occupies 99.3% of the canvas with a 0.7% left offset, retains its
847 / 580 display aspect ratio, and uses `object-fit: contain`.

The callback and subscription panels sit at 4.1% side margins. The callback has
percentage-based desktop padding and a field gap of `clamp(15px, 2vw, 20px)`.
The catalog uses two equal `minmax(0, 1fr)` columns with an 18px gap and 28px
space after its heading. Each card is a vertical flex container with a 28px
content gap and `clamp(22px, 3vw, 32px)` padding. Its order block has automatic
top margin; the pack label and quantity control sit opposite one another with
a 12px gap and 18px space below. The wrapping price/action row uses a 12px gap,
a 1px warm divider, and 20px top padding. Selected-card continuation copy begins
18px below that row. The combined catalog summary begins 28px after the grid,
with 24px vertical padding, top and bottom dividers, two equal columns, and a
24px gap. Its list begins 12px below the heading, with 6px between subsequent
rows; its continuation button begins 16px after the total and delivery text.
The subscription uses a 1.1fr / 1fr grid;
story and delivery use equal columns, with
40px and 60px gaps respectively. The page mixes proportional section margins
with local pixel spacing; it does not implement an assumed universal spacing grid.

At widths up to 600px, the catalog uses one column, a 14px gap, and 22px space
after its heading. The combined catalog summary stacks with a 14px gap, and
callback selection-row information wraps with an 8px gap. Subscription, story,
and delivery also stack into single columns. The callback uses 18px 14px padding.
Product names retain their 16ch
maximum; details wrap naturally. Radio labels and product footers wrap, and the
footer wraps with its final action on a full line. At 601px and above, the interest
group has a local -16px top adjustment. At 1120px and above, the headline top
margin is 6% and the still life gains 32px above it.

Anchors have a 24px scroll offset; the callback adds a 35px block scroll margin.
Product selection stays on the card. The separate «Перейти к заявке» actions
on selected cards and the combined summary, subscription actions, and help
actions open the shared callback panel while preserving entered values. The
next contact field receives focus; when the selection list is taller than the
viewport, that field scrolls into view. The selected-offer summary sits before
the contact fields, separated by a warm divider and 18px bottom padding. Its
flat list has 16px vertical row padding and bottom dividers; each row
places the quantity control and removal action together with a 12px top margin
and 16px gap. Reduced-motion preference changes movement to instant and disables
smooth document scrolling.

## Elevation & Depth

Depth comes from warm tonal surfaces and the light and material within the coffee
image. Form, subscription, product cards, and footer have no CSS shadow. The only
CSS elevation is the navigation popover's diffuse cocoa shadow
(`0 12px 32px #2b0c0920`). The focus outline is an interaction signal, not elevation.

**The Quiet Surface Rule.** Keep ordinary panels flat; reserve the existing soft
shadow for the overlaid navigation menu.

## Shapes

Large panels use soft corners: the callback has a fluid radius, the subscription
uses a smaller mobile radius, and the footer rounds only its top corners. Inputs
and feedback share the control radius; actions and the comment disclosure share
the action radius. Navigation links and the menu panel have their own smaller
corners. Radios remain circular with an orange center when selected.

Product cards use a 16px radius. Their 12px-radius selection buttons have a
1px cocoa outline. Cards have tonal fills without an outer border at rest; a
selected card gains a 2px cocoa outline inset with a -2px outline offset so
selection does not shift its layout. Quantity controls share the control radius,
with slightly smaller 11px corners on their square buttons.

The still life supplies the large organic oval silhouette through genuine image
transparency. Preserve the whole plate; a rectangular crop or CSS blob behind
partial objects would change the approved visual material. Other icons are
simple inline outline SVGs with rounded strokes.

## Components

### Buttons

Filled actions are warm and direct. They use orange with cocoa text, the action
radius, 16px 22px padding, and a minimum 48px height. Enabled hover changes only
the background over 180ms ease-out. There is no separate active transform.
Keyboard focus uses the global 3px deep-orange outline with 5px offset.

Product-selection buttons use a transparent fill, cocoa text and a 1px cocoa
outline, the control radius, 11px 16px padding, a 48px minimum height, and 16px
type. They center the label and inline arrow with a 12px gap. Enabled hover changes
the fill to cocoa and text to cream over 180ms ease-out for both properties.
The pressed state uses the same cocoa fill and cream text, changes the visible
label to «Выбрано», and replaces the arrow with a check mark. `aria-pressed`
exposes each card's independent selection; pressing again removes only that
coffee without scrolling. They share the global keyboard-focus, disabled, and
reduced-motion treatments.

Underlined help and delivery actions have transparent backgrounds, a 44px minimum
height, and a deep-orange hover color. The selected-card continuation fills its
row, spaces its text and arrow apart, and has 12px top padding. The hero
subscription action instead inherits its offer typography and adds an underline on hover. During submission,
offer buttons and the form fieldset are disabled; disabled buttons use a wait
cursor and 0.62 opacity. The submit label becomes «Сохраняем заявку…».

### Cards / Containers

The cream callback panel is a single shared form rather than repeated forms per
offer. The warmer subscription panel groups its headline, prose, price, and
action. Both are flat. Each catalog entry is an individual flat article with its
product-specific warm fill, product radius, and fluid padding. A card contains
the name, size (8px below the name), tasting notes (28px below the size), and
supporting detail (8px below the notes), followed by the pack controls and divided
price/action row. Pack size and per-pack price share the 14px supporting line.
The 32px price is the current coffee subtotal; its secondary line states pack
count and size, such as «2 × 250 г» or «2 × 10 дрип-пакетов». Names, tasting notes,
pack sizes, and prices remain HTML from the shared catalog. Each «Выбрать» action
includes the product name in its accessible label and adds that coffee with
one-time interest. Multiple cards can be selected together. The cocoa outline,
filled «Выбрано» button, check mark, and combined «Всего за кофе» amount give
immediate feedback in place. Each selected card shows «Перейти к заявке», which
preserves the whole selection. The flat «Ваш кофе» summary below the grid lists
all selected names and pack descriptions, then shows «Итого», combined delivery
information, and the same continuation. It has warm horizontal dividers rather
than a nested card surface. Selecting the subscription clears the coffee list
and retains its fixed monthly offer. The footer is a tonal closing band.

### Inputs / Fields

Text fields use a transparent fill within the cream panel, a 1px control-border
stroke, the control radius, 11px 18px padding, and a minimum 46px height. Labels
remain visible above fields. Placeholders and phone help use soft cocoa.

The phone placeholder and help share the example «+375 29 123-45-67».
Recognizable Belarusian numbers gain spaces and hyphens during entry or paste;
local and national dial prefixes remain supported. Formatting preserves digits
and the editing position. Foreign, overlong, and unsupported text remains
available for server validation instead of being silently rewritten or truncated.
This is presentation only: storage and duplicate protection use the existing
server-normalized number. No masking library is added to the client bundle.

Invalid fields switch their stroke to error red and display a nearby textual
error; `aria-describedby` associates the message. Validation focuses the first
invalid field and opens the comment disclosure when its field is invalid. The
three radio options use a 1px soft-cocoa circle; selection adds a cocoa outer
stroke and orange center with a deep-orange edge. Radio labels have a minimum
44px height and wrap as needed.

The optional comment is a tonal native disclosure with plus and chevron SVGs.
Its chevron turns 180 degrees when open; its textarea resizes vertically.
Selected offer context is a structured group named «Ваш выбор» before the
contact fields. Each coffee has a flat list row with a bold name, pack count and
size, tabular line price, the shared quantity control, and an underlined
«Убрать» action with a 44px minimum height. Removing a row preserves the other
coffees. A larger bold «За кофе» total and muted delivery information follow
the list. Below a combined 50 BYN, the form explains that the manager will
confirm the delivery charge; at 50 BYN or more it states that Minsk delivery is
free. «Очистить выбор» removes the entire coffee context. Changing interest to
«Вопрос» preserves the list; choosing «Подписка» clears it and shows the fixed
subscription summary without quantity controls. The summary remains plain form
content with divider rows rather than nested cards, pills, or badges.

Item validation errors share a nearby error message associated with the quantity
groups; after the error state commits, focus returns to the relevant enabled
quantity button or the status region. Contact-field errors retain their existing
inline messages and focus behavior.

### Pack quantity control

A compact outlined group repeats in each card and each selected-coffee row.
The visible card label is «Количество»; each group's accessible name is
«Количество: [название кофе]».
The minus and plus buttons have 44px square targets, transparent fills, and a
cream hover fill when enabled. A centered 18px tabular count has a 30px minimum
width. The count is bounded from 1 to 99; the unavailable boundary button uses a
default cursor and 0.4 opacity. Submission disables the controls with the same
treatment. Icons are inline 18px outline SVGs. Each group and button names its
product accessibly, the count announces changes politely and atomically, and
keyboard focus uses the global deep-orange outline. Card and summary controls
share the same count for that coffee. Quantity changes update its line subtotal,
the combined coffee total, and delivery wording without changing the selected
coffee types or moving the page.

### Feedback

Pending, saved, duplicate, and recoverable failures use the same inline tonal
feedback box, with 15px padding and the control radius. Failure text uses error
red; ordinary status uses cocoa. The status region announces updates politely
and atomically. Entered values remain available after failure. Do not infer a
separate green success treatment from conventional form libraries.

### Navigation

The header retains its wordmark and three-stroke menu at every width. A native
`details` disclosure opens a cream popover at the right with a minimum width of
265px, 18px padding, and the menu radius. Links use 17px Pliant with 12px padding;
hover adds peach. Selecting a link closes the menu. Escape closes it and returns
focus to the summary. The visible focus treatment is shared with other controls.
The skip link appears on focus above the page.

### Coffee still life

The local transparent plate contains the bag, cup, linen, and warm daylight as a
complete composition. It is a semantic image with descriptive alternative text,
eager loading, high fetch priority, and responsive image delivery. Text, controls,
and product content remain HTML. The social preview reuses the local plate and
Pliant with real rendered text; its provenance belongs in [asset sources](assets.md).

## Do's and Don'ts

### Do:

- **Do** preserve the user-selected peach, cream, cocoa, and orange world.
- **Do** keep persistent labels, dedicated control borders, and visible keyboard focus.
- **Do** use Pliant for readable Cyrillic interface text and the supplied Unbounded subset for «КВАРТА».
- **Do** keep the organic still life complete and serve imagery and fonts locally.
- **Do** retain inline feedback and entered values through recoverable form failures.
- **Do** honor reduced motion for scrolling and interaction transitions.
- **Do** keep each coffee in its own flat warm-toned card with the shared callback selection behavior.
- **Do** show selection in place with the cocoa outline, checked «Выбрано» action, and a separate continuation to the form.
- **Do** keep each coffee's pack count and line subtotal consistent between its card and form row.
- **Do** show the combined coffee total and base delivery wording on that total in the catalog and form.
- **Do** keep multi-coffee summaries flat, with warm dividers and per-line removal that preserves the other choices.

### Don't:

- **Don't** replace the approved original composition with the unselected serif experiment.
- **Don't** make decorative section dividers stand in for text-field borders.
- **Don't** rasterize headings, product facts, or controls into the hero image.
- **Don't** add shadows to the flat catalog cards or ordinary panels.
- **Don't** treat local interface approval or lab results as deployed release verification.
