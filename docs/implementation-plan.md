---
title: EDDIE Bus Website Implementation Plan
description: Plan for upgrading the current static Next.js app using the canonical site structure and copy.
author: GitHub Copilot
ms.date: 2026-05-15
ms.topic: plan
---

## Goal

Upgrade the existing placeholder Next.js app into a complete static website for The
EDDIE Bus. The canonical source for structure, page order, and copy is
[site-structure-copy.md](site-structure-copy.md). The app must remain compatible
with static export and must work from the generated `out/` directory after
`npm run build`.

The confirmed logo source is [logo.png](../public/logo.png). The Google Stitch
design export is available at `docs/design/stitch_brand_driven_web_design/`,
including desktop and mobile screenshots, generated HTML, design tokens, and
supplied vehicle image references. The archived bus photos in
`old site archive/images/` can be used as fallback reference material if the
Stitch image set is incomplete.

## Source of Truth Hierarchy

Use the sources in this order when content, visual references, or generated
design files differ:

1. [site-structure-copy.md](site-structure-copy.md) is canonical for site
  structure, page headings, public copy, contact details, navigation labels,
  calls to action, footer copy, policy placeholders, and content priorities.
2. [logo.png](../public/logo.png) is the only correct production logo. Do not
  replace it with the rendered logo screenshot in the Stitch export.
3. `docs/design/stitch_brand_driven_web_design/community_mobility_system/DESIGN.md`
  is canonical for the visual system: colors, typography, spacing, shape,
  elevation, and accessibility-oriented component guidance.
4. The Stitch route screenshots and generated HTML are implementation references
  for layout and component composition only. Do not use non-canonical copy from
  Stitch if it differs from [site-structure-copy.md](site-structure-copy.md).
5. Supplied vehicle photos in the Stitch export should be preferred for page
  imagery. Archived images in `old site archive/images/` are fallback assets.

## Current State

The app is a single-page placeholder in the Next.js App Router:

* [app/page.js](../app/page.js) contains the temporary homepage content.
* [app/layout.js](../app/layout.js) sets basic site metadata.
* [app/globals.css](../app/globals.css) contains all existing styling.
* [next.config.js](../next.config.js) already uses `output: 'export'` and
  unoptimized images.
* [public/logo.png](../public/logo.png) is the correct production logo and is a
  495 by 179 PNG.
* `docs/design/stitch_brand_driven_web_design/` contains the Stitch design
  reference, including route-specific desktop and mobile screenshots.

## Implementation Principles

* Keep the site static. Do not add API routes, server actions, runtime SSR, a
  database, or backend compute.
* Use the wording and page structure from
  [site-structure-copy.md](site-structure-copy.md) as the source of truth.
* Use "The EDDIE Bus" as the public name and "The Bromsgrove Minibus Appeal
  Fund" for the registered charity and legal context.
* Make booking, eligibility, charges, accessibility, carer responsibilities,
  volunteering, service area, and contact details easy to find.
* Build a calm, practical, accessible charity website rather than a marketing
  landing page.
* Prefer reusable content data and layout components so copy updates remain
  straightforward.

## Information Architecture

Implement the recommended page order from the canonical copy:

1. Home: `/`
2. How to Book: `/how-to-book/`
3. About Us: `/about-us/`
4. Volunteering: `/volunteering/`
5. Places to Visit: `/places-to-visit/`
6. Passenger & Accessibility Policy: `/policies/`
7. Contact Us: `/contact-us/`
8. Privacy Policy: `/privacy-policy/`
9. Cookie Policy: `/cookie-policy/`
10. Accessibility Statement: `/accessibility-statement/`
11. Terms of Use: `/terms-of-use/`

The primary navigation should include the seven main public pages only:

* Home
* How to Book
* About Us
* Places to Visit
* Passenger & Accessibility Policy
* Volunteering
* Contact Us

The four policy placeholder pages should be linked from the footer.

## Recommended File Structure

Use App Router route folders and a small component/data layer:

