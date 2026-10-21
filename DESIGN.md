---
name: CityMETER Search Lab
description: The implemented CityMETER map workspace with a scoped fuzzy-search and investigation extension.
colors:
  interaction-accent-dark: "#68C4E2"
  interaction-accent-light: "#176B82"
  surface-canvas-dark: "#11191D"
  surface-canvas-light: "#F6F7F3"
  surface-alt-dark: "#172126"
  surface-alt-light: "#EEF1EE"
  surface-card-dark: "#20292D"
  surface-card-light: "#FCFCFA"
  surface-raised-dark: "#293337"
  surface-raised-light: "#FFFFFF"
  surface-soft-dark: "#2B3534"
  surface-soft-light: "#E5E9E6"
  surface-blue-tint-dark: "#18333E"
  surface-blue-tint-light: "#E2E9ED"
  text-primary-dark: "#F1F4EF"
  text-primary-light: "#182327"
  text-secondary-dark: "#C4CECA"
  text-secondary-light: "#5F635A"
  text-metadata-dark: "#A6B5B1"
  text-metadata-light: "#5C6A61"
  text-disabled-dark: "#71817D"
  text-disabled-light: "#A7B3A9"
  border-hairline-dark: "#33403D"
  border-hairline-light: "#DCE1DD"
  border-default-dark: "#46524F"
  border-default-light: "#C9D0CB"
  border-emphasis-dark: "#7C8A84"
  border-emphasis-light: "#7D877F"
  danger-ink-dark: "#FF7C72"
  danger-ink-light: "#B43A3A"
typography:
  identity:
    fontFamily: 'Arvo, serif'
    fontSize: "20px"
    lineHeight: 1.2
  workspace-heading:
    fontFamily: 'IBM Plex Sans Thai Looped, Bai Jamjuree, sans-serif'
    fontSize: "23px"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "0"
  review-heading:
    fontFamily: 'IBM Plex Sans Thai Looped, Bai Jamjuree, sans-serif'
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.45
  body:
    fontFamily: 'Bai Jamjuree, sans-serif'
    fontSize: "15px"
    lineHeight: 1.6
  result-name:
    fontFamily: 'Bai Jamjuree, sans-serif'
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.65
  label:
    fontFamily: 'Bai Jamjuree, sans-serif'
    fontSize: "14px"
    fontWeight: 600
  metadata:
    fontFamily: 'Bai Jamjuree, sans-serif'
    fontSize: "12px"
  code:
    fontFamily: 'JetBrains Mono, monospace'
    fontSize: "0.9em"
rounded:
  reason: "4px"
  control: "10px"
  panel: "16px"
  pill: "999px"
spacing:
  compact: "4px"
  small: "8px"
  medium: "12px"
  regular: "16px"
  section: "24px"
  wide: "32px"
components:
  button-default:
    backgroundColor: "{colors.surface-card-dark}"
    textColor: "{colors.text-primary-dark}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  button-hover:
    backgroundColor: "{colors.surface-soft-dark}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary-dark}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  search-field:
    backgroundColor: "{colors.surface-raised-dark}"
    textColor: "{colors.text-primary-dark}"
    rounded: "{rounded.panel}"
  result-selected:
    backgroundColor: "{colors.surface-blue-tint-dark}"
    textColor: "{colors.text-primary-dark}"
    rounded: "{rounded.control}"
    padding: "14px 12px"
  match-reason:
    backgroundColor: "{colors.surface-alt-dark}"
    textColor: "{colors.text-secondary-dark}"
    rounded: "{rounded.reason}"
    padding: "1px 6px"
  scope-control:
    backgroundColor: "{colors.surface-alt-dark}"
    textColor: "{colors.text-primary-dark}"
    rounded: "{rounded.pill}"
    padding: "4px"
  demo-navigation:
    textColor: "{colors.text-secondary-dark}"
  triage-container:
    backgroundColor: "{colors.surface-card-dark}"
    textColor: "{colors.text-primary-dark}"
    rounded: "{rounded.panel}"
    padding: "24px"
---

# Design System: CityMETER Search Lab

## Overview

**Creative North Star: "CityMETER map workspace"**

This name records the incumbent interface the scoped task preserves; it is not a newly proposed brand metaphor. The search panel, map and contextual explanation form a practical geographic workspace. The extension adds understandable match reasons, comparison limits, explicit problem reporting and an investigation surface while keeping that workspace recognizable.

