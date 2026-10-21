# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The confirmed scope is people trying CityMETER area and worship-place search, and maintainers who investigate reported search problems. No audience research, user-volume estimate, customer segment or production adoption result is established by this demo.

## Product Purpose

Build a separate, reviewable CityMETER fuzzy-search demonstration from the supplied Claude proposal, with Thai/English search, a map, an honest comparison with the former area search, and a maintained feedback loop. The owner requested publication in `montri-th/fuzzy` and a working web backend for statistics, complaints, human investigation and AI-assisted changes protected by regression tests.

The demo extends the existing CityMETER map workspace. It does not change `landometer.com` production. The intended result is that a person can inspect a plausible match, see its geographic context and choose explicitly; a maintainer can turn an investigated failure into a reproducible test before changing search behavior.

## Operating Context

The public experience contains search, results, map context, a previous-search comparison and an implementation review. Reporting a problem sends the exact query and the user's note only after an explicit submission. The authenticated administration experience supports daily statistics, complaint investigation and export of human-confirmed test cases.

The improvement workflow is report → human investigation → verified expected result or abstention → regression case → proposed AI-assisted code change → all previous and new checks → reviewed release. Complaints and result clicks do not create approved labels or trigger automatic changes.

The separate demo is published at [landometer-fuzzy.netlify.app](https://landometer-fuzzy.netlify.app/) from [montri-th/fuzzy](https://github.com/montri-th/fuzzy). This publication does not replace CityMETER production. Authenticated hosted API workflow QA, browser administration login and preservation across a further redeploy have passed the bounded checks recorded in the release evidence.

## Capabilities and Constraints

- The shipped area corpus contains 17,062 source records. The worship corpus contains 1,491 real sample places from 126 subdistricts across 77 provinces; it is a purposive sample, not national coverage of all 51,901 source records.
- Canonical names, IDs, coordinates, religion and geographic context come from source data. Search normalization must not rewrite the displayed canonical name or invent a place or coordinate.
- Search separates areas, worship places and interpretation of dataset categories. Similar names need explicit user selection and visible context.
- Fifteen former area-search responses were captured on 21 October 2026. Other comparisons use a labelled local approximation over the same corpus. A new place-search capability cannot be presented as measured improvement over an unobserved former place search.
- Search execution is local after data loading. Application statistics contain outcome, result count, execution time and versions; they exclude raw query, IP and account fields. Hosting-provider access logs have a separate scope.
- Raw query, filters and complaint text are stored on explicit submission. Private exports require another privacy review and sanitization before any public repository use.
- The owner manages the administration credential. It must remain outside public source, URLs, static bundles and persistent browser storage. For this Free account the owner approved a Production-only secret with Builds, Functions and Runtime scopes because the provider UI requires those scopes together; Post processing and other deploy contexts are excluded. This approval does not authorize publishing the secret or upgrading the plan.
- The backend uses managed Postgres through Netlify Functions in the owner-authorized `landometer-fuzzy` project, Montri team. Deployed functional source `444899dedd7fee3f49d92f2a74f93b9bd53ddc81` has final ready deployment `6ad8200835d0d1a4cb0aa9d8`, published at `2026-10-21T02:14:57.212Z`; the production migration was applied and provider rate-limit post-processing was verified. Thirteen hosted QA checks passed for authentication, database statistics, QA-report creation/readback, QA confirmation and case export. The earlier marked public-UI QA report read back with its original eight IDs and result count. After redeploy, nine GET-only checks passed for the same complaint UUID/version/confirmed history, exact case export and aggregate counts; anonymous-event persistence was checked at aggregate level only. Browser administration login also read the two QA reports and two statistics episodes, with the password field cleared. The two clearly labelled synthetic QA reports remain stored. These are operational test records, not user complaints, real human investigation, human-labelled accuracy or a load test.
- The existing check command runs unit/API adapter checks and 40 fixed search cases. A passing exposed case set is not representative real-user accuracy or proof of production readiness.
- Administrators can explicitly delete a complaint and its active review history. This does not erase exports or provider backups. Automatic deletion and a final retention policy are not implemented.

## Brand Commitments

Use Landometer Design System 0.9.7, release `v0.9.7-owner.1`, and the supplied governed fonts and portfolio icons. Preserve the incumbent CityMETER map workspace; this is a scoped functional extension, not an identity replacement. The current implementation uses the governed live-text `Landometer` identity and excludes artwork whose role remains a candidate.

The owner's persistent requirements prohibit decorative bracket-shaped highlights and colored left rails on navigation, tabs, cards and callouts. Keep visible keyboard focus and review actual Thai and English content at narrow and desktop widths. Shared design-system assets do not establish product facts, legal authority or team-wide activation.

## Evidence on Hand

- [README](README.md): implementation scope, source counts, privacy, operations, checks, hosting prerequisites and current limits; the factual basis for this product record alongside the owner's request.
- [Algorithm contract](algorithm-contract.md), [backend contract](backend-contract.md) and [investigation playbook](docs/investigation-playbook.md): implementation details and maintainer procedure; do not silently expand the product promises above.
- [Source audit](data/source-audit.md), [public review](site/review.html) and [evaluation evidence](evidence/independent-evaluation.json): source and exposed test evidence, with sample limits.
- [Design record](DESIGN.md): current scoped visual implementation and its actual verification coverage.
- [Live static verification](evidence/live-static-verification.json): 45 asset MIME/bytes/SHA-256 checks and three HTML MIME/text checks at source `444899dedd7fee3f49d92f2a74f93b9bd53ddc81`; HTML byte parity is not claimed because the host transforms links and adds its toolbar.
- [First production deployment](evidence/first-production-deploy.json): ready deploy, migration and provider rate-limit receipt; its initial missing-admin-secret state is historical and must not be substituted for a later authentication check.
- [Final production deployment](evidence/final-production-deploy.json) and [production backend verification](evidence/production-backend-verification.json): final deploy identity and bounded hosted QA/persistence evidence. A documentation-only `[skip netlify]` commit may advance Git HEAD while the verified functional source remains unchanged.

There are no established testimonials, representative production success rates, load-test results, pricing promises or business-outcome claims in this product record.

## Product Principles

- Preserve source identity and distinguish a matching suggestion from a verified entity.
- Show source coverage and comparison limits where they affect interpretation.
- Require human investigation before a complaint becomes a regression expectation.
- Preserve earlier regression cases when improving behavior.
- Keep operational records and credentials private while making the demonstration and its methods reviewable.

## Open Decisions

The owner must select a retention policy before broader use. Integration into CityMETER production, representative human-labelled evaluation, load targets and expansion beyond the current sample remain unestablished. Successful bounded hosted checks do not establish those wider claims.