```text
app/
  about-us/page.js
  accessibility-statement/page.js
  contact-us/page.js
  cookie-policy/page.js
  globals.css
  how-to-book/page.js
  layout.js
  page.js
  policies/page.js
  places-to-visit/page.js
  privacy-policy/page.js
  terms-of-use/page.js
  volunteering/page.js
src/
  components/
    Callout.js
    ContactPanel.js
    Footer.js
    Header.js
    Hero.js
    PageIntro.js
    Section.js
  content/
    site.js
    pages.js
public/
  logo.png
  images/
    bus-front.jpg
    bus-side.jpg
    bus-lift.jpg
    bus-interior-seats.jpg
    bus-side-step.jpg
```

The exact component names can change during implementation, but the split should
keep page files mostly declarative and keep shared navigation, footer, contact,
CTA, and section patterns consistent.

Do not move or rename [logo.png](../public/logo.png). It should be imported or
referenced from `/logo.png` and displayed with the alt text `The EDDIE Bus logo`.

## Content Model

Create shared content constants for:

* Registered charity name
* Public name
* Slogan
* Charity number
* Email address
* Phone number
* Navigation links
* Primary and secondary CTA labels
* Footer copy
* Policy placeholder copy

The site-wide constants must use these canonical values:

* Registered charity name: The Bromsgrove Minibus Appeal Fund
* Public name: The EDDIE Bus
* Slogan: Everyday Drives for the Disabled, Independent and Elderly
* Registered charity number: 516666
* Email: theeddiebus@gmail.com
* Phone: 07805 400180
* Primary CTA: Book the EDDIE Bus
* Secondary CTA: Volunteer with Us

Create page-specific content from the canonical document for:

* Hero headings and intro paragraphs
* Ordered booking steps
* Charge, payment, cancellation, travel, availability, and eligibility sections
* About, history, EDDIE name, standards, donation, and contact sections
* Volunteering driver and helper sections
* Places to visit grouped by category
* Passenger capacity and accessibility policy sections
* Contact reasons and contact detail blocks

Keep the canonical page copy intact during first implementation. If typos,
duplication, or punctuation issues are found in the source copy, record them as
content follow-up items instead of silently rewriting them in the app.

Known follow-up candidates in the source include "destination,,", a duplicated
"Naming convention" section, and a duplicated Section 19 sentence in the
Volunteering page. The implementation should remain faithful to the current
canonical file unless that file is updated.

## Stitch Design Inventory

Use these Stitch references during implementation:

* `home_the_eddie_bus/screen.png` and `home_the_eddie_bus_mobile/screen.png`
  for the homepage hero, sticky navigation, CTA treatment, content bands, and
  bento-style summary panels
* `how_to_book_the_eddie_bus/screen.png` and
  `how_to_book_the_eddie_bus_mobile/screen.png` for booking steps, charge
  summaries, and practical process layout
* `about_us_the_eddie_bus/screen.png` and
  `about_us_the_eddie_bus_mobile/screen.png` for the charity story and vehicle
  imagery layout
* `places_to_visit_the_eddie_bus/screen.png` and
  `places_to_visit_the_eddie_bus_mobile/screen.png` for grouped destination
  lists
* `volunteering_the_eddie_bus/screen.png` and
  `volunteering_the_eddie_bus_mobile/screen.png` for driver/helper recruitment
  layout and CTA hierarchy
* `passenger_policy_the_eddie_bus_mobile/screen.png` for the passenger and
  accessibility policy mobile layout
* `policies_the_eddie_bus_mobile/screen.png` for policy placeholder treatment
* `20260421_*.jpg/screen.png` entries for supplied vehicle photo references

The Stitch export does not replace the route list in the canonical source. For
example, if Stitch groups policy content under a shorter label such as
"Policies", the implemented site still needs the canonical
`Passenger & Accessibility Policy` page and the four footer policy placeholders.

## Visual Direction

Use the confirmed logo as the main brand anchor and follow the Stitch design
direction in `docs/design/stitch_brand_driven_web_design/community_mobility_system/DESIGN.md`.
The design system uses a clean white and soft gray base, high-visibility EDDIE
red for primary actions, charcoal text for legibility, and blue accents for
accessibility-related cues.

