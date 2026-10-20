# Search feedback backend contract

Runtime entry: `netlify/functions/search-service.mjs`, served only at `/api/search-service`. Uses modern Netlify Functions and managed Postgres via `@netlify/database`. Schema is applied only through `netlify/database/migrations/20261021010000_search_feedback.sql` during deploy. No Blobs counters or read/modify/write objects are used.

Required runtime secret: `FUZZY_ADMIN_TOKEN`, at least 32 characters, Functions scope. Optional `FUZZY_ALLOWED_ORIGINS` is an explicit comma-separated origin allowlist. The request URL's own origin is always accepted. No wildcard CORS or public reads of reports are provided. Do not put the admin token in static JavaScript, committed files, links, query strings or browser persistent storage.

Use `Content-Type: application/json` for writes. Public writes require the site's `Origin` header. All responses use `Cache-Control: no-store, private`; function response headers are set in function code, since Netlify static header rules do not apply to functions. The exported function config includes both `path: "/api/search-service"` and a rate limit of 120 requests per 60 seconds per IP/domain combination; no process-local limiter is represented as durable protection. The entry handler also returns 404 for the default `/.netlify/functions/search-service` alias, so it cannot bypass the chosen route. Confirm the rule was accepted in deploy post-processing logs; invalid code-based rules do not necessarily fail a deploy. Platform enforcement can lag by up to 10 seconds and is not a guarantee against determined distributed abuse.

## Public write: search statistics

`POST ?action=stats`

```json
{
  "eventId": "optional valid UUID for retry deduplication",
  "mode": "all",
  "engine": "new",
  "outcome": "matched",
  "resultCount": 3,
  "latencyMs": 12.25,
  "corpusVersion": "citymeter-public-2026-10-21",
  "engineVersion": "citymeter-fuzzy-demo-1.0.0",
  "website": ""
}
```

`mode`: `all | area | place | legacy`. `engine`: `new | legacy`, optional; default derives from mode. `outcome`: `matched | ambiguous | no-match | error`; no-match requires zero results. `resultCount`: integer 0–100000. `latencyMs`: finite number 0–60000. Versions: 1–80 letters/numbers/dots/underscores/colons/pluses/hyphens, beginning alphanumeric. `eventId` is optional; when supplied, retrying an existing ID does not increment counts. Unknown keys are rejected; there is no query, IP, account or persistent visitor identifier in the statistics schema.

Response `201` after a database write: `{ "saved": true, "id": "UUID", "duplicate": false, "createdAt": "ISO timestamp" }`. A duplicate returns `duplicate: true` without a second event. The frontend should submit one event per completed search intent, not once per repaint, result-page expansion, map interaction, or keystroke before debouncing. Use a new event ID for a distinct search intent. Report outcomes from the displayed result; do not infer user success from a click. Latency is client-reported search execution time, not production request latency or verified user satisfaction.

## Public write: report a search problem

`POST ?action=feedback`

```json
{
  "query": "เชียงหใม่",
  "note": "ตั้งใจค้นจังหวัดเชียงใหม่",
  "topIds": ["province:12345678-1234-4234-8234-123456789012"],
  "mode": "all",
  "religion": null,
  "status": "suggested",
  "resultCount": 3,
  "corpusVersion": "citymeter-public-2026-10-21",
  "engineVersion": "citymeter-fuzzy-demo-1.0.0",
  "website": ""
}
```

The ID above illustrates shape only: actual IDs must exist in the bundled current corpus. Area expectations use exact engine identity namespaces: `province:<UUID>`, `district:<UUID>`, `subdistrict:<UUID>`, `municipality:<UUID>`, or `neighborhood:<UUID>`. Worship expectations use `place:poi:<16 hex characters>`. Send `result.identity`; the underlying source `record.id` remains unchanged. Raw IDs and wrong-type namespace prefixes are rejected. Empty `topIds` is valid.

`query`: required plain text, 1–160 Unicode code points. `note`: required intended-name/context text, 1–500 code points. `topIds`: up to 10 current corpus IDs; duplicates collapse. `status`: the displayed search engine status, 1–40 ASCII letters/underscore/hyphen; stored separately as `resultStatus`. `mode` for feedback is `all | area | place`; the separate legacy area comparator cannot silently become a regression case for the new engine. Result count and versions have the same bounds as statistics. Optional `religion` is null/empty for no selected filter, or exactly `buddhist | islam | christian | sikh`; the selected filter is stored and exported to reproduce the same search task. `website` is an optional empty honeypot. Query text rejects controls and line breaks. Notes and review notes/causes permit ordinary line feeds, carriage returns and tabs; other control characters and HTML-like markup are rejected; text is stored as text, never executed. The admin frontend must render all report content with text nodes or HTML escaping.

