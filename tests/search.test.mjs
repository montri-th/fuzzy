import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createEngine, normalizeText, key1, key2, boundedDistance, ENGINE_VERSION} from '../site/search-engine.js';

const province = (id, name, code) => ({id, type:'PROVINCE', name, code});
const parent = record => ({id:record.id, type:record.type, name:record.name, nameEn:record.nameEn});
const chiangMai = {...province('cm','เชียงใหม่','50'), nameEn:'Chiang Mai', aliases:[{name:'CMI',verified:true}]};
const chiangRai = {...province('cr','เชียงราย','57'), nameEn:'Chiang Rai'};
const districtA = {id:'d1',type:'DISTRICT',name:'เมือง',code:'5001',parents:[parent(chiangMai)]};
const districtB = {id:'d2',type:'DISTRICT',name:'เมือง',code:'5701',parents:[parent(chiangRai)]};
const fixture = [chiangMai,chiangRai,districtA,districtB,
  {id:'p1',type:'POI',name:'วัดกลาง',religion:'buddhist',status:'active',templeType:'พระอารามหลวง',parents:[parent(chiangMai),parent(districtA)]},
  {id:'p2',type:'POI',name:'วัดกลาง',religion:'buddhist',status:'abandoned',parents:[parent(chiangRai),parent(districtB)]},
  {id:'m1',type:'POI',name:'กลาง',religion:'islam',parents:[parent(chiangMai),parent(districtA)]},
  {id:'m2',type:'POI',name:'กลาง',religion:'islam',parents:[parent(chiangRai),parent(districtB)]},
  {id:'sk',type:'POI',name:'วัดซิกข์ศรีคุรุสิงห์สภา',religion:'sikh',parents:[parent(chiangMai)]},
  {id:'chr',type:'POI',name:'คริสตจักรศรีสง่า',religion:'christian',parents:[parent(chiangMai)]},
  {id:'c1',type:'SUBDISTRICT',name:'บ้านหมอ',parents:[parent(chiangMai)]},
  {id:'c2',type:'SUBDISTRICT',name:'บ้านหม้อ',parents:[parent(chiangRai)]},
  {id:'ตราด',type:'SUBDISTRICT',name:'ตราด',parents:[parent(chiangMai)]},
  {id:'ตลาด',type:'SUBDISTRICT',name:'ตลาด',parents:[parent(chiangMai)]},
  {id:'chomphu',type:'SUBDISTRICT',name:'ชมพู',parents:[parent(chiangMai)]},
  {id:'short',type:'DISTRICT',name:'ปง',parents:[parent(chiangRai)]},
  {id:'alias',type:'SUBDISTRICT',name:'ชื่อหลัก',aliases:[{name:'ชื่อยังไม่ตรวจ',verified:false},{name:'ชื่อที่ตรวจแล้ว',verified:true}]}
];
const engine = createEngine(fixture);