Recommended style direction:

* Sticky header with the logo, charity line, accessible navigation, and prominent
  booking CTA
* Home hero with a clear service proposition, contact actions, and a bus image
  or image treatment that shows the actual vehicle
* Practical content bands rather than decorative nested cards
* Compact information panels for price, minimum charge, payment, cancellation,
  phone, and email
* Warm, high-contrast colors aligned to the Stitch tokens: `#ba0013` or
  `#e31e24` for primary red, `#1a1c1c` for primary text, `#f9f9f9` for the
  background, and `#1e51cd` for accessibility cues
* Rounded corners around 8px for controls and panels, with larger image radii
  only where the Stitch screenshots use them deliberately
* Responsive layouts that prioritize readability for older users and carers
* Plus Jakarta Sans for headings and Inter for body copy, matching the Stitch
  design system
* Minimum 44 by 44 px interactive targets, with primary mobile buttons aiming
  for 56 px height as shown in the Stitch component guidance
* A 12-column desktop grid, 8-column tablet grid, and 4-column mobile grid as
  directional layout scaffolding

Use real bus photography where helpful:

* Home hero or supporting image: the Stitch bus hero image or the best supplied
  exterior bus photo
* Accessibility page: supplied lift, side step, and seating photos
* About page: supplied exterior and interior photos
* Places page: no stock-like decorative images unless suitable destination
  photography is supplied

Copy the selected supplied or archived images into `public/images/` with
descriptive file names before use. Add meaningful alt text for each image. The
old archive images are small, so prefer higher-resolution images from the Stitch
export when available.

## Page Plans

### Home

Build the homepage as the quickest route to understanding and action:

* Hero with the canonical heading, intro copy, `Book the EDDIE Bus`, and
  `Find out about volunteering` actions
* Short "What we do" section
* Service area list
* "Who we support" eligibility summary
* "Why choose the EDDIE Bus?" benefits grid
* Contact panel with email and phone
* Use canonical service area entries: Bromsgrove, Catshill, Rubery, Wythall,
  Alvechurch, Barnt Green, and Upton Warren
* Include all canonical benefit bullets, including Blue Badge, insurance, and
  Section 19 permit references

### How to Book

Make this the most operational page:

* Intro with email and phone links
* Booking process as a numbered list
* Charge panel showing GBP 1.25 per mile and GBP 25 minimum charge
* Payment, cancellation, travel limits, availability, and eligibility sections
* Clear note that there is no booking form initially
* Clear note that the availability calendar is a future feature and must not be
  included in the first version
* Link to Places to Visit for trip ideas
* Include the Upton Warren storage area postcode `B61 7EZ` in the mileage
  calculation copy

### About Us

Tell the charity story and provide trust signals:

* Charity intro and registration number
* Aim and service summary
* Typical outings list
* History from 1985 to the 2020 minibus
* Vehicle details and EDDIE name explanation
* Remembering Eddie Mowbray
* Insurance, Section 19, donations, and contact CTA

### Volunteering

Turn interest into contact:

* Intro explaining dependency on volunteers
* Driver suitability and requirements
* Over-70 D1 entitlement and medical declaration note
* Driver checks and insurance information
* Helper roles
* Reasons to volunteer
* Email-first contact CTA
* Include that DBS checks are not currently required and formal driver training
  is not required or provided, matching the canonical copy

### Places to Visit

Present trip inspiration as scannable grouped lists:

* Intro explaining that destinations are suggestions only
* Category sections for garden centres, towns, museums, theatres, activities,
  historic sites, parks, shopping, and wildlife attractions
* Contact CTA to discuss distance, suitability, and availability
* Preserve all destination entries from the canonical copy, including repeated
  entries such as West Midland Safari Park where they appear in more than one
  category

### Passenger & Accessibility Policy

Make capacity and responsibility boundaries clear:

* Intro explaining driver discretion
* Capacity sections for standard seating, transfers, static wheelchairs, and
  powered wheelchairs
