// Independent adapter conformance tests: actual resolver outputs -> public/admin API validators.
// Storage is injected; these tests do not claim PostgreSQL provisioning or persisted deployment success.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createEngine} from '../site/search-engine.js';
import {validateFeedback,validateTriage,validateStats,toConfirmedCase,CORPUS_VERSION} from '../netlify/lib/search-service-core.mjs';
import {createHandler} from '../netlify/lib/search-service-handler.mjs';
const records=[...JSON.parse(fs.readFileSync(new URL('../site/data/areas.json',import.meta.url))),...JSON.parse(fs.readFileSync(new URL('../site/data/pois.json',import.meta.url)))];
const engine=createEngine(records);
const payloadFor=query=>{const result=engine.search(query,{limit:10});return {query,note:'ผู้ใช้ยืนยันว่าตั้งใจค้นชื่อตามข้อมูลในกรณีทดสอบ',topIds:result.results.map(r=>r.identity),mode:'all',status:result.status,resultCount:result.total,corpusVersion:CORPUS_VERSION,engineVersion:result.version,website:''}};
const token='independent-adapter-test-only-01234567890123456789';
const reportId='11111111-1111-4111-8111-111111111111';
const request=(action,body,{method='POST',auth=false}={})=>new Request(`https://adapter.example/.netlify/functions/search-service?action=${action}${action==='triage'?'&id='+reportId:''}`,{method,headers:{origin:'https://adapter.example','content-type':'application/json',...(auth?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});

test('real province result namespaced identity round-trips through feedback validation unchanged',()=>{
  const result=engine.search('จ.เชียงใหม่');
  assert.equal(result.results.length,1);
  const record=result.results[0];assert.equal(record.type,'province');
  const source=records.find(x=>x.id===record.id&&x.type==='PROVINCE');assert.ok(source);
  assert.equal(record.identity,'province:'+source.id);
  const validated=validateFeedback(payloadFor('จ.เชียงใหม่'));
  assert.deepEqual(validated.topIds,[record.identity]);
  assert.equal(record.id,source.id);
});

test('real Sikh place result namespaced identity includes original poi ID and survives validators',()=>{
  const source=records.find(x=>x.name==='วัดซิกข์ศรีคุรุสิงห์สภา');assert.ok(source);
  const result=engine.search(source.name);
  assert.equal(result.results[0].id,source.id);
  assert.equal(result.results[0].identity,'place:'+source.id);
  assert.match(result.results[0].identity,/^place:poi:[a-f0-9]{16}$/u);
  const validated=validateFeedback(payloadFor(source.name));
  assert.ok(validated.topIds.includes(result.results[0].identity));
  const triage=validateTriage({expectedVersion:0,status:'confirmed',cause:'ตรวจชื่อและศาสนาตรงข้อมูลต้นทาง',outcome:'ranked',intendedIds:[result.results[0].identity],privacyReviewed:true});
  assert.deepEqual(triage.intendedIds,[result.results[0].identity]);
});

test('known raw IDs and wrong-type identities cannot masquerade as an accepted namespace',()=>{
  const record=engine.search('จ.เชียงใหม่').results[0];
  assert.throws(()=>validateFeedback({...payloadFor('จ.เชียงใหม่'),topIds:[record.id]}));
  assert.throws(()=>validateFeedback({...payloadFor('จ.เชียงใหม่'),topIds:['district:'+record.id]}));
});

test('actual displayed results reach public feedback handler and confirmed-case export with same IDs',async()=>{
  let saved;
  const handler=createHandler({repository:()=>({saveFeedback:async input=>{saved=input;return {saved:true,id:reportId,status:'new',version:0}}}),getAdminToken:()=>token});
  const input=payloadFor('วัดอรุน');assert.ok(input.topIds.length>0,'frozen displayed-result fixture must be nonempty');
  const response=await handler(request('feedback',input));
  assert.equal(response.status,201);assert.equal((await response.json()).saved,true);
  assert.deepEqual(saved.topIds,input.topIds);
  assert.equal(saved.query,input.query);
  const expected=engine.search('วัดอรุณราชวราราม').results.find(r=>r.name==='วัดอรุณราชวราราม');assert.ok(expected);
  const triage=validateTriage({expectedVersion:0,status:'confirmed',cause:'ตรวจชื่ออรุณที่สะกดผิดและบริบทแล้ว',outcome:'ranked',intendedIds:[expected.identity],notes:'กรณีทดสอบภายใน ไม่มีข้อมูลผู้ใช้จริง',privacyReviewed:true});
  const exported=toConfirmedCase({...saved,...triage,id:reportId,version:1,updatedAt:'2026-10-21T00:00:00.000Z'});
  assert.deepEqual(exported.expectedIds,[expected.identity]);
  assert.equal(exported.query,input.query);
  assert.equal(exported.source.kind,'human_confirmed_feedback');
});

test('engine status can be mapped to anonymous stats without sending any source query or identity',()=>{
  const result=engine.search('เชียงหใม่');
  const payload={eventId:'22222222-2222-4222-8222-222222222222',mode:'all',engine:'new',outcome:result.total?'matched':'no-match',resultCount:result.total,latencyMs:result.timingMs,corpusVersion:CORPUS_VERSION,engineVersion:result.version};
  const validated=validateStats(payload);
  assert.equal(validated.id,payload.eventId);
  for(const key of ['query','topIds','identity','note','userId','ip']) assert.ok(!(key in validated),key);
  assert.throws(()=>validateStats({...payload,query:result.query}));
});

test('deployed modern entry has an explicit rate-limited route as required by the platform',async()=>{
  const {default:handler,config}=await import('../netlify/functions/search-service.mjs');
  assert.equal(typeof handler,'function');
  assert.equal(config.path,'/api/search-service','Netlify code-based rate limiting must protect the public API route');
  assert.equal(config.rateLimit.action,'rate_limit');
  assert.ok(config.rateLimit.windowSize>=1&&config.rateLimit.windowSize<=180);
  assert.ok(config.rateLimit.windowLimit>0);
  assert.deepEqual(config.rateLimit.aggregateBy,['ip','domain']);
});

test('public health response remains callable without initializing or claiming working storage',async()=>{
  const {default:handler}=await import('../netlify/functions/search-service.mjs');
  const response=await handler(new Request('https://adapter.example/api/search-service?action=health'));
  assert.equal(response.status,200);
  const receipt=await response.json();
  assert.equal(receipt.storageStatus,'not_probed');
  assert.equal(receipt.corpusVersion,CORPUS_VERSION);
});

test('the selected religion filter survives report and confirmed-case export for reproducible search context',()=>{
  const query='กลาง';
  const result=engine.search(query,{mode:'place',religion:'islam',limit:10});
  assert.ok(result.results.length>0,'actual filtered-corpus fixture must be nonempty');
  assert.ok(result.results.every(r=>r.religion==='islam'));
  const payload={...payloadFor(query),mode:'place',religion:'islam',topIds:result.results.map(r=>r.identity),resultCount:result.total,status:result.status};
  const validated=validateFeedback(payload);
  assert.equal(validated.religion,'islam');
  const triage=validateTriage({expectedVersion:0,status:'confirmed',cause:'ยืนยันมัสยิดเป้าหมายภายใต้ตัวกรองศาสนาเดิม',outcome:'ranked',intendedIds:[result.results[0].identity],privacyReviewed:true});
  const exported=toConfirmedCase({...validated,...triage,id:reportId,version:1,updatedAt:'2026-10-21T00:00:00.000Z'});
  assert.equal(exported.religion,'islam');
  assert.throws(()=>validateFeedback({...payload,religion:'arbitrary'}));
});


test('the provider default function alias cannot bypass the explicit rate-limited route',async()=>{
  const {default:handler}=await import('../netlify/functions/search-service.mjs');
  const response=await handler(new Request('https://adapter.example/.netlify/functions/search-service?action=health'));
  assert.equal(response.status,404);
});