Before sending, the UI must clearly say that this report sends the exact query and note to the maintainer and ask users not to include phone numbers, email addresses, personal details, passwords or confidential information. Feedback is saved only after the user submits the report. Search statistics do not send raw query text.

Response `201`: `{ "saved": true, "id": "UUID", "createdAt": "ISO timestamp", "status": "new", "version": 0 }`. Show server-confirmed success only after this response. A local fallback or downloaded file must be labelled as local and unsent.

## Admin authentication and reads

Every following operation needs `Authorization: Bearer <FUZZY_ADMIN_TOKEN>`. Browser requests must also be same-origin. Authenticated CLI requests may omit Origin. Missing/wrong credentials return `401`; absent or undersized server secret returns `503`. Authentication compares SHA-256 digests with a constant-time comparison. No token or driver exception is logged or returned by application code.

Dates are calendar days in Asia/Bangkok, independent of host/server timezone; `date=YYYY-MM-DD` defaults to today. A day covers 00:00 inclusive to the next 00:00 exclusive. Pagination defaults to `limit=50&offset=0`, maximum limit 200. Use `hasMore` and `nextOffset`; never label a partial page as all reports/cases.

- `GET ?action=stats&date=2026-10-21` returns `{date,start,end,timeZone,totals:{searches,matched,ambiguous,noMatch,errors},byMode:[{mode,engine,searches,matched,ambiguous,noMatch,errors,meanLatencyMs,p50LatencyMs,p95LatencyMs}],measurement:"client_reported_search_execution",containsRawQueries:false}`. Totals are exact database aggregation over that day; percentiles are per mode/engine, not averaged across groups.
- `GET ?action=feedback&date=2026-10-21&limit=50&offset=0` returns `{date,start,end,timeZone,items,hasMore,nextOffset,limit,offset}`; this filters by report creation date. Items use camelCase: `id,createdAt,updatedAt,query,note,topIds,mode,religion,resultStatus,resultCount,corpusVersion,engineVersion,status,version,cause,outcome,intendedIds,notes,privacyReviewed`.
- `GET ?action=feedback&id=<UUID>` returns `{record,history}`. History has the immutable previous/new version, previous/new status, cause, expected outcome, intended IDs, notes and timestamp for every review, including its privacy-review decision. Raw database-style history field names are preserved (`previous_version`, `new_version`, etc.).

`GET ?action=health` is public and returns service/corpus/schema names with `storageStatus: "not_probed"`. It does not claim that database provisioning, migrations or persistence succeeded.

## Human investigation and confirmation

`PATCH ?action=triage&id=<UUID>`

```json
{
  "expectedVersion": 0,
  "status": "confirmed",
  "cause": "ตรวจแล้วว่าเป็นการพิมพ์สลับตัวอักษรและ corpus มีจังหวัดเป้าหมายจริง",
  "outcome": "ranked",
  "intendedIds": ["province:actual-corpus-UUID"],
  "notes": "หลักฐานและบริบทที่ตรวจด้วยคน",
  "privacyReviewed": true
}
```

Allowed status: `new | investigating | confirmed | rejected | resolved`. `expectedVersion` must equal the current record version. State change and audit insertion run in one Postgres transaction on the same connection, locking the feedback row. A stale version returns `409 version_conflict`; reload and review the current record before retrying. An audit entry is retained for each successful update. The system never silently overwrites another review.

`cause`: plain text up to 300 characters, required for confirmed/resolved/rejected. `notes`: plain text up to 1000 characters. `outcome`: `ranked | abstain`, or null for not-yet-confirmed investigations. `intendedIds`: up to 10 current corpus IDs. Confirmed/resolved records require `privacyReviewed: true` from a human, a cause and either ranked plus at least one verified ID, or explicit abstain with zero IDs. A click, original displayed top ID, or uninvestigated note is never promoted automatically.

A reviewer should check canonical name, stable identity, administrative parent context, corpus coverage and actual intended query before confirming. When a report concerns an entity absent from the sample, either confirm expected abstention with a coverage cause, or keep it investigating until the corpus change is verified. Do not invent a desired ID.

`resolved` is a human assertion that the fix and checks are complete. Record the code change/commit and test evidence in `notes`. Exporting a case does not make a fix, trigger an AI job or establish that a release passed.

