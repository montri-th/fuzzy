# CityMETER fuzzy demo — implemented resolver contract

Version: `citymeter-fuzzy-demo-1.0.0`; normalizer: `thai-sidecar-1`. This is an isolated browser prototype of a shared resolver. It does not install, change, or measure CityMETER production search. The SQL claims and percentages in the supplied Claude brief are historical author-reported evidence, not measurements of this implementation.

## Inputs and identity

`createEngine(records, {version?})` accepts the fetched area and worship sample records. Each record keeps its source `id`, names, metadata, and verified `parents`. Output `type` is canonical lowercase (`province`, `district`, `subdistrict`, `municipality`, `neighborhood`, `place`); `sourceType` retains the original type. `LOCALE` maps to `neighborhood`, and `POI` maps to `place`. Identity is the pair encoded as `${type}:${id}`. A `poi:` prefix already present inside a source ID is retained. Equal IDs in different types remain distinct; duplicate pairs are counted and the first source record wins.

Source coverage is 17,062 current areas and a 1,491-record worship sample. Province parents come from the containing source province response; subdistrict/district links follow verified source administrative codes. Municipalities and neighborhoods are not invented children of subdistricts. Worship parents come from the sampled subdistrict overlay and verified administrative links. These search identities and links do not create official boundaries, legal eligibility or Locale Insight crosswalks.

Search sidecars never modify displayed canonical names. Terms use source Thai/English names, supplied aliases, source-type prefix variants and category-prefix variants corroborated by worship metadata. Structured aliases must have `verified: true` and must not have `active: false`; string aliases are treated as already approved by the calling data adapter. The shipped data uses structured source-backed province abbreviations. No English translation/transliteration, nickname or spelling correction is silently added to the master.

## API

```js
import {createEngine, normalizeText, key1, key2, boundedDistance} from './search-engine.js';
const engine = createEngine([...areas, ...places]);
engine.search('มัสยิด กรุงเทพมหานคร', {
  mode: 'all',       // 'all' | 'area' | 'place'
  religion: 'islam', // optional source-metadata filter, case-insensitive
  limit: 20,        // 1–500; default 20
  offset: 0
});
engine.legacySearch('เชียงใหม่', {limit: 50, offset: 0});
engine.stats; // records, terms, duplicateIdentities, byType
```

Search returns `results` for the requested page, plus page-local `exact` and `suggestions` arrays. Here `exact` means the direct matching group, including normalized, prefix, substring and source metadata matches. It is not a claim that every direct row is a literal exact name. Every row has `match.kind`, `match.reason`, `match.field`, `match.suggestion` and `match.distance`; matched text/origin and inferred parent interpretations are supplied where relevant.

`total`, `exactTotal` and `suggestionTotal` count deduplicated identities across all pages; `hasMore`, `offset` and `limit` describe continuation. The index version, normalizer version, normalized query, mode, scope, warnings and local engine duration in milliseconds are included. Duration excludes network, initial index creation, UI rendering and the map. A hit's similarity/distance is not a calibrated probability.

`status` is one of `empty`, `invalid_query`, `no_scope_match`, `unresolved`, `suggestions`, `matched`, `resolved`, or `ambiguous`. Resolution examines literal names/verified aliases/exact codes first, then whole-name normalized equality. Prefix and substring results are `matched`; a fuzzy-only result is `suggestions`. Multiple identities at the relevant exact-name tier remain `ambiguous`. `autoSelect` is always `false`, including `resolved`: the demo requires an explicit choice.

## Text processing and retrieval order

1. Shared query/corpus cleanup uses Unicode NFC, lowercase, Thai-to-Arabic digits, hidden-character removal, punctuation/symbol spacing, whitespace collapse, `เเ` → `แ`, decomposed Sara Am repair, and removal of `ฯ` in the sidecar.
2. `key1` additionally removes the specified Thai tone/auxiliary marks, spaces and punctuation. Vowels such as `ิ`, `ึ`, `ุ` remain distinct. Literal canonical matches rank before cleaned equality, then whole `key1` equality.
3. Prefix matching follows exact equality. A substring must have at least three `key1` code points. Numeric-only input uses exact ID/code equality; no numeric prefix, phonetic or edit-distance fallback runs.
4. Suggestions are a fallback only when there are fewer than three direct identities and no literal/alias/code hit. `key2` uses the documented conservative Thai consonant/vowel groups, only as a suggestion feature. It does not merge ข/ค, ถ/ท, ผ/พ or ส/ซ. The English phonetic substitutions in the brief are deliberately not applied without a reviewed English dictionary.
5. OSA Damerau distance counts an adjacent transposition as one edit, using Unicode code points. Query keys of length ≤2 do not receive suggestions; 3–7 allow one edit and ≥8 allow two. Pure Latin keys shorter than four receive no suggestions. Distance is evaluated against the full term only when lengths are close. A bounded incomplete-name fallback requires at least five code points and the same first character, compares a term prefix of query length ±1, and remains a labelled suggestion. For an explicit place category only, a four-code-point phonetic prefix may match a verified category-stripped source term, with the same original first character, as a labelled suggestion (e.g. `วัดอรุน` → `วัดอรุณราชวราราม`). This is exact prefix equality on conservative `key2`, not a general short edit-distance fallback. No unconstrained mid-name fuzzy/trigram fallback runs.
6. Lowercase Kedmanee wrong-layout input can yield a labelled keyboard suggestion when its converted key equals a source term. Shifted-layout and arbitrary transliteration inference are not implemented.
7. Literal candidates are sorted before normalized candidates, before prefix/substrings, before suggestions. Within matching tiers, deterministic distance, type, source name and identity ordering is used. Counts are deduplicated before pagination. There is no hidden top-10 candidate truncation in the new matcher.

