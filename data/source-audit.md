# CityMETER fuzzy-search demo: source and coverage audit

Snapshot: 21 October 2026, Asia/Bangkok. Read-only public HTTP requests, without login. No production data or search behavior was changed. The original public page is <https://landometer.com/v3/citymeter?d=placeOfWorship>.

## What is actually indexed

| Corpus | Coverage |
| --- | --- |
| Area names | 17,062 current CityMETER records: 77 provinces, 928 districts, 7,436 subdistricts, 7,774 municipality/local-administration records, 847 locales |
| Worship names | 1,491 real mapped places in 126 selected subdistricts across all 77 provinces |
| Sample religion fields | 1,304 Buddhist; 122 Islam; 64 Christian; 1 Sikh |
| Sample status fields | 1,359 active; 132 abandoned |
| National worship summary | 51,901 records; 38,842 with mapped points; 13,059 admin-only |
| Existing search baseline | 15 captured responses from the current public area-search endpoint |

The point sample is 3.84% of the national mapped corpus. It is a purposive demonstration sample, not a representative national sample. It selects the highest point-count subdistrict in each province, every subdistrict whose summary contains a positive Sikh count, and named metropolitan scopes in central Bangkok, Mueang Chiang Mai and Songkhla. The exact 126 scopes, reason for inclusion, expected count and endpoint are in `sample-scope.json` and `worship-tile-manifest.json`.

The selected scopes contain 1,825 total dataset records. The public point endpoint returns the 1,491 mapped records; the remaining 334 records in these scopes have no mapped point returned. No names or coordinates were fabricated to fill those gaps. The observed public client contract has no national bulk-name endpoint for admin-only worship records.

## Exact public endpoint contract

Base URL: `https://landometer.com/api/v2/citymeter-v3/`.

- `base/info/lv0`: current province identities and area extents.
- `base/info/lv1/{provinceUuid}`: current province, district, subdistrict, municipal/local-administration and locale names. All 77 province responses were captured.
- `base/search?term={encodedQuery}`: actual existing global area search. Fifteen requested queries were captured.
- `place-of-worship/info/lv0`: current national/province/district worship summary.
- `place-of-worship/info/lv1/{provinceUuid}?currentDetailType=S`: current public subdistrict summaries used to choose and verify the sample.
- `place-of-worship/overlay-mvt/0/0/0?inTileType=SUBDISTRICT&inTileId={sourceSubdistrictUuid}`: public mapped display records inside one selected subdistrict. One world tile per explicit subdistrict was used, avoiding a geographic tile sweep.
- `place-of-worship/place?placeId={sourcePlaceId}`: public detail endpoint observed in the live client; not bulk requested for this demo.

The live public client bundle and a retained server source checkout agree on the overlay contract: point display is scoped to selected small areas; province and district overlay scopes are intentionally unavailable. Unsupported country/province scopes were not used to manufacture coverage.

Every successful response is retained locally with exact source URL, completion timestamp, size and SHA-256 in the acquisition manifests. Baseline rows contain exact query, URL, timestamp and public response. Raw captures are local audit evidence and do not need to be published with the playable site.

## Identity, names, parent context and location

- Canonical Thai/English strings and stable source identifiers are retained. Missing English names remain missing. The initial corpus contains only source province `abbrEn` aliases; no invented transliterations.
- POI subdistrict membership is proven by the public overlay query that returned it. Its district is joined by the exact first four digits of its six-digit source subdistrict code, matching a current district record; its province comes from the containing current public province response.
- Municipality/local-administration and locale records receive only their proven province parent. They are not assigned a district, community or service boundary by name similarity or bounding-box proximity.
- Place coordinates use the exact source `lat`/`lon` fields returned with the public display record. The coarsely quantized MVT geometry at zoom 0 is ignored.
- Area map locations are display centers of source Web Mercator extents, converted to WGS84. They are not entrances, addresses, exact polygon centroids or evidence of containment.
- A locale is a CityMETER area record. This demo does not use Locale Insight to infer official population, citizen behavior, religion, need, risk, eligibility or live operations.

Public point fields retained: name, English name when supplied, religion category, status, record unit, temple type, denomination/group, source coordinates, position grade, attraction/foundation boolean flags and proven area context. No private contacts, clergy/official names, personal records, land records or congregation counts are published.

## Validation and comparison limits

All 126 selected point requests succeeded. Each decoded distinct point count exactly equals that subdistrict's refreshed `pointCount`; the union contains 1,491 unique source place IDs and no membership conflicts. All 17,062 area IDs are unique.

The existing search baseline is the actual public **area search**. The new demo searches both areas and a bounded worship-place corpus. A gain from additional place-name/religion retrieval is a scope improvement, distinct from typo tolerance. The demo must report those separately. Static captured baseline responses also cannot establish a network-speed improvement over production.

No-match means a record is absent from this snapshot or below the match threshold. It does not prove that a place does not exist. A source `active` status does not establish live opening hours. National summaries and source statuses have not been independently revalidated against upstream registries.

## Examples actually in the point sample

- วัดพระเชตุพนวิมลมังคลาราม — พระบรมมหาราชวัง, พระนคร, กรุงเทพมหานคร.
- วัดอรุณราชวราราม — วัดอรุณ, บางกอกใหญ่, กรุงเทพมหานคร.
- วัดพระสิงห์ — พระสิงห์, เมืองเชียงใหม่, เชียงใหม่.
- อาสนวิหารอัสสัมชัญ บางรัก — บางรัก, บางรัก, กรุงเทพมหานคร.
- วัดซิกข์ศรีคุรุสิงห์สภา — ตลาดใหญ่, เมืองภูเก็ต, ภูเก็ต.
- มัสยิดกลางจังหวัดมุกดาหาร — มุกดาหาร, เมืองมุกดาหาร, มุกดาหาร.
- วัดพระแก้ว — แพรกศรีราชา, สรรคบุรี, ชัยนาท. This source match must not be silently relabelled as Bangkok's famous temple.

Machine-readable counts and limitations are in `source-audit.json`; normalized frontend inputs are `areas.json`, `places.json`, and `legacy-samples.json`.
