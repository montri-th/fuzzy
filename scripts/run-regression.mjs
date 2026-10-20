#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createEngine} from '../site/search-engine.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifestPath='tests/evaluation-cases.json';
const fail=message=>{throw new Error(message);};
const readJSON=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const digest=value=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const signature=c=>({caseId:c.caseId,scope:c.scope,query:c.query,options:c.options||{},expectation:c.expectation});

export function validateManifest(manifest,knownIds,{privateCases=false}={}) {
  if(!manifest||manifest.schemaVersion!==1||!Array.isArray(manifest.cases)||!manifest.cases.length)fail('Invalid or empty case manifest.');
  const seen=new Set();
  for(const c of manifest.cases){
    if(typeof c.caseId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(c.caseId)||seen.has(c.caseId))fail('Invalid or duplicate case ID.');
    seen.add(c.caseId);
    if(typeof c.query!=='string'||!c.query.trim()||Array.from(c.query).length>180||/[\u0000-\u001f\u007f-\u009f<>]/u.test(c.query))fail(`Invalid query in ${c.caseId}.`);
    if(!['all','area','place'].includes(c.options?.mode)||!['area','new_poi','reviewed'].includes(c.scope))fail(`Invalid scope in ${c.caseId}.`);
    if(c.options?.religion!=null&&!['buddhist','islam','christian','sikh','hindu','chinese'].includes(c.options.religion))fail(`Invalid religion filter in ${c.caseId}.`);
    const e=c.expectation;
    if(!e||e.autoSelect!==false||!['retrieval','ambiguity','category','abstention'].includes(e.outcome))fail(`Invalid expectation in ${c.caseId}.`);
    if(e.outcome==='abstention'&&e.mustBlank!==true)fail(`Abstention needs mustBlank in ${c.caseId}.`);
    if(e.outcome!=='abstention'&&(!Array.isArray(e.acceptableIdentities)||!e.acceptableIdentities.length||!Number.isInteger(e.topK)||e.topK<1||e.topK>500))fail(`Missing identity labels in ${c.caseId}.`);
    for(const field of ['acceptableIdentities','allRequiredIdentities'])if(e[field]!=null&&(!Array.isArray(e[field])||new Set(e[field]).size!==e[field].length||e[field].some(id=>!knownIds.has(id))))fail(`Unknown/duplicate identity label in ${c.caseId}.`);
    if(e.mustBlank&&((e.acceptableIdentities?.length||0)+(e.allRequiredIdentities?.length||0)))fail(`Abstention cannot have intended IDs in ${c.caseId}.`);
    if(privateCases&&(c.review?.privacyReviewed!==true||c.review?.labelStatus!=='human_confirmed'||c.review?.kind!=='human_confirmed_feedback'))fail(`Unreviewed private case ${c.caseId}.`);
  }
  return manifest.cases;
}

export function assertPreserved(base,current,{approval=null,approvalEnabled=false}={}) {
  const fresh=new Map(current.cases.map(c=>[c.caseId,c]));
  const changed=[];
  for(const old of base.cases){
    const next=fresh.get(old.caseId);
    if(!next)fail(`Previously existing case was removed: ${old.caseId}. Restore it; label-correction approval cannot delete cases.`);
    const fromSha256=digest(signature(old)),toSha256=digest(signature(next));
    if(fromSha256!==toSha256){
      const receipt=approval?.changes?.find(x=>x.caseId===old.caseId&&x.fromSha256===fromSha256&&x.toSha256===toSha256&&typeof x.reason==='string'&&x.reason.trim());
      if(!approvalEnabled||approval?.schemaVersion!==1||typeof approval.approvedBy!=='string'||!approval.approvedBy.trim()||typeof approval.approvalReference!=='string'||!approval.approvalReference.trim()||!receipt)changed.push({caseId:old.caseId,fromSha256,toSha256});
    }
  }
  if(changed.length)fail(`Gold labels/query/options changed without a separate human approval receipt: ${JSON.stringify(changed)}`);
  return base.cases.length;
}