// Contract labels are deliberately named before any observed result is asserted.
test('shared normalizer handles Thai digits, hidden chars, NBSP, punctuation, Sara Am and doubled Sara E',()=>{
  assert.equal(normalizeText('  เเม่\u200bฮ่องสอน\u00a0, ๑๒๓ฯ '),'แม่ฮ่องสอน 123');
  assert.equal(normalizeText('น\u0e4d\u0e49า'),normalizeText('น้ำ'));
  assert.equal(normalizeText('Chiang-Mai'),'chiang mai');
});
test('key1 preserves vowel distinctions while relaxing the specified marks',()=>{
  assert.equal(key1('แม่ฮ่องสอน'),'แมฮองสอน');
  assert.equal(key1('บ้านหมอ'),key1('บ้านหม้อ'));
  assert.notEqual(key1('แม่สัน'),key1('แม่สิน'));
  assert.notEqual(key1('แม่สิน'),key1('แม่สูน'));
});
test('key2 is conservative and retains known collision risk explicitly',()=>{
  assert.equal(key2('ตราด'),key2('ตลาด'));
  assert.notEqual(key2('ขา'),key2('คา'));
  assert.notEqual(key2('ถา'),key2('ทา'));
  assert.notEqual(key2('ผา'),key2('พา'));
  assert.notEqual(key2('สา'),key2('ซา'));
});
test('bounded OSA counts adjacent swaps once and uses Unicode code points',()=>{
  assert.equal(boundedDistance('ขนอแกน','ขอนแกน',1),1);
  assert.equal(boundedDistance('a😀b','a😀c',1),1);
  assert.equal(boundedDistance('abc','abxyz',1),2);
});
test('literal canonical identity ranks ahead of mark-folded collision',()=>{
  const r=engine.search('บ้านหมอ');
  assert.equal(r.results[0].identity,'subdistrict:c1');
  assert.equal(r.results[0].match.kind,'literal');
  assert.equal(r.results.find(x=>x.id==='c2').match.kind,'normalized');
  assert.equal(r.autoSelect,false);
});
test('phonetic equality remains a labelled suggestion',()=>{
  const r=engine.search('ชมภู');
  assert.equal(r.results[0].identity,'subdistrict:chomphu');
  assert.equal(r.results[0].match.kind,'phonetic');
  assert.equal(r.exactTotal,0);
  assert.equal(r.suggestionTotal,1);
});
test('exact code accepts Thai-digit equivalents but never nearby numeric IDs',()=>{
  assert.equal(engine.search('๕๐').results[0].identity,'province:cm');
  assert.equal(engine.search('51').total,0);
  assert.equal(engine.search('5002').total,0);
});
test('short exact names work without enabling short fuzzy guesses',()=>{
  assert.equal(engine.search('ปง').results[0].identity,'district:short');
  assert.equal(engine.search('ปด').suggestionTotal,0);
  assert.equal(engine.legacySearch('ปง').status,'too_short');
});
test('Thai transposition gives suggestions and no automatic selection',()=>{
  const r=engine.search('เชียงหใม่');
  assert.equal(r.results[0].identity,'province:cm');
  assert.equal(r.results[0].match.suggestion,true);
  assert.equal(r.autoSelect,false);
});
test('lowercase Kedmanee wrong-layout query is a labelled suggestion',()=>{
  const r=engine.search("g=up'.s,j");
  assert.equal(r.results[0].identity,'province:cm');
  assert.equal(r.results[0].match.kind,'keyboard');
});
test('exact explicit type and parent constrain retrieval before ranking',()=>{
  const r=engine.search('อ.เมือง จ.เชียงราย');
  assert.deepEqual(r.results.map(x=>x.identity),['district:d2']);
  assert.equal(r.status,'resolved');
});
test('explicit parent is a hard constraint for every direct and suggested place',()=>{
  const r=engine.search('วัดกลง จ.เชียงราย',{mode:'place'});
  assert.ok(r.total>0);
  assert.ok(r.results.every(x=>x.parents.some(p=>p.identity==='province:cr')));
  assert.ok(!r.results.some(x=>x.id==='p1'));
});
test('conflicting same-type explicit parents abstain without scope broadening',()=>{
  const r=engine.search('วัดกลาง จ.เชียงใหม่ จ.เชียงราย');
  assert.equal(r.total,0);
  assert.equal(r.status,'no_scope_match');
  assert.ok(r.warnings.some(x=>x.code==='conflicting_explicit_scopes'));
});
test('conflicting province and district parents abstain without scope broadening',()=>{
  const uniqueDistrict={id:'unique',type:'district',name:'หาดใหญ่',parents:[parent(chiangRai)]};
  const e=createEngine([...fixture,uniqueDistrict,{id:'uplace',type:'place',name:'มัสยิดใหญ่',religion:'islam',parents:[parent(chiangRai),parent(uniqueDistrict)]}]);
  assert.equal(e.search('มัสยิด อ.หาดใหญ่ จ.เชียงใหม่').total,0);
});
test('unknown explicit parents do not use fuzzy correction',()=>{
  const r=engine.search('วัดกลาง จ.เชียงใหม');
  assert.equal(r.total,0);
  assert.equal(r.status,'no_scope_match');
  assert.ok(r.warnings.some(x=>x.code==='explicit_scope_not_found'));
});
test('ambiguous district parent remains a set until a verified province disambiguates',()=>{
  const r=engine.search('มัสยิด อ.เมือง จ.เชียงราย');
  assert.deepEqual(r.results.map(x=>x.identity),['place:m2']);
});
test('unlabelled exact verified parent name is a separate interpretation',()=>{
  const r=engine.search('มัสยิด เชียงใหม่');
  assert.deepEqual(r.results.map(x=>x.identity),['place:m1']);
  assert.equal(r.results[0].match.parentInterpretation[0].type,'province');
});
test('full category-bearing canonical name is preserved, including Sikh วัด',()=>{
  const r=engine.search('วัดซิกข์ศรีคุรุสิงห์สภา');
  assert.equal(r.results[0].identity,'place:sk');
  assert.equal(r.results[0].match.kind,'literal');
  assert.equal(r.results[0].religion,'sikh');
});
test('source religion filters cannot be crossed by canonical or fuzzy branches',()=>{
  const r=engine.search('กลาง',{mode:'place',religion:'ISLAM'});
  assert.deepEqual(new Set(r.results.map(x=>x.id)),new Set(['m1','m2']));
  assert.ok(r.results.every(x=>x.religion==='islam'));
});
test('conflicting explicit religion cue and chosen filter abstain',()=>{
  const r=engine.search('มัสยิด',{religion:'buddhist'});
  assert.equal(r.total,0);
  assert.ok(r.warnings.some(x=>x.code==='conflicting_religion_filters'));
});
test('วัดร้าง maps only to the source abandoned status',()=>{
  const r=engine.search('วัดร้าง');
  assert.deepEqual(r.results.map(x=>x.id),['p2']);
  assert.equal(r.scope.metadata[0].field,'status');
});
test('temple type is a closed source-metadata clause, not a name inference',()=>{
  const r=engine.search('พระอารามหลวง จ.เชียงใหม่');
  assert.deepEqual(r.results.map(x=>x.id),['p1']);
  assert.equal(r.results[0].match.field,'templeType');
});
test('ambiguous โบสถ์ cue exposes a warning and uses Christian metadata',()=>{
  const r=engine.search('โบสถ์ จ.เชียงใหม่');
  assert.deepEqual(r.results.map(x=>x.id),['chr']);
  assert.ok(r.warnings.some(x=>x.code==='ambiguous_category_term'));
});
test('same-name entities retain namespaced identities and require a choice',()=>{
  const r=engine.search('วัดกลาง');
  assert.equal(r.status,'ambiguous');
  assert.deepEqual(new Set(r.results.map(x=>x.identity)),new Set(['place:p1','place:p2']));
  assert.equal(r.autoSelect,false);
});
test('pagination retains full count and deterministic order',()=>{
  const full=engine.search('เมือง',{limit:100});
  const first=engine.search('เมือง',{limit:1});
  const second=engine.search('เมือง',{limit:1,offset:1});
  assert.equal(first.total,full.total);
  assert.equal(first.hasMore,true);
  assert.deepEqual([...first.results,...second.results].map(x=>x.identity),full.results.slice(0,2).map(x=>x.identity));
});
test('place-mode explicit area-only query enumerates only verified children',()=>{
  const r=engine.search('จ.เชียงราย',{mode:'place'});
  assert.deepEqual(new Set(r.results.map(x=>x.id)),new Set(['p2','m2']));
});
test('unverified aliases do not enter the dictionary',()=>{
  assert.equal(engine.search('ชื่อยังไม่ตรวจ').results.some(x=>x.id==='alias'),false);
  assert.equal(engine.search('ชื่อที่ตรวจแล้ว').results[0].id,'alias');
});
test('invalid, empty, and out-of-corpus requests abstain with explicit states',()=>{
  assert.equal(engine.search('').status,'empty');
  assert.equal(engine.search('   ').total,0);
  assert.equal(engine.search('x'.repeat(181)).status,'invalid_query');
  assert.equal(engine.search('hotel').total,0);
  assert.equal(engine.search('Singapore').total,0);
});
test('source IDs are immutable while types and parent identities normalize',()=>{
  const record=engine.search('วัดกลาง จ.เชียงใหม่').results[0];
  assert.equal(record.id,'p1');assert.equal(record.type,'place');assert.equal(record.sourceType,'POI');
  assert.equal(record.parents.find(x=>x.id==='cm').identity,'province:cm');
  const e=createEngine([{id:'same',type:'province',name:'จังหวัดหนึ่ง'},{id:'same',type:'place',name:'สถานที่หนึ่ง'}]);
  assert.equal(e.stats.records,2);
});
test('legacy is explicitly an area-only local approximation capped at 10 per type',()=>{
  const e=createEngine(Array.from({length:15},(_,i)=>({id:String(i),type:'SUBDISTRICT',name:'หนองบัว'+i})));
  const old=e.legacySearch('หนองบัว'),fresh=e.search('หนองบัว');
  assert.equal(old.total,10);assert.equal(fresh.total,15);
  assert.equal(old.baseline.liveMeasurement,false);assert.equal(old.baseline.scope,'area-only');
  assert.equal(engine.legacySearch('วัดกลาง').total,0);
});