Dark is the implemented default. Search and review also offer light and system-following themes; administration currently uses dark. The interface uses restrained tonal surfaces, readable Thai names and ordinary controls. Selected rows gain a quiet background; borders separate useful content. No new visual direction, comp, brand slogan or system-wide prohibition is created by this record.

**Key Characteristics:**

- A persistent map workspace with source context beside search results.
- Canonical names, administrative parents and match reasons remain legible together.
- Flat tonal layers, hairline separators and visible keyboard outlines.
- Thai-led content with source English names and explicit evidence limits.

**Authority and coverage.** This is an implementation record for `site/index.html`, `site/review.html`, `site/admin.html`, `site/styles.css` and `site/admin.css`. Runtime token authority is the checked-in LDS 0.9.7 CSS, not a new palette in this document. Frontmatter lists the observed reusable values; component previews use the existing semantic CSS aliases and fall back to the default dark values. The light counterparts above are exact supplied tokens, not derived transformations.

LDS release is `v0.9.7-owner.1`, color set `color-srgb-10`, standalone revision `standalone-0.9.7-r1`, document ID `lds-0.9.7-landometer-standalone-r1`. The standalone SHA-256 is `d3085cbc0a50195f1cbf0c77b1d77c0d19b84364daf2948eb367348d65432d96`; local release-manifest SHA-256 is `0a936393fc1ab05f8b32110397546b2a87cc26e46f2661a712bdd2debaa58516`. This is an unsigned owner-approved distribution, not a new signed certificate.

The local LDS package verifier passed 9,768/9,768 checks during this documentation pass. Its scope is package parity, analytical math, CSS projection and document consistency, with advisory warnings; it does not certify this app. The existing [artifact check](evidence/lds-artifact-check.json) passed its declared static scope and explicitly sets `fullConformance: false`. The refreshed [asset manifest](evidence/asset-manifest.json) lists the 28 LDS files actually shipped under `site/assets/lds`; all 28 match its recorded hashes and byte lengths. Unused example, motif, generation and candidate-logo files are excluded.

Existing desktop-dark typo, mobile-light English and mobile-admin-confirmed screenshots were visually inspected for this record. They demonstrate those captured states only. This documentation pass did not run a new browser interaction, exhaustive contrast audit, English-language localization, hosted backend check or deployment verification.

