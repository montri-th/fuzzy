/** Deterministic local prototype. Identity and source names remain separate from search keys. */
export const ENGINE_VERSION = 'citymeter-fuzzy-demo-1.0.0';
export const NORMALIZER_VERSION = 'thai-sidecar-1';
const AREA_TYPES = ['province', 'district', 'subdistrict', 'municipality', 'neighborhood'];
const TYPE_ORDER = new Map([...AREA_TYPES, 'place'].map((t, i) => [t, i]));
const TYPE_ALIASES = {locale: 'neighborhood', poi: 'place', worship: 'place', placeofworship: 'place'};
const now = () => globalThis.performance?.now?.() ?? Date.now();
const typeOf = value => TYPE_ALIASES[String(value).toLowerCase()] || String(value).toLowerCase();
const identityOf = (type, id) => `${typeOf(type)}:${String(id)}`;
const rawFold = value => String(value ?? '').normalize('NFC').trim().toLowerCase();

export function normalizeText(value) {
  return String(value ?? '').normalize('NFC').toLowerCase()
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff\u00ad]/gu, '')
    .replace(/[๐-๙]/gu, digit => String(digit.charCodeAt(0) - 0x0e50))
    .replace(/เเ/gu, 'แ')
    .replace(/ํ([่-๋]?)า/gu, '$1ำ')
    .replace(/ฯ/gu, '')
    .replace(/[\p{P}\p{S}]/gu, ' ')
    .replace(/\s+/gu, ' ').trim();
}

export function key1(value) {
  return normalizeText(value).replace(/[็-๎ฺ]/gu, '').replace(/[^\p{L}\p{N}\p{M}]/gu, '');
}

const HOMOPHONES = Object.fromEntries([
  ['ศษ', 'ส'], ['ณ', 'น'], ['รฬ', 'ล'], ['ญ', 'ย'], ['ฎ', 'ด'], ['ฏ', 'ต'],
  ['ฐฑฒธ', 'ท'], ['ภ', 'พ'], ['ฆฅ', 'ค'], ['ฌ', 'ช'], ['ฃ', 'ข'],
  ['ใ', 'ไ'], ['ี', 'ิ'], ['ื', 'ึ'], ['ู', 'ุ']
].flatMap(([chars, replacement]) => Array.from(chars).map(char => [char, replacement])));
/** Key2 is a suggestion feature, never a canonical identity or exact-name match. */
export function key2(value) {
  return Array.from(key1(value), char => HOMOPHONES[char] || char).join('');
}

/** Bounded optimal-string-alignment Damerau distance, in Unicode code points. */
export function boundedDistance(left, right, max = 2) {
  const a = Array.from(left), b = Array.from(right);
  if (Math.abs(a.length - b.length) > max) return max + 1;
  if (a.length === 0) return Math.min(b.length, max + 1);
  let prevPrev = null;
  let prev = Array.from({length: b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = new Array(b.length + 1).fill(max + 1);
    row[0] = i;
    const start = Math.max(1, i - max), end = Math.min(b.length, i + max);
    let rowMin = row[0];
    for (let j = start; j <= end; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        row[j] = Math.min(row[j], prevPrev[j - 2] + 1);
      }
      rowMin = Math.min(rowMin, row[j]);
    }
    if (rowMin > max) return max + 1;
    prevPrev = prev;
    prev = row;
  }
  return prev[b.length] <= max ? prev[b.length] : max + 1;
}

