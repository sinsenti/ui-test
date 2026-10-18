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
    fontSize: "clamp(20px, 3.7vw, 32px)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.025em"
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
rounded:
  link: "8px"
  control: "12px"
  action: "14px"
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
[header](../src/app/site-header.tsx). The still life and build plan were approved;
user approval of the assembled first viewport remains pending. This record does
not mark F4 complete. The [roadmap](roadmap.md) owns completion status.

**Key Characteristics:**

- Warm peach and cream surfaces with cocoa text and orange actions.
- Broad geometric Cyrillic wordmarks and tightly stacked sans-serif headings.
- One complete organic coffee still life with a transparent exterior.
- Rounded callback controls, flat editorial product rows, and restrained motion.

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
- **Warm cream** (`cream`): the callback panel, navigation popover, and skip link.
- **Deep cocoa** (`cocoa`): primary text, icons, action text, and selected-radio stroke.
- **Soft cocoa** (`muted`): supporting copy, placeholders, and unselected radios.
- **Warm divider** (`line`): section and product-row separators. The catalog's
  opening divider uses the local lighter value in its source.
- **Control border** (`control-line`): text-field and comment-field strokes.
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
- **Title**: product `h3` names. Delivery subheadings use medium weight at 23px,
  reducing to 21px on small screens.
- **Body**: story and delivery prose use the frontmatter body role, reducing to
  17px at the small-screen breakpoint. Supporting product details use 14px.
  The global body relies on the browser's default size; there is no invented
  site-wide body clamp or modular type ratio.
- **Label**: visible field labels and the interest legend. Text inputs use
  `clamp(16px, 2.7vw, 24px)`; placeholders remain secondary to labels.
- **Wordmark**: the responsive header role; the footer repeats it at 27px.
- **Action**: the filled callback button. The full-width subscription action uses
  21px. Underlined actions use 16px, with product selection at 14px on small screens.
- **Prices**: product prices use weight 600, tabular numerals, and
  `clamp(22px, 4vw, 32px)`; the subscription price uses weight 700 and
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
Catalog rows keep description on the left and price/action on the right. The
subscription uses a 1.1fr / 1fr grid; story and delivery use equal columns, with
40px and 60px gaps respectively. The page mixes proportional section margins
with local pixel spacing; it does not implement an assumed universal spacing grid.

At widths up to 600px, subscription, story, and delivery stack into single
columns. The callback uses 18px 14px padding; product names are limited to 15ch
and details to 24ch. Radio labels wrap, product rows remain two-sided, and the
footer wraps with its final action on a full line. At 601px and above, the interest
group has a local -16px top adjustment. At 1120px and above, the headline top
margin is 6% and the still life gains 32px above it.

Anchors have a 24px scroll offset; the callback adds a 35px block scroll margin.
Offer selection scrolls the shared callback panel into view and focuses the next
contact field while preserving entered values. Reduced-motion preference changes
that movement to instant and disables smooth document scrolling.

## Elevation & Depth

Depth comes from warm tonal surfaces and the light and material within the coffee
image. Form, subscription, product rows, and footer have no CSS shadow. The only
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

Underlined product/help actions have transparent backgrounds, a 44px minimum
height, and a deep-orange hover color. The hero subscription action instead
inherits its offer typography and adds an underline on hover. During submission,
offer buttons and the form fieldset are disabled; disabled buttons use a wait
cursor and 0.62 opacity. The submit label becomes «Сохраняем заявку…».

### Cards / Containers

The cream callback panel is a single shared form rather than repeated forms per
offer. The warmer subscription panel groups its headline, prose, price, and
action. Both are flat. Catalog entries are open rows separated by a thin divider,
not individually enclosed cards. The footer is a tonal closing band.

### Inputs / Fields

Text fields use a transparent fill within the cream panel, a 1px control-border
stroke, the control radius, 11px 18px padding, and a minimum 46px height. Labels
remain visible above fields. Placeholders and phone help use soft cocoa.

Invalid fields switch their stroke to error red and display a nearby textual
error; `aria-describedby` associates the message. Validation focuses the first
invalid field and opens the comment disclosure when its field is invalid. The
three radio options use a 1px soft-cocoa circle; selection adds a cocoa outer
stroke and orange center with a deep-orange edge. Radio labels have a minimum
44px height and wrap as needed.

The optional comment is a tonal native disclosure with plus and chevron SVGs.
Its chevron turns 180 degrees when open; its textarea resizes vertically.
Selected offer context is a small wrapping text row with an underlined removal
action, not a pill or badge.

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

### Don't:

- **Don't** replace the approved original composition with the unselected serif experiment.
- **Don't** make decorative section dividers stand in for text-field borders.
- **Don't** rasterize headings, product facts, or controls into the hero image.
- **Don't** add card shadows to ordinary panels or promote catalog rows into enclosed cards without a new design decision.
- **Don't** treat this implementation record as assembled-hero approval or release completion.
