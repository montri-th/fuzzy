#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {validateManifest} from './run-regression.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=message=>{throw new Error(message);};

export function convertExport(input,records){
  if(!input||input.schemaVersion!==1||input.source!=='human_confirmed_feedback'||input.automaticTraining!==false||!Array.isArray(input.cases)||input.hasMore===true)fail('Use a complete human-confirmed server export; fetch every page before importing.');
  const byRaw=new Map(records.map(r=>[r.id,`${r.type==='POI'?'place':r.type==='LOCALE'?'neighborhood':r.type.toLowerCase()}:${r.id}`]));
  const known=new Set(byRaw.values());
  const cases=input.cases.map(c=>{
    if(c.privacyReviewed!==true||c.labelStatus!=='human_confirmed'||c.source?.kind!=='human_confirmed_feedback'||!Number.isInteger(c.source.reviewVersion)||c.source.reviewVersion<1||!/^feedback-[a-f0-9-]{36}$/i.test(c.id||'')||c.id!==`feedback-${c.source.feedbackId}`)fail('Export contains an unreviewed or malformed case.');
    if(!['all','area','place'].includes(c.mode)||typeof c.abstain!=='boolean'||!Array.isArray(c.expectedIds)||c.expectedIds.length>10)fail(`Invalid confirmed expectation: ${c.id}.`);
    const religion=c.religion==null||c.religion===''?null:typeof c.religion==='string'?c.religion.toLowerCase():fail(`Invalid religion filter in ${c.id}.`);
    if(religion&&!['buddhist','islam','christian','sikh','hindu','chinese'].includes(religion))fail(`Unknown religion filter in ${c.id}.`);
    const ids=[...new Set(c.expectedIds.map(id=>known.has(id)?id:fail(`Unknown or non-namespaced intended identity in ${c.id}.`)))];
    if(c.abstain?ids.length:!ids.length)fail(`Abstain/ID mismatch: ${c.id}.`);
    // Whitelist only the reviewed search task and structured evidence. Deliberately omit note, notes and cause.
    return {caseId:c.id,scope:'reviewed',query:c.query,options:{mode:c.mode,...(religion?{religion}:{})},splitRole:'human-confirmed-exposed-validation',expectation:{autoSelect:false,outcome:c.abstain?'abstention':'retrieval',...(c.abstain?{mustBlank:true}:{acceptableIdentities:ids,topK:10})},review:{kind:'human_confirmed_feedback',labelStatus:'human_confirmed',privacyReviewed:true,feedbackId:c.source.feedbackId,reviewVersion:c.source.reviewVersion,reviewedAt:c.source.reviewedAt,corpusVersion:c.source.corpusVersion}};
  });
  const manifest={schemaVersion:1,visibility:'private',source:'human_confirmed_feedback',automaticTraining:false,cases};validateManifest(manifest,known,{privateCases:true});return manifest;
}

export function main(){
  const args=process.argv.slice(2);let inputPath='-';
  for(let index=0;index<args.length;index++){if(args[index]==='--out'){index++;continue;}if(args[index].startsWith('--'))fail('Unknown import option.');if(inputPath!=='-')fail('Supply one server export path or stdin.');inputPath=args[index];}
  const outIndex=args.indexOf('--out'),outPath=path.resolve(ROOT,outIndex<0?'.private/reviewed-cases.json':args[outIndex+1]||fail('Missing --out path.'));
  const privateRoot=path.join(ROOT,'.private')+path.sep;
  if(!outPath.startsWith(privateRoot))fail('Reviewed complaint queries may be written only under .private/.');
  const ignorePath=path.join(ROOT,'.gitignore');
  if(!fs.existsSync(ignorePath)||!fs.readFileSync(ignorePath,'utf8').split(/\r?\n/).some(line=>['.private/','/.private/','.private'].includes(line.trim())))fail('Add /.private/ to .gitignore before importing complaint queries.');
  try{const tracked=execFileSync('git',['ls-files','--',path.relative(ROOT,outPath)],{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();if(tracked)fail('Private output path is tracked by Git. Remove it from the index before importing.');}catch(error){if(error.message?.startsWith('Private output'))throw error; /* Source bundle may not yet be a Git checkout. */}
  const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
  const input=read(inputPath==='-'?0:path.resolve(process.cwd(),inputPath));
  const records=[...read(path.join(ROOT,'site/data/areas.json')),...read(path.join(ROOT,'site/data/pois.json'))];
  const incoming=convertExport(input,records);const known=new Set(records.map(r=>`${r.type==='POI'?'place':r.type==='LOCALE'?'neighborhood':r.type.toLowerCase()}:${r.id}`));
  const existing=fs.existsSync(outPath)?read(outPath):{schemaVersion:1,visibility:'private',source:'human_confirmed_feedback',automaticTraining:false,cases:[]};
  if(existing.cases.length)validateManifest(existing,known,{privateCases:true});
  const combined=new Map(existing.cases.map(c=>[c.caseId,c]));
  for(const c of incoming.cases){const old=combined.get(c.caseId);if(old&&JSON.stringify(old)!==JSON.stringify(c))fail(`Existing confirmed label changed: ${c.caseId}. Review and approve a correction separately; importer will not overwrite it.`);combined.set(c.caseId,c);}
  const output={...incoming,cases:[...combined.values()]};fs.mkdirSync(path.dirname(outPath),{recursive:true,mode:0o700});fs.writeFileSync(outPath,JSON.stringify(output,null,2)+'\n',{mode:0o600});fs.chmodSync(outPath,0o600);
  process.stdout.write(`Imported ${incoming.cases.length} reviewed cases; ${output.cases.length} private cases retained. No queries or notes printed.\n`);
  return output;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try{main();}catch(error){process.stderr.write(`Import blocked: ${error.message}\n`);process.exitCode=1;}