const KEDMANEE = Object.fromEntries(Array.from('qwertyuiop[]\\asdfghjkl;\'zxcvbnm,./1234567890-=').map((char, index) => [char, Array.from('ๆไำพะัีรนยบลฃฟหกดเ้่าสวงผปแอิืทมใฝๅ/-ภถุึคตจขช')[index]]));
function keyboardThai(raw) {
  const text = rawFold(raw);
  if (text.length < 4 || !/^[a-z0-9\s\[\]\\;'",.\/=-]+$/u.test(text)) return null;
  const mapped = Array.from(text, char => KEDMANEE[char] || char).join('');
  return /[ก-๛]/u.test(mapped) ? mapped : null;
}

const PREFIXES = [
  {type: 'municipality', pattern: 'เทศบาลตำบล|เทศบาลเมือง|เทศบาลนคร|องค์การบริหารส่วนตำบล|เทศบาล|อบต\\.|ทต\\.|ทม\\.|ทน\\.'},
  {type: 'subdistrict', pattern: 'ตำบล|แขวง|subdistrict|ต\\.'},
  {type: 'province', pattern: 'จังหวัด|province|จ\\.'},
  {type: 'district', pattern: 'อำเภอ|district|เขต|อ\\.'},
  {type: 'neighborhood', pattern: 'ย่าน|neighborhood'}
];
const PREFIX_START = new Map(PREFIXES.map(({type, pattern}) => [type, new RegExp(`^(?:${pattern})\\s*`, 'iu')]));
const PREFIX_PATTERN = PREFIXES.flatMap(({type, pattern}) => pattern.split('|').map(token => ({type, token}))).sort((a, b) => b.token.length - a.token.length);
const PREFIX_RE = new RegExp(`(^|\\s|(?=[จอต]\\.))(${PREFIX_PATTERN.map(p => p.token).join('|')})\\s*`, 'giu');
function prefixType(prefix) {
  return PREFIXES.find(item => new RegExp(`^(?:${item.pattern})$`, 'iu').test(prefix))?.type;
}
function shortName(name, type) {
  const stripped = name.replace(PREFIX_START.get(type) || /$^/u, '').trim();
  return stripped !== name && stripped.length > 0 ? stripped : null;
}

const RELIGION_ALIASES = new Map([
  ['buddhist', 'buddhist'], ['buddhism', 'buddhist'], ['พุทธ', 'buddhist'], ['ศาสนาพุทธ', 'buddhist'], ['พุทธศาสนา', 'buddhist'],
  ['muslim', 'islam'], ['islam', 'islam'], ['islamic', 'islam'], ['อิสลาม', 'islam'], ['ศาสนาอิสลาม', 'islam'],
  ['christian', 'christian'], ['christianity', 'christian'], ['คริสต์', 'christian'], ['คริสต์ศาสนา', 'christian'], ['ศาสนาคริสต์', 'christian'],
  ['sikh', 'sikh'], ['ซิกข์', 'sikh'], ['ศาสนาซิกข์', 'sikh'],
  ['hindu', 'hindu'], ['hinduism', 'hindu'], ['ฮินดู', 'hindu'], ['ศาสนาฮินดู', 'hindu'],
  ['chinese', 'chinese'], ['จีน', 'chinese'], ['ศาสนาจีน', 'chinese']
]);
export function normalizeReligion(value) {
  const normalized = normalizeText(value);
  return RELIGION_ALIASES.get(normalized) || normalized;
}
// These category cues are explicit interpretations, not inferred aliases on official names.
const CATEGORY_CUES = [
  {pattern: /^(?:วัด|temple\b)\s*/iu, religion: null, category: 'temple'},
  {pattern: /^โบสถ์(?!คริสต์)\s*/iu, religion: null, category: 'church-or-ordination-hall'},
  {pattern: /^(?:มัสยิด|mosque\b)\s*/iu, religion: 'islam', category: 'mosque'},
  {pattern: /^(?:คริสตจักร|โบสถ์คริสต์|church\b)\s*/iu, religion: 'christian', category: 'church'},
  {pattern: /^(?:พุทธ(?:ศาสนา)?|buddhist\b|buddhism\b)\s*/iu, religion: 'buddhist'},
  {pattern: /^(?:อิสลาม|islam\b|muslim\b)\s*/iu, religion: 'islam'},
  {pattern: /^(?:คริสต์(?:ศาสนา)?|christian(?:ity)?\b)\s*/iu, religion: 'christian'},
  {pattern: /^(?:ซิกข์|sikh\b)\s*/iu, religion: 'sikh'},
  {pattern: /^(?:ฮินดู|hindu(?:ism)?\b)\s*/iu, religion: 'hindu'}
];
function parseCategory(query) {
  const text = String(query).trim();
  for (const cue of CATEGORY_CUES) {
    const match = text.match(cue.pattern);
    if (match) return {religion: cue.religion, category: cue.category || null, remainder: text.slice(match[0].length).trim(), cue: match[0].trim()};
  }
  return null;
}

function makeTerms(record) {
  const entries = [{text: record.name, field: 'name', origin: 'canonical'}, {text: record.nameEn, field: 'nameEn', origin: 'canonical'}];
  for (const alias of record.aliases || []) {
    if (typeof alias === 'string') entries.push({text: alias, field: 'aliases', origin: 'alias'});
    else if (alias && alias.verified === true && alias.active !== false) entries.push({text: alias.name, field: 'aliases', origin: 'alias'});
  }
  for (const field of ['name', 'nameEn']) {
    const short = shortName(String(record[field] || ''), record.type);
    if (short) entries.push({text: short, field, origin: 'type-prefix'});
  }
  if (record.type === 'place') {
    for (const field of ['name', 'nameEn']) {
      const category = parseCategory(String(record[field] || ''));
      if (category?.remainder && (!category.religion || category.religion === normalizeReligion(record.religion))) entries.push({text: category.remainder, field, origin: 'category-prefix'});
    }
  }
  const seen = new Set();
  return entries.filter(entry => entry.text && !seen.has(rawFold(entry.text)) && seen.add(rawFold(entry.text))).map(entry => {
    const normalized = normalizeText(entry.text), k1 = key1(entry.text);
    return {...entry, text: String(entry.text), literal: rawFold(entry.text), normalized, k1, k2: key2(entry.text), length: Array.from(k1).length};
  });
}

function normalizeRecord(input) {
  const type = typeOf(input.type);
  const name = String(input.name ?? input.nameTh ?? '');
  const parents = (input.parents || []).filter(parent => parent && parent.id != null).map(parent => ({...parent, type: typeOf(parent.type), identity: identityOf(parent.type, parent.id), name: String(parent.name ?? parent.nameTh ?? '')}));
  return {...input, id: String(input.id), sourceType: input.type, type, identity: identityOf(type, input.id), name, parents};
}
function comparison(left, right) {
  return left.rank - right.rank || left.match.distance - right.match.distance ||
    (TYPE_ORDER.get(left.record.type) ?? 99) - (TYPE_ORDER.get(right.record.type) ?? 99) ||
    left.record.name.length - right.record.name.length ||
    left.record.name.localeCompare(right.record.name, 'th') || left.record.identity.localeCompare(right.record.identity, 'en');
}
function outputHit(hit) {
  return {...hit.record, match: hit.match};
}
const MAX_QUERY_LENGTH = 180;

export function createEngine(inputs, config = {}) {
  if (!Array.isArray(inputs)) throw new TypeError('Search index must be an array of records.');
  const version = config.version || ENGINE_VERSION;
  const records = [], byIdentity = new Map();
  let duplicateIdentities = 0;
  for (const input of inputs) {
    if (!input || input.id == null || !input.type) continue;
    const record = normalizeRecord(input);
    if (byIdentity.has(record.identity)) { duplicateIdentities++; continue; }
    byIdentity.set(record.identity, record);
    records.push(record);
  }
  const indexed = records.map(record => ({record, terms: makeTerms(record), religion: normalizeReligion(record.religion)}));
  const scopeNames = new Map(AREA_TYPES.map(type => [type, new Map()]));
  function addScope(entity) {
    const names = scopeNames.get(entity.type);
    if (!names) return;
    const terms = makeTerms({...entity, aliases: entity.aliases || []});
    for (const term of terms) {
      // Parent qualifiers permit only literal/cleaned names and verified aliases; no phonetic guessing.
      const normalized = term.normalized;
      if (!normalized) continue;
      const set = names.get(normalized) || new Set();
      set.add(entity.identity || identityOf(entity.type, entity.id));
      names.set(normalized, set);
    }
  }
  for (const record of records) { addScope(record); record.parents.forEach(addScope); }
  const metadataTerms = [];
  for (const field of ['templeType', 'denominationGroup', 'denomination']) {
    const values = new Set(records.filter(record => record.type === 'place').map(record => record[field]).filter(value => value && value !== 'unknown'));
    for (const value of values) metadataTerms.push({text: String(value), field, value, key: normalizeText(value)});
  }
  metadataTerms.sort((a, b) => b.text.length - a.text.length);
  const stats = {records: records.length, terms: indexed.reduce((sum, row) => sum + row.terms.length, 0), duplicateIdentities, byType: Object.fromEntries([...TYPE_ORDER.keys()].map(type => [type, records.filter(record => record.type === type).length]))};

  function parseQuery(rawQuery, mode) {
    const query = String(rawQuery ?? '').trim();
    const category = mode !== 'area' ? parseCategory(query) : null;
    let conflictingCategoryReligion = false;
    const markers = [];
    PREFIX_RE.lastIndex = 0;
    let match;
    while ((match = PREFIX_RE.exec(query))) markers.push({index: match.index + match[1].length, end: PREFIX_RE.lastIndex, type: prefixType(match[2]), prefix: match[2]});
    let base = markers.length ? query.slice(0, markers[0].index).trim() : query;
    let targetType = null;
    const scopes = [];
    const warnings = [];
    if (category?.category === 'church-or-ordination-hall') warnings.push({code: 'ambiguous_category_term', text: 'โบสถ์', meaning: 'แสดงศาสนาคริสต์และชื่อที่มีคำว่าโบสถ์ตามข้อมูล ไม่อนุมานอุโบสถจากชื่อวัดทุกแห่ง'});
    for (let index = 0; index < markers.length; index++) {
      const marker = markers[index];
      const text = query.slice(marker.end, markers[index + 1]?.index ?? query.length).trim();
      if (index === 0 && marker.index === 0 && mode !== 'place' && !category) {
        targetType = marker.type;
        base = text;
      } else {
        const found = scopeNames.get(marker.type)?.get(normalizeText(text));
        scopes.push({type: marker.type, text, identities: found ? [...found] : [], explicit: true});
        if (!found?.size) warnings.push({code: 'explicit_scope_not_found', text, type: marker.type});
      }
    }
    const canonicalBase = base;
    if (category) base = base.replace(CATEGORY_CUES.find(cue => cue.pattern.test(base))?.pattern || /$^/u, '').trim();
    if (category) {
      const secondary = parseCategory(base);
      if (secondary?.religion && !secondary.category) {
        if (category.religion && category.religion !== secondary.religion) conflictingCategoryReligion = true;
        category.religion = secondary.religion;
        base = secondary.remainder;
      }
    }
    const metadata = [];
    // Source enums form a closed vocabulary; these clauses do not guess missing facts.
    const statusCue = base.match(/^(ร้าง|abandoned|active)(?:\s+|$)/iu);
    if (statusCue) {
      metadata.push({field: 'status', value: /^(?:ร้าง|abandoned)$/iu.test(statusCue[1]) ? 'abandoned' : 'active'});
      base = base.slice(statusCue[0].length).trim();
    }
    for (const term of metadataTerms) {
      const normalizedBase = normalizeText(base);
      const categoryRemainder = category ? parseCategory(term.text)?.remainder : null;
      const keys = [term.key, categoryRemainder ? normalizeText(categoryRemainder) : null].filter(Boolean);
      const matchedKey = keys.find(termKey => normalizedBase === termKey || normalizedBase.startsWith(termKey + ' '));
      if (matchedKey) {
        metadata.push({field: term.field, value: term.value});
        base = normalizedBase.slice(matchedKey.length).trim();
        break;
      }
    }
    const grouped = new Map();
    for (const scope of scopes) {
      if (!grouped.has(scope.type)) grouped.set(scope.type, new Set(scope.identities));
      else grouped.set(scope.type, new Set([...grouped.get(scope.type)].filter(identity => scope.identities.includes(identity))));
    }
    const conflicting = [...grouped.values()].some(set => set.size === 0);
    if (conflicting && !warnings.some(warning => warning.code === 'explicit_scope_not_found')) warnings.push({code: 'conflicting_explicit_scopes'});
    const branch = {text: base, scopes, inferredScope: false, preserveFull: !category && !metadata.length};
    const branches = [branch];
    // Explicit scope is never discarded. Unlabelled parent phrases are a separate, bounded interpretation.
    const words = base.split(/\s+/u).filter(Boolean);
    if (words.length > 1 && words.length <= 10) {
      for (let split = 1; split < words.length && branches.length < 5; split++) {
        const head = words.slice(0, split).join(' '), tail = words.slice(split).join(' ');
        for (const type of ['province', 'district', 'subdistrict']) {
          const found = scopeNames.get(type).get(normalizeText(tail));
          if (found?.size && branches.length < 5) branches.push({text: head, scopes: [...scopes, {type, text: tail, identities: [...found], explicit: false}], inferredScope: true, preserveFull: false});
        }
      }
    }
    if ((mode === 'place' || category || metadata.length) && base) {
      for (const type of ['province', 'district', 'subdistrict']) {
        const found = scopeNames.get(type).get(normalizeText(base));
        if (found?.size && branches.length < 5) branches.push({text: '', scopes: [...scopes, {type, text: base, identities: [...found], explicit: false}], inferredScope: true, preserveFull: false});
      }
    }
    // Preserve literal canonical category names; semantic category branch additionally matches metadata + remaining name.
    if ((category || metadata.length) && canonicalBase) branches.unshift({text: canonicalBase, scopes, inferredScope: false, preserveFull: true});
    return {query, base, category, metadata, targetType, scopes, branches, warnings, invalidScope: conflicting, conflictingCategoryReligion};
  }

  function withinScopes(record, scopes) {
    return scopes.every(scope => scope.identities.some(identity => identity === record.identity || record.parents.some(parent => parent.identity === identity)));
  }

  function search(rawQuery, options = {}) {
    const started = now();
    const mode = ['area', 'place', 'all'].includes(options.mode) ? options.mode : 'all';
    const limit = Math.min(500, Math.max(1, Math.floor(Number(options.limit) || 20)));
    const offset = Math.max(0, Math.floor(Number(options.offset) || 0));
    const parsed = parseQuery(rawQuery, mode);
    const requestedReligion = options.religion ? normalizeReligion(options.religion) : null;
    const religion = parsed.category?.religion || requestedReligion;
    const contradictoryReligion = requestedReligion && parsed.category?.religion && requestedReligion !== parsed.category.religion;
    const normalizedQuery = normalizeText(parsed.query);
    const fullNumeric = /^[0-9]+$/u.test(normalizedQuery);
    const warnings = [...parsed.warnings];
    if (parsed.conflictingCategoryReligion) warnings.push({code: 'conflicting_category_religion'});
    if (contradictoryReligion) warnings.push({code: 'conflicting_religion_filters'});
    const empty = !normalizedQuery && !requestedReligion;
    const overlong = Array.from(parsed.query).length > MAX_QUERY_LENGTH;
    if (overlong) warnings.push({code: 'query_too_long', maxLength: MAX_QUERY_LENGTH});
    const returnResult = (hits, status) => {
      const exactHits = hits.filter(hit => !hit.match.suggestion), suggestionHits = hits.filter(hit => hit.match.suggestion);
      const page = hits.slice(offset, offset + limit).map(outputHit);
      return {query: String(rawQuery ?? ''), normalizedQuery, mode, version, normalizerVersion: NORMALIZER_VERSION,
        results: page, exact: page.filter(hit => !hit.match.suggestion), suggestions: page.filter(hit => hit.match.suggestion),
        total: hits.length, exactTotal: exactHits.length, suggestionTotal: suggestionHits.length,
        hasMore: offset + page.length < hits.length, offset, limit, status, autoSelect: false,
        scope: {targetType: parsed.targetType, parents: parsed.scopes, religion, metadata: parsed.metadata, category: parsed.category?.category || null},
        warnings, timingMs: Math.round((now() - started) * 100) / 100};
    };
    if (empty) return returnResult([], 'empty');
    if (overlong) return returnResult([], 'invalid_query');
    if (parsed.invalidScope || contradictoryReligion || parsed.conflictingCategoryReligion) return returnResult([], 'no_scope_match');
    const eligible = indexed.filter(row => {
      const {record} = row;
      if (mode === 'area' && record.type === 'place') return false;
      if (mode === 'place' && record.type !== 'place') return false;
      if (parsed.targetType && record.type !== parsed.targetType) return false;
      if (requestedReligion && (record.type !== 'place' || row.religion !== requestedReligion)) return false;
      return withinScopes(record, parsed.scopes);
    });
    function matchesInterpretation(row, branch) {
      if (branch.preserveFull) return true;
      const {record} = row;
      if (parsed.category && record.type !== 'place') return false;
      if (parsed.category?.religion && row.religion !== parsed.category.religion) return false;
      if (parsed.category?.category === 'temple' && !(['buddhist', 'sikh', 'hindu'].includes(row.religion) || /^วัด/u.test(record.name) || /temple/iu.test(record.nameEn || ''))) return false;
      if (parsed.category?.category === 'church-or-ordination-hall' && !(row.religion === 'christian' || /โบสถ์/u.test(record.name))) return false;
      if (parsed.metadata.length && (record.type !== 'place' || !parsed.metadata.every(clause => record[clause.field] === clause.value))) return false;
      return true;
    }
    const direct = new Map(), suggestions = new Map();
    function add(map, row, rank, match) {
      const hit = {record: row.record, rank, match: {...match, distance: match.distance || 0}};
      const old = map.get(row.record.identity);
      if (!old || comparison(hit, old) < 0) map.set(row.record.identity, hit);
    }
    const branchKeys = parsed.branches.map(branch => ({...branch, literal: rawFold(branch.text), normalized: normalizeText(branch.text), k1: key1(branch.text), k2: key2(branch.text), length: Array.from(key1(branch.text)).length}));
    for (const row of eligible) {
      const {record, terms} = row;
      // Code and ID branches do not use approximate matching, even after Thai-digit normalization.
      if (normalizedQuery && ((record.code != null && normalizeText(record.code) === normalizedQuery) || normalizeText(record.id) === normalizedQuery || normalizeText(record.identity) === normalizedQuery)) {
        add(direct, row, 0, {kind: 'code', reason: 'รหัสตรงทุกตัว', field: 'code', suggestion: false});
      }
      if (fullNumeric) continue;
      for (const branch of branchKeys) {
        if (!withinScopes(record, branch.scopes) || !matchesInterpretation(row, branch)) continue;
        const context = branch.inferredScope ? {parentInterpretation: branch.scopes.filter(scope => !scope.explicit).map(scope => ({type: scope.type, text: scope.text, identities: scope.identities}))} : {};
        const penalty = branch.inferredScope ? 2 : 0;
        if (!branch.k1) {
          if (religion || parsed.category || parsed.metadata.length || (mode === 'place' && branch.scopes.length)) add(direct, row, 70, {kind: 'category', reason: 'ตรงกับหมวดข้อมูลต้นทาง', field: parsed.metadata[0]?.field || 'religion', suggestion: false, ...context});
          continue;
        }
        for (const term of terms) {
          const aliasPenalty = term.origin === 'canonical' ? 0 : ['type-prefix', 'category-prefix'].includes(term.origin) ? 1 : 2;
          const canonicalOnly = branch.preserveFull && (parsed.category || parsed.metadata.length);
          const extra = {field: term.field, matchedText: term.text, origin: term.origin, suggestion: false, ...context};
          if (term.literal === branch.literal) {
            add(direct, row, 10 + penalty + aliasPenalty, {...extra, kind: term.origin === 'alias' ? 'alias' : 'literal', reason: term.origin === 'alias' ? 'ชื่อเรียกอื่นที่มีแหล่งอ้างอิง' : 'ชื่อตรงทุกตัว'});
          } else if (term.normalized === branch.normalized) {
            add(direct, row, 20 + penalty + aliasPenalty, {...extra, kind: 'normalized', reason: 'ชื่อตรงหลังจัดรูปข้อความ'});
          } else if (term.k1 === branch.k1) {
            add(direct, row, 30 + penalty + aliasPenalty, {...extra, kind: 'normalized', reason: 'ต่างเฉพาะวรรณยุกต์หรือเครื่องหมาย'});
          } else if (canonicalOnly) {
            continue;
          } else if (term.normalized.startsWith(branch.normalized)) {
            add(direct, row, 40 + penalty + aliasPenalty, {...extra, kind: 'prefix', reason: 'ชื่อขึ้นต้นด้วยคำค้น'});
          } else if (term.k1.startsWith(branch.k1)) {
            add(direct, row, 45 + penalty + aliasPenalty, {...extra, kind: 'normalized-prefix', reason: 'ส่วนต้นตรงหลังลดเครื่องหมาย'});
          } else if (branch.length >= 3 && term.normalized.includes(branch.normalized)) {
            add(direct, row, 60 + penalty + aliasPenalty, {...extra, kind: 'substring', reason: 'มีคำค้นอยู่ในชื่อ'});
          } else if (branch.length >= 3 && term.k1.includes(branch.k1)) {
            add(direct, row, 65 + penalty + aliasPenalty, {...extra, kind: 'normalized-substring', reason: 'มีคำค้นหลังลดเครื่องหมาย'});
          }
        }
      }
    }
    const hasLiteral = [...direct.values()].some(hit => ['literal', 'alias', 'code'].includes(hit.match.kind));
    // Fuzzy work is a fallback. Literal results do not need additional guessed identities.
    if (!fullNumeric && !hasLiteral && direct.size < 3) {
      const keyboard = keyboardThai(parsed.base);
      const keyboardKey = keyboard ? key1(keyboard) : null;
      for (const row of eligible) {
        if (direct.has(row.record.identity)) continue;
        for (const branch of branchKeys) {
          if (!withinScopes(row.record, branch.scopes) || !matchesInterpretation(row, branch) || branch.length < 3 || (branch.preserveFull && (parsed.category || parsed.metadata.length))) continue;
          const latinOnly = /^[a-z]+$/u.test(branch.k1);
          if (latinOnly && branch.length < 4) continue;
          const max = branch.length >= 8 ? 2 : 1;
          const context = branch.inferredScope ? {parentInterpretation: branch.scopes.filter(scope => !scope.explicit).map(scope => ({type: scope.type, text: scope.text, identities: scope.identities}))} : {};
          for (const term of row.terms) {
            const extra = {field: term.field, matchedText: term.text, origin: term.origin, suggestion: true, ...context};
            if (term.k2 === branch.k2 && term.k1 !== branch.k1) {
              add(suggestions, row, 90, {...extra, kind: 'phonetic', reason: 'สะกดคล้ายตามคู่เสียงที่กำหนด'});
            }
            if (parsed.category && branch.length >= 4 && term.origin === 'category-prefix' && branch.k1[0] === term.k1[0] && term.k2.startsWith(branch.k2) && term.k1 !== branch.k1) {
              add(suggestions, row, 92, {...extra, kind: 'phonetic-prefix', reason: 'ส่วนต้นสะกดคล้ายตามคู่เสียงที่กำหนด'});
            }
            if (keyboardKey && term.k1 === keyboardKey) {
              add(suggestions, row, 95, {...extra, kind: 'keyboard', reason: 'อาจลืมเปลี่ยนภาษาแป้นพิมพ์', interpretedQuery: keyboard});
            }
            if (Math.abs(term.length - branch.length) <= max) {
              const distance = boundedDistance(branch.k1, term.k1, max);
              if (distance > 0 && distance <= max) add(suggestions, row, 100 + distance + (branch.k1[0] !== term.k1[0] ? 1 : 0), {...extra, kind: 'typo', reason: `ชื่อใกล้เคียง (${distance} จุด)`, distance});
            }
            // A bounded incomplete-name suggestion. First character must agree, so broad mid-name guesses remain off.
            if (branch.length >= 5 && term.length > branch.length && branch.k1[0] === term.k1[0]) {
              const chars = Array.from(term.k1);
              let distance = max + 1;
              for (const length of [branch.length - 1, branch.length, branch.length + 1]) distance = Math.min(distance, boundedDistance(branch.k1, chars.slice(0, length).join(''), max));
              if (distance > 0 && distance <= max) add(suggestions, row, 120 + distance, {...extra, kind: 'fuzzy-prefix', reason: `ส่วนต้นใกล้เคียง (${distance} จุด)`, distance});
            }
          }
        }
      }
    }
    const hits = [...direct.values()].sort(comparison).concat([...suggestions.values()].filter(hit => !direct.has(hit.record.identity)).sort(comparison));
    const literalHits = hits.filter(hit => ['literal', 'alias', 'code'].includes(hit.match.kind));
    const resolutionHits = literalHits.length ? literalHits : hits.filter(hit => hit.match.kind === 'normalized');
    const status = resolutionHits.length > 1 ? 'ambiguous' : resolutionHits.length === 1 ? 'resolved' : direct.size ? 'matched' : suggestions.size ? 'suggestions' : parsed.scopes.length ? 'no_scope_match' : 'unresolved';
    return returnResult(hits, status);
  }

  function legacySearch(rawQuery, options = {}) {
    const started = now();
    const query = String(rawQuery ?? '').trim();
    const needle = rawFold(query);
    const limit = Math.min(500, Math.max(1, Math.floor(Number(options.limit) || 50)));
    const offset = Math.max(0, Math.floor(Number(options.offset) || 0));
    let hits = [];
    if (query.length >= 3) {
      for (const type of AREA_TYPES) {
        const found = indexed.filter(({record}) => record.type === type && (
          rawFold(record.name).includes(needle) || (record.nameEn && rawFold(record.nameEn).includes(needle)) ||
          String(record.code ?? '').toLowerCase() === needle ||
          record.aliases?.some(alias => (typeof alias === 'string' ? alias : alias?.verified === true ? alias.name : '')?.toLowerCase() === needle)
        ));
        // Approximate the historical per-level ordering, including NULL English values before non-NULL ties.
        found.sort((a, b) => Number(String(b.record.code ?? '').toLowerCase() === needle) - Number(String(a.record.code ?? '').toLowerCase() === needle) ||
          Number(rawFold(b.record.name).includes(needle)) - Number(rawFold(a.record.name).includes(needle)) ||
          Number(b.record.nameEn == null) - Number(a.record.nameEn == null) ||
          a.record.name.localeCompare(b.record.name, 'th') || a.record.identity.localeCompare(b.record.identity, 'en'));
        hits.push(...found.slice(0, 10).map(row => ({...row.record, match: {kind: 'legacy-substring', reason: 'ชื่อมีคำค้น / รหัสตรง (แบบเดิมจำลอง)', suggestion: false, distance: 0}})));
      }
    }
    const page = hits.slice(offset, offset + limit);
    return {query, results: page, exact: page, suggestions: [], total: hits.length, exactTotal: hits.length, suggestionTotal: 0, offset, limit,
      hasMore: offset + page.length < hits.length, status: query.length < 3 ? 'too_short' : hits.length ? 'matched' : 'unresolved',
      autoSelect: false, version: 'legacy-local-approximation-1', timingMs: Math.round((now() - started) * 100) / 100,
      baseline: {kind: 'local-approximation', liveMeasurement: false, minCharacters: 3, capPerType: 10, scope: 'area-only',
        label: 'จำลองการค้นพื้นที่แบบเดิมจากกติกาในเอกสาร ไม่ใช่การวัด production ปัจจุบัน'}};
  }
  return {search, legacySearch, stats, version};
}