export function judge(c,r){
  const e=c.expectation,ids=r.results.map(x=>x.identity),errors=[];
  if(r.autoSelect!==false)errors.push('automatic selection enabled');
  if(e.mustBlank&&r.total!==0)errors.push('expected completed empty result');
  if(e.requiredStatus&&r.status!==e.requiredStatus)errors.push('wrong outcome status');
  for(const code of e.requiredWarnings||[])if(!r.warnings.some(x=>x.code===code))errors.push(`missing warning ${code}`);
  const firstRank=e.acceptableIdentities?.length?ids.findIndex(id=>e.acceptableIdentities.includes(id))+1:null;
  if(e.acceptableIdentities?.length&&(!firstRank||firstRank>e.topK))errors.push('acceptable ID absent from top-k');
  if((e.allRequiredIdentities||[]).some(id=>!ids.slice(0,e.topK).includes(id)))errors.push('required identity unreachable');
  if(e.exactEntitySet){const allowed=e.allRequiredIdentities||e.acceptableIdentities||[];if(allowed.some(id=>!ids.includes(id))||ids.some(id=>!allowed.includes(id)))errors.push('source entity set mismatch');}
  if(e.suggestionRequired&&r.results.some(x=>e.acceptableIdentities.includes(x.identity)&&!x.match.suggestion))errors.push('suggestion labelled as exact');
  return {caseId:c.caseId,scope:c.scope,pass:!errors.length,errors,status:r.status,total:r.total,firstAcceptedRank:firstRank||null};
}

export async function main(){
  const args=process.argv.slice(2),arg=name=>{const i=args.indexOf(name);return i<0?null:args[i+1]||fail(`Missing ${name} value.`);};
  const areas=readJSON(path.join(ROOT,'site/data/areas.json')),pois=readJSON(path.join(ROOT,'site/data/pois.json')),engine=createEngine([...areas,...pois]);
  const knownIds=new Set([...areas,...pois].map(r=>`${r.type==='POI'?'place':r.type==='LOCALE'?'neighborhood':r.type.toLowerCase()}:${r.id}`));
  const manifest=readJSON(path.join(ROOT,manifestPath));validateManifest(manifest,knownIds);
  const baseRef=arg('--base-ref')||process.env.REGRESSION_BASE_REF;
  let preserved=null;
  if(baseRef){
    if(!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/.test(baseRef))fail('Invalid regression base ref.');
    const raw=execFileSync('git',['show',`${baseRef}:${manifestPath}`],{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe']});
    const base=JSON.parse(raw);validateManifest(base,knownIds);
    const correctionPath=arg('--label-corrections')||process.env.LABEL_CORRECTIONS_FILE;
    const approval=correctionPath?readJSON(path.resolve(ROOT,correctionPath)):null;
    preserved=assertPreserved(base,manifest,{approval,approvalEnabled:process.env.LABEL_CORRECTION_APPROVED==='true'});
  }
  const privatePath=arg('--reviewed-cases')||process.env.REVIEWED_CASES_FILE;
  const privateManifest=privatePath?JSON.parse(fs.readFileSync(privatePath==='-'?0:path.resolve(ROOT,privatePath),'utf8')):null;
  const cases=[...manifest.cases];
  if(privateManifest){validateManifest(privateManifest,knownIds,{privateCases:true});const existing=new Set(cases.map(c=>c.caseId));for(const c of privateManifest.cases){if(existing.has(c.caseId))fail(`Private case collides with public case ${c.caseId}.`);existing.add(c.caseId);cases.push(c);}}
  const results=cases.map(c=>{try{return judge(c,engine.search(c.query,{...c.options,limit:500}));}catch{ return {caseId:c.caseId,scope:c.scope,pass:false,errors:['execution failed']}; }});
  const summary={status:results.every(x=>x.pass)?'pass':'fail',engineSha256:createHash('sha256').update(fs.readFileSync(path.join(ROOT,'site/search-engine.js'))).digest('hex'),manifestSha256:digest(manifest),publicCases:manifest.cases.length,privateCases:privateManifest?.cases.length||0,preservedBaseCases:preserved,completed:results.filter(x=>!x.errors.includes('execution failed')).length,total:results.length,passed:results.filter(x=>x.pass).length,failures:results.filter(x=>!x.pass)};
  // Counts, IDs and assertion failures only. Never print private queries, notes or source names.
  process.stdout.write(JSON.stringify(summary,null,2)+'\n');if(summary.status!=='pass')process.exitCode=1;return summary;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{process.stderr.write(`Regression blocked: ${error.message}\n`);process.exitCode=1;});