* Safety note callout
* Driver responsibilities list
* Carer responsibilities list
* Repeated reminder that the booking organisation provides support
* Include the exact maximum capacity numbers from the canonical copy: 13
  standard passengers, up to 6 transfer passengers plus up to 7 able-bodied
  passengers, up to 3 static wheelchair users, and usually 1 powered wheelchair
  user

### Contact Us

Keep the page simple and direct:

* Reasons to contact the charity
* Email and phone links
* Note that email is preferred
* Note that there is no contact form initially
* CTAs for booking, volunteering, accessibility questions, and donations

### Policy Placeholder Pages

Create simple placeholder pages for privacy policy, cookie policy,
accessibility statement, and terms of use using the exact placeholder copy from
the canonical document.

## Accessibility and Usability

Prioritize accessibility for older visitors, carers, care home staff, and
volunteers:

* Use semantic landmarks: `header`, `main`, `nav`, `section`, and `footer`
* Add skip link support
* Use visible focus states for links and buttons
* Keep text contrast strong, especially red-on-white and white-on-red CTAs
* Use descriptive link text instead of repeated ambiguous labels
* Make phone and email links machine-readable with `tel:` and `mailto:` URLs
* Avoid text over busy images unless contrast is guaranteed
* Test at mobile, tablet, and desktop widths
* Keep navigation usable without JavaScript where possible

## SEO and Metadata

Update metadata in [app/layout.js](../app/layout.js) and per-page metadata where
useful:

* Site title: `The EDDIE Bus | Accessible group transport in Bromsgrove`
* Description focused on accessible minibus transport for Bromsgrove care homes,
  residential groups, retired activity groups, and specialist groups
* Page titles matching canonical page names
* Open Graph metadata using the logo or selected bus image
* Consistent trailing slash routes through existing Next.js configuration

## Implementation Phases

### Phase 1: Foundation

* Move shared site constants into `src/content/site.js`.
* Add shared layout components for header, footer, contact panel, CTA buttons,
  page intros, and content sections.
* Replace the placeholder global styles with the new design foundation.
* Preserve `output: 'export'` and verify no server-only features are introduced.

### Phase 2: Core Pages

* Build Home, How to Book, Contact Us, and Passenger & Accessibility Policy.
* Add all high-priority contact, charge, booking, capacity, and responsibility
  content.
* Add reusable callout and summary panel patterns.

### Phase 3: Supporting Pages

* Build About Us, Volunteering, and Places to Visit.
* Add grouped destination lists and volunteering CTAs.
* Add policy placeholder pages and footer links.

### Phase 4: Assets and Design Polish

* Translate the Google Stitch design into the local component system, using the
  screenshots and `DESIGN.md` tokens as the visual source.
* Copy approved images into `public/images/` with descriptive names.
* Add responsive image treatments and alt text.
* Tune spacing, typography, navigation behavior, and mobile layout.

### Phase 5: Verification

* Run `npm run build` to confirm static export works.
* Manually inspect key routes in development.
* Check mobile and desktop layouts.
* Validate keyboard navigation and visible focus states.
* Confirm no booking form, API route, server action, or backend dependency was
  added.

## Open Questions

* Which Stitch details should be treated as mandatory rather than directional,
  especially the large rounded image cards and bento-style content panels?
* Which supplied vehicle photos from the Stitch export should be promoted into
  `public/images/` for production use?
* Should the duplicated and typo-prone text in the canonical source be corrected
  during implementation, or must it remain exact until the source document is
  updated?
* Should the primary navigation order follow the canonical primary navigation or
  the later recommended page order where Volunteering appears before Places to
  Visit?
* Should the website include a visible charity registration badge-style element
  near CTAs, or keep it in supporting copy and footer only?

## Acceptance Criteria

* All pages listed in the canonical document exist as static routes.
* The seven main pages are linked from the primary navigation.
* The four policy placeholder pages are linked from the footer.
* Contact details, charity number, charge, minimum charge, payment method,
  cancellation terms, service area, eligibility, and accessibility capacity are
  visible and easy to find.
* The site uses `public/logo.png` and approved bus imagery with accessible alt
  text.
* The site builds successfully with `npm run build` and produces static output.
* The implementation does not add any backend-only Next.js features.