const realAreas=JSON.parse(fs.readFileSync(new URL('../data/areas.json',import.meta.url),'utf8'));
const realPlaces=JSON.parse(fs.readFileSync(new URL('../data/places.json',import.meta.url),'utf8'));
const realEngine=createEngine([...realAreas,...realPlaces]);
test('real corpus has the disclosed identity counts and no namespace duplicates',()=>{
  assert.equal(realAreas.length,17062);assert.equal(realPlaces.length,1491);
  assert.equal(realEngine.stats.duplicateIdentities,0);assert.equal(realEngine.stats.records,18553);
});
test('all 77 exact province source identities are reachable before pagination',()=>{
  const provinces=realAreas.filter(x=>x.type==='PROVINCE');
  assert.equal(provinces.length,77);
  for(const target of provinces){
    const result=realEngine.search(target.name,{limit:500});
    assert.ok(result.results.some(x=>x.identity===`province:${target.id}`),target.name);
  }
});
test('real corpus explicit place+province finds the correct ชัยนาท identity and abstains for เชียงราย',()=>{
  // Source names and parents supply the labels; no generated alternate names are asserted.
  const target=realPlaces.find(x=>x.name==='วัดพระแก้ว'&&x.parents.some(p=>p.type==='PROVINCE'&&p.name==='ชัยนาท'));
  assert.ok(target,'checked source target missing');
  const yes=realEngine.search('วัดพระแก้ว จ.ชัยนาท');
  assert.equal(yes.results[0].id,target.id);assert.equal(yes.results[0].match.kind,'literal');
  const no=realEngine.search('วัดพระแก้ว จ.เชียงราย');
  assert.equal(no.total,0);assert.equal(no.status,'no_scope_match');
});
test('real current sample retains source status and religious metadata on returned identities',()=>{
  for(const query of ['วัดร้าง จ.สุโขทัย','พระอารามหลวง จ.เชียงใหม่','มัสยิด กรุงเทพมหานคร']){
    const result=realEngine.search(query,{limit:500});
    assert.ok(result.total>0,query);
    for(const hit of result.results){
      const source=realPlaces.find(x=>x.id===hit.id);assert.ok(source);
      assert.equal(hit.religion,source.religion);assert.equal(hit.status,source.status);
      if(query.startsWith('วัดร้าง')) assert.equal(source.status,'abandoned');
      if(query.startsWith('พระอารามหลวง')) assert.equal(source.templeType,'พระอารามหลวง');
      if(query.startsWith('มัสยิด')) assert.equal(source.religion,'islam');
    }
  }
});
test('real explicit temple short phonetic prefix finds วัดอรุณราชวราราม without an unconstrained short edit fallback',()=>{
  const target=realPlaces.find(x=>x.name==='วัดอรุณราชวราราม');
  assert.ok(target,'checked source target missing');
  const result=realEngine.search('วัดอรุน',{limit:5});
  const hit=result.results.find(x=>x.id===target.id);
  assert.ok(hit,'frozen expected target missing from first 5');
  assert.equal(hit.match.kind,'phonetic-prefix');
  assert.equal(hit.match.suggestion,true);assert.equal(result.autoSelect,false);
});
test('real negative controls do not turn into arbitrary area suggestions',()=>{
  for(const query of ['hotel','Singapore','pizza delivery','xxxxxxxxxxxx']) assert.equal(realEngine.search(query).total,0,query);
});
test('worker rejects stale index revisions and preserves request identity',()=>{
  const messages=[];let listener;
  const source=fs.readFileSync(new URL('../site/search-worker.js',import.meta.url),'utf8').replace(/^import .*;\n/u,'');
  vm.runInNewContext(source,{createEngine,ENGINE_VERSION,self:{addEventListener:(_name,handler)=>listener=handler,postMessage:message=>messages.push(message)}});
  listener({data:{type:'init',records:fixture,version:'index-A',requestId:1}});
  listener({data:{type:'search',query:'เชียงใหม่',version:'index-old',requestId:2}});
  listener({data:{type:'search',query:'เชียงใหม่',version:'index-A',requestId:3}});
  assert.equal(messages[0].type,'ready');assert.equal(messages[1].type,'stale');
  assert.equal(messages[2].requestId,3);assert.equal(messages[2].version,'index-A');
  assert.equal(messages[2].result.results[0].identity,'province:cm');
});
test('worker exposes initialization and request failures as errors, not successful empty results',()=>{
  const messages=[];let listener;
  const source=fs.readFileSync(new URL('../site/search-worker.js',import.meta.url),'utf8').replace(/^import .*;\n/u,'');
  vm.runInNewContext(source,{createEngine,ENGINE_VERSION,self:{addEventListener:(_name,handler)=>listener=handler,postMessage:message=>messages.push(message)}});
  listener({data:{type:'search',query:'เชียงใหม่',requestId:10}});
  listener({data:{type:'init',records:fixture}});
  listener({data:{type:'unsupported',requestId:11}});
  assert.equal(messages[0].type,'error');assert.equal(messages[0].requestId,10);
  assert.equal(messages[2].type,'error');assert.equal(messages[2].requestId,11);
});