Generic category text must not inflate the edit budget. For example, `วัดอรุน` searches the discriminative remainder against verified category-stripped source name sidecars. The preserved full canonical branch accepts exact/normalized equality only when a category/metadata interpretation is present. It cannot turn a longer generic prefix into a larger fuzzy threshold.

## Verified scope and dataset interpretation

Explicit qualifiers recognize province, district, subdistrict, municipality and neighborhood forms, including `จ.`, `อ.`, `ต.`, `จังหวัด`, `อำเภอ`, `เขต`, `ตำบล`, `แขวง` and supported municipal prefixes. A leading qualifier in area/all mode identifies the target area type; in place mode it constrains parents. Qualifier names resolve only through exact cleaned source names or approved alias terms, never phonetic/fuzzy parent guessing. Every candidate must meet all explicit parent identities before ranking. Repeated conflicting parents, unknown parents and contradictory parent combinations cannot broaden to another province. Duplicate parent names retain an ID set until another verified qualifier disambiguates them.

Unlabelled `name + parent` phrases preserve the whole-name interpretation and may add up to four verified parent interpretations. A standalone parent after a place category, or in place mode, can enumerate only verified children. These interpretations are shown in the result metadata. Scope is not inferred from map position or Locale Insight.

Worship category/religion cues include Thai and English temple, mosque, church, Buddhism, Islam, Christianity and Sikh terms. `วัด`/`temple` are broad temple cues: the actual corpus contains a Sikh canonical name beginning with `วัด`. Full canonical names remain searchable independently of category parsing, so names such as `มัสยิดกลางจังหวัดมุกดาหาร` are not broken by an internal word `จังหวัด`. A user-selected religion is always a hard source-metadata filter.

`โบสถ์` is ambiguous between a Christian church and a Buddhist ordination hall. The demo discloses this warning and uses source Christian records plus canonical names containing `โบสถ์`; it does not infer an ordination hall exists at every Buddhist temple. Nested religion cues use source religion, so `วัด อิสลาม` cannot return a guessed Buddhist name. Contradictory explicit religion cues/filters abstain.

Source enums form a closed vocabulary for `templeType`, `denominationGroup`, and `denomination`. `พระอารามหลวง` and `วัดราษฎร์` filter the source field; `วัดร้าง` filters source `status: abandoned`. An `active` source status does not establish opening hours or present-day operation. `registration_only` records retain that label and are not relabelled physical places. A query that returns no sample POI is not evidence that the place does not exist or that the national dataset lacks it.

## Legacy comparison and what it proves

`legacySearch` is labelled **local approximation of the historical area substring resolver**, not a live production measurement. It uses the same area corpus, minimum three raw characters, case-insensitive source name substring matching, exact codes/source abbreviations, approximate historical ordering (including null English ordering), and a cap of ten records per area type. It does not add POI search. The complete result universe and exact live sorting are not recreated by this local comparator. Previously captured live responses must remain separately labelled snapshots with their own retrieval time.

A change from zero area matches to a relevant area can be compared on the same query/corpus. POI matching demonstrates a new capability; it cannot be reported as a measured improvement over live POI search when no comparable live POI search was observed. The independent evaluation file supplies the observed sample numerators/denominators and exposure limitations.

## Worker lifecycle

Create a module worker from `search-worker.js`.

- Init: `{type:'init', records, version?, requestId?}` → `{type:'ready', version, requestId, stats}`.
- Search: `{type:'search', query, options?, version?, requestId}` → `{type:'result', method:'search', version, requestId, result}`.
- Legacy: same request shape with `type:'legacy'` → result from the local baseline.
- Compare: `type:'compare'` → a result message containing `result` and `legacyResult`.
- A mismatched supplied index version returns `{type:'stale',version,requestId}`. Uninitialized, invalid or unsupported requests return `{type:'error',version,requestId,error}` rather than a successful empty list.

The caller must ignore any result whose echoed request ID is not the latest submitted request, whose version differs from the initialized index, or whose query/mode/filter state has changed. Clearing or selecting must invalidate outstanding request IDs. Selection must operate on the exact returned identity, not re-resolve a display name. The worker does not cancel a search already executing; the request/version guards prevent old results from being applied.

## Verification and release limits

`node --test tests/search.test.mjs` passes 38 contract tests. The suite covers normalization, exact/mark collisions, phonetic suggestions, pure numeric abstention, short exact names, transpositions, keyboard input, scoped duplicates and conflicts, source categories/metadata, canonical Sikh naming, pagination, unverified aliases, negative controls, worker stale/error lifecycle, all 77 current province identities, and selected actual worship IDs. A separate full-matrix OSA check passed 29,282 bounded-distance comparisons over a small enumerated alphabet. This validates the tested distance implementation, not Thai user behavior.

The independent reviewer owns a frozen 40-case query manifest and its execution receipt. Those cases and the 38 implementation tests are exposed validation, not a reserved holdout or representative real-user accuracy sample. The full corpus remains indexed during evaluation. No 98.7% claim, probability score, production DB performance claim or national POI recall claim is made. Query handling stays local after data loading; there is no telemetry or feedback upload in this engine. Browser privacy, production query logs, backend capacity, database parity and future alias governance require a separate production implementation.