**Release-coordinator evidence, separate from this design scan.** The demo is now published at [landometer-fuzzy.netlify.app](https://landometer-fuzzy.netlify.app/). [Live static verification](evidence/live-static-verification.json) records 45 asset MIME/bytes/SHA-256 checks and three HTML MIME/text checks for deployed functional source `444899dedd7fee3f49d92f2a74f93b9bd53ddc81`; use its timestamp and deployment identity for the checked delivery round. The host's pretty-URL rewrites and injected toolbar prevent an HTML byte-parity claim. The [first deployment receipt](evidence/first-production-deploy.json) records the applied production migration and accepted provider rate-limit rule.

The secret-enabled deployment `6ad81f1a8da7427955117741` passed 13/13 hosted API QA checks for authentication, statistics storage, QA-report creation/readback, QA confirmation and case export. The earlier marked public-UI report read back with the same eight IDs and result count. The [final ready deployment](evidence/final-production-deploy.json), `6ad8200835d0d1a4cb0aa9d8`, published at `2026-10-21T02:14:57.212Z` from the same functional source, passed 9/9 GET-only preservation checks for the same QA UUID/version/confirmed history, exact case export and aggregate counts. Anonymous-event persistence was checked at aggregate level only. The [backend verification receipt](evidence/production-backend-verification.json) also records real-browser administration login/readback of two QA reports and two statistics episodes, with the password field cleared. The two labelled synthetic QA reports remain stored. These bounded operational checks do not establish real-user accuracy, human investigation, load capacity or a new visual certification. A documentation-only `[skip netlify]` commit may advance Git HEAD without changing the verified runtime source.

The owner approved the provider-required Production-only secret configuration on the current Free account: Builds + Functions + Runtime scopes, with Post processing and other deploy contexts excluded and no plan upgrade. This deployment configuration adds no visual token or UI credential field beyond the existing administration login. Secret values remain outside this document and public source.

## Colors

The application uses the supplied foundation palette: dark blue-green neutrals by default, pale neutral counterparts in light mode, and a restrained interaction accent.

### Primary

- **Interaction accent:** links, the input caret, focus rings and the existing map markers. The exact dark/light pair is in the frontmatter. `--interaction-focus-ring` resolves to the same supplied pair.
- **Selection tint:** selected result rows, selected complaint rows and the new-comparison column use `--surface-blue-tint`; text and context continue to identify state without relying on hue alone.

### Neutral

- **Canvas:** the page and search panel.
- **Alternate surface:** segmented-control track, explanatory backgrounds and match reasons.
- **Card surface:** insight panel, map controls and administration investigation container.
- **Raised surface:** text fields, selected scope and menu content.
- **Soft surface:** button hover state.
- **Primary, secondary and metadata ink:** hierarchy between source names, explanations and supporting context.
- **Hairline, default and emphasis borders:** list/table separation, bounded controls and the main search-field boundary.
- **Disabled ink:** the existing disabled-button treatment. Its use is a state treatment, not proof of body-text contrast.

### Semantic

- **Danger ink:** load errors and the explicitly destructive administration action. Use the supplied semantic foreground pair; do not recolor ordinary search suggestions as errors.

**The Source Color Rule.** Use the supplied semantic aliases and exact LDS values. Do not synthesize tonal ramps or transform analytical colors to suit a theme. No quantitative scale is newly introduced by this search extension.

OpenStreetMap tiles retain their native pixels in both UI themes. UI controls are themed separately; a dark interface does not recolor the underlying map.

## Typography

**Heading Font:** IBM Plex Sans Thai Looped, with Bai Jamjuree and sans-serif fallbacks.
**Body Font:** Bai Jamjuree, with a sans-serif fallback.
**Identity Font:** the supplied Arvo face for the existing live-text `Landometer` link.
**Code Font:** JetBrains Mono for actual inline code in the review.

The self-hosted font files are loaded through `site/assets/lds/build-kit/fonts.css`; the supplied looped heading family includes Thai and Latin 700, and Bai Jamjuree includes Thai and Latin 400/600. Preserve these binaries. Do not substitute system display lettering or present the live-text identity as approved logo artwork.

### Hierarchy

- **Workspace heading:** the compact search title uses the frontmatter `workspace-heading` role; it is not a landing-page display headline.
- **Review heading:** the review title uses the `review-heading` role and reduces to 28px at the narrow breakpoint.
- **Section headings:** search sections use 18px; the review uses 24px, reducing to 22px on narrow screens. Administration uses a 32px page title, 27px at its narrow breakpoint, and 22px section titles.
- **Body:** the frontmatter body role supports the dense workspace. Review paragraphs and list items use a more open line-height of 1.9.
- **Results:** the source name is 16px/600 with line-height 1.65; geographic context and match reasons use metadata scale and wrap long content.
- **Controls and metadata:** labels are 14px/600; supporting hints are generally 12px. Comparison counts use tabular numerals. Monospace stays with code, not a decorative technical voice.

The workspace uses fixed panel measures rather than a 65–75ch article measure. The review has a bounded article container. These observed measures are not a new brand-wide text-width rule.

## Layout

At desktop widths, the 76px header sits above a three-column workspace: 400px search, a flexible map with at least 280px, and 300px context. Search and context panels scroll within the viewport. At 1600px and wider, the side panels expand to 440px and 340px and the map minimum becomes 400px.

At widths up to 1199px, the search panel is 380px and spans the map/context rows; the map uses 60dvh with a 420px minimum and the context continues beneath it. At widths up to 749px, the header becomes 64px and the page becomes one column: search, comparison/details/coverage, then map. The final order is intentional in the current stylesheet. The map uses 48dvh with a 360px minimum; results have a bounded 540px scroll region. Desktop navigation collapses into the existing menu.

The administration page is bounded at 1280px, with a complaint list beside the investigation form. At 900px and narrower, it becomes one column and its statistics strip becomes two columns. Review content is bounded at 920px with 32px desktop and 16px narrow horizontal padding. Wide tables scroll in a named, focusable region, with a visible scrolling hint, focus ring and left/right arrow-key support from `site/table-scroll.js`.

The repeated spacing steps in the frontmatter describe observed grouping, not a newly normalized spacing system. Primary controls have a 44px minimum target. Thai and English names use wrapping where the source can be long.

## Elevation & Depth

The custom interface is flat. Tonal surfaces and meaningful one-pixel boundaries establish depth; map context, menus, clusters and selected markers explicitly suppress shadows. There is no reusable custom shadow vocabulary to extract. Leaflet's vendor presentation remains a separate dependency and should be checked in the rendered map rather than promoted to a new LDS elevation rule.

No authored entrance animation is introduced by this extension. The existing reduced-motion rule disables transitions and smooth scrolling. Preserve usable already-visible content; this record does not invent motion tokens.

## Shapes

Small match-reason labels use the compact reason radius. Ordinary fields, selected result rows and supporting messages use the control radius. The main search enclosure, menus, map context and investigation container use the panel radius. Pills belong to compact action/scope controls. Result and complaint lists otherwise use straight separators, keeping lists readable without a grid of cards.

Map clusters and point markers are geometric map marks. Their shape is functional; it is not an illustration or a new brand motif. Decorative brackets and colored side rails are excluded by the owner's persistent preference.

## Components

### Buttons

Quiet, clearly labelled actions use a supplied surface, a default border and pill shape, with 8px/16px padding and a 44px minimum height. Hover uses the soft surface; secondary actions have a transparent background. Keyboard focus is a visible 2px interaction ring with a 4px offset. Disabled buttons use disabled ink and a waiting cursor. The destructive delete action also uses danger ink and is backed by explicit confirmation in the administration flow.

### Chips

Match-reason labels explain why a source record appears. They use alternate surface, secondary ink, the reason radius and 1px/6px padding. They are explanatory text, not confidence percentages or independent actions. Do not turn the incidental experiment badge into a general eyebrow/heading pattern.

### Cards / Containers

The administration investigation container uses the card surface, default one-pixel border, panel radius and 24px padding, reducing to 20px/16px at its narrow breakpoint. Map context and menus share bounded flat surfaces. These are functional containers; the public workspace remains panel/list based. Avoid extracting incidental nested form enclosures as a reusable card-within-card pattern.

### Inputs / Fields

The main search field is a raised surface with an emphasis border, panel radius and 56px minimum height. Its inner text input is transparent and borderless. Focus belongs to the enclosing field as a 2px outline with a 3px offset. The labelled combobox controls the results list; active keyboard movement and explicit selection are separate states. Escape hides the results and clears the active keyboard row; focus, click or arrow navigation reopens current results. Enter confirms the active result while keeping the still-visible list expanded. Result-count updates use a polite live status.

Ordinary inputs/selects use a raised surface, default border, control radius and 44px minimum height. Placeholder text uses metadata ink and the caret uses the interaction accent. Selection color and scrollbar colors are explicitly themed in the existing CSS.

### Navigation

The header places live-text identity and CityMETER context before the demo links and settings menu. Links have a 44px minimum height and secondary ink. The review header keeps its direct links to search and administration, with GitHub in the settings menu. The compact menu is an ordinary details/summary control, with visible focus and a flat raised menu surface. Navigation does not use colored side rails or decorative brackets. Review date/demo context appears below the H1 rather than as an eyebrow.

### Scope control

The three search modes sit on an alternate-surface pill track. The selected button uses raised surface and primary ink, with `aria-pressed` carrying state. It does not use an accent underline or left edge. Forced-color mode adds a system highlight outline.

### Search results and investigation selection

Search results are full-width list rows with canonical name, type, parent context and a labelled match reason. A selected result uses selection tint and the control radius; keyboard activity has its own inset outline. Text is allowed to wrap. Complaint-list selection uses the same restrained tint and `aria-current` state. Neither state alone asserts that a candidate is the correct entity.

The sidecar contains eight representative self-contained previews of these actual primitives. Preview text is public example/interface copy, not a user complaint; the previews do not call the backend.

## Do's and Don'ts

### Do:

- **Do** preserve the incumbent map workspace while extending the requested search and investigation behavior.
- **Do** bind controls and text to the supplied semantic aliases and preserve exact theme pairs.
- **Do** keep canonical names, administrative context and match reasons visible together.
- **Do** retain visible keyboard focus, explicit selection, wrapping and meaningful table/list boundaries.
- **Do** inspect real Thai and English content at narrow and desktop widths, including new operational states.
- **Do** separate package checks, static checks, inspected captures, live interaction tests and hosted readiness in every handoff.

### Don't:

- **Don't** add decorative brackets or colored left/right rails to navigation, tabs, cards or callouts.
- **Don't** promote incidental eyebrow labels, nested card enclosures or count displays into default page scaffolds.
- **Don't** invent gradients, derived tonal ramps, confidence probabilities or color-coded business/risk claims.
- **Don't** change canonical source names, remove comparison/sample limitations or show local downloads as sent reports.
- **Don't** treat this scoped record as a full LDS certificate, a logo-artwork approval, team activation or a deployment-completion receipt.

Heading eyebrows are excluded from the reusable system. The reviewed cleanup places useful date/demo metadata below the H1. This documentation pass records that source change without claiming a new rendered verification of it.