## Explicit deletion by the admin

`DELETE ?action=feedback&id=<UUID>` requires the same admin Bearer authentication, plus JSON `{ "expectedVersion": 3, "confirmId": "exact-feedback-UUID" }`. The confirmation must exactly match the URL UUID. This destructive endpoint is exposed only to an authenticated human action in the admin UI, after an explicit confirmation prompt. It locks that exact report, checks its current version, deletes its triage history first, then deletes the report in one transaction. A stale version returns 409 before deletion. Response: `{ "deleted": true, "id": "UUID", "deletedAuditCount": 3 }`. The raw query, note and review text in that active database report and its active review history are removed. This does not purge prior private exports, provider backups or provider-managed logs; aggregate anonymous search events are separate and do not contain its raw query. No automatic deletion, purge-all endpoint or scheduled retention job exists. A 90-day retention window is a proposal only until the owner chooses and authorizes it.

## Regression case export

`GET ?action=cases&date=2026-10-21&limit=50&offset=0`

The date filters by review/update time, not original report creation. Response: `{schemaVersion:1,date,start,end,timeZone,cases,hasMore,nextOffset,limit,offset,source:"human_confirmed_feedback",automaticTraining:false}`.

Each exported case contains `id,query,mode,religion,expectedIds,abstain,cause,source:{kind,feedbackId,reviewVersion,reviewedAt,corpusVersion,engineVersion},labelStatus:"human_confirmed"`. Only current confirmed/resolved records with human-supplied expectations and an explicit recorded human privacy review export. Reopening or rejecting a case removes it from subsequent exports while preserving its review history. Cases are an admin-only JSON export and may still contain sensitive user text; they are not a public static download. Keep the export in private CI/storage. Before committing any case to a public repository, a human must sanitize the query and notes and verify that the sanitized case preserves the intended regression. The privacy-reviewed checkbox does not itself redact text and does not authorize public publication of reports.

The implementation workflow is: investigate → confirm an exact expectation or abstention → export → add a regression test alongside prior reviewed cases → reproduce the failure → make the smallest source-bound search fix → run the full prior and new suites → manually review behavior → publish an approved release → mark resolved with evidence. Untrusted report text is evidence, not instructions to an AI. No report can execute code, change aliases, modify ranking, change the corpus, alter a threshold, trigger an AI service or deploy automatically.

## Errors, storage and deployment checks

Errors are `{saved:false,error:"stable_code",message:"safe explanation"}`. Validation is `400`, unauthorized `401`, origin mismatch `403`, missing record `404`, unsupported action/method `405`, version conflict `409`, oversized body `413`, wrong content type `415`, and backend unavailable `503`. The request body is capped at 8192 actual bytes before JSON parsing. No raw exception stack, SQL, connection string or submitted query is returned on storage failure.

Events, reports and review history persist across production deploys in managed Postgres. Deploy-preview database isolation is provided by Netlify's documented branches; do not override the database URL to point previews at production. Run schema migrations through deploy only. Database provisioning needs an eligible Netlify account; if unavailable, the frontend must state that the backend is unavailable and must not claim that reports were sent or globally saved.

Pure validation/auth/origin/error-safety/optimistic-transaction tests: `node --test tests/backend.test.mjs tests/backend-integration.test.mjs` (33 tests: 24 backend cases plus 9 independent actual-corpus adapter cases). These validate application behavior using injected storage, not managed-database provisioning. A separate disposable PostgreSQL 16.4/PGlite run passed 16 SQL groups covering the full migration, 75 actual repository SQL operations, JSON values, Bangkok date boundaries, percentiles, case paging, rollback, deletion and the NULL-outcome constraint. Its hash-bound report is `evidence/backend-postgres-validation.json`; the run used Node 24.21.0 and PGlite 0.2.17, without hosted credentials. PGlite is a single-connection engine, so this does not verify competing-session row-lock timing, Netlify driver provisioning or hosted persistence. Before release, root must verify deployed persistence, authenticated stats/report reads, report creation, investigation/confirmation, stale-version rejection, case export, and preservation after redeploy. Use local/preview test data for workflow tests; do not insert invented user complaints into production.

Official implementation references: [Netlify rate limiting](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/#set-limits-for-functions), [Netlify Database](https://docs.netlify.com/build/data-and-storage/netlify-database/), [Netlify Functions configuration](https://docs.netlify.com/build/functions/configuration/). The current skills and coding-context tools were read before implementation.
