import {createHash, timingSafeEqual, randomUUID} from 'node:crypto';
import {CORPUS_IDS, CORPUS_VERSION} from './corpus-ids.mjs';

export {CORPUS_VERSION};
export const MAX_BODY_BYTES = 8192;
export const MODES = ['all','area','place','legacy'];
export const FEEDBACK_MODES = ['all','area','place'];
export const RELIGIONS = ['buddhist','islam','christian','sikh'];
export const TRIAGE_STATUSES = ['new','investigating','confirmed','rejected','resolved'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VERSION = /^[a-zA-Z0-9][a-zA-Z0-9._:+-]{0,79}$/;
export class ApiError extends Error {
  constructor(status, code, message) {super(message); this.status=status; this.code=code;}
}
const fail = (message,code='invalid_input') => {throw new ApiError(400,code,message);};
const object = value => {if (!value || typeof value!=='object' || Array.isArray(value)) fail('Expected a JSON object.'); return value;};
const has = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
const exactFields = (o,fields) => {if(Object.keys(o).some(k=>!fields.includes(k))) fail('Unexpected field in request.');};
export function plainText(value, field, max, {required=true,multiline=false}={}) {
  if(typeof value!=='string') {if(!required && value==null)return '';fail(`${field} must be text.`);}
  const text=value.trim();
  if((required&&!text)||Array.from(text).length>max)fail(`${field} must contain ${required?'1':'0'}–${max} characters.`);
  const prohibited=multiline?/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f<>]/u:/[\u0000-\u001f\u007f-\u009f<>]/u;
  if(prohibited.test(text))fail(`${field} must be plain text without control characters or markup.`);
  return text;
}
const enumeration = (value,values,field) => {if(!values.includes(value))fail(`${field} is invalid.`);return value;};
const integer = (value,field,max,min=0) => {if(!Number.isInteger(value)||value<min||value>max)fail(`${field} must be an integer from ${min} to ${max}.`);return value;};
const version = (value,field) => {if(typeof value!=='string'||!VERSION.test(value))fail(`${field} is invalid.`);return value;};
export function validId(value) {if(typeof value!=='string')return false; if(/^place:poi:[a-f0-9]{16}$/.test(value))return true;const match=value.match(/^(province|district|subdistrict|municipality|neighborhood):(.+)$/);return !!match&&UUID.test(match[2]);}
export function validateIds(value,field,{known=true,required=false}={}) {
  if(!Array.isArray(value)||value.length>10)fail(`${field} must be an array of at most 10 IDs.`);
  if(value.some(id=>!validId(id)||(known&&!CORPUS_IDS.has(id))))fail(`${field} contains an unknown corpus ID.`);
  const ids=[...new Set(value)]; if(required&&!ids.length)fail(`${field} needs at least one confirmed ID.`); return ids;
}
export function validateStats(input) {
  const o=object(input);exactFields(o,['eventId','mode','engine','outcome','resultCount','latencyMs','corpusVersion','engineVersion','website']);
  if(o.website)fail('Submission rejected.');
  const mode=enumeration(o.mode,MODES,'mode');
  const engine=enumeration(o.engine||(mode==='legacy'?'legacy':'new'),['new','legacy'],'engine');
  const outcome=enumeration(o.outcome,['matched','ambiguous','no-match','error'],'outcome');
  const count=integer(o.resultCount,'resultCount',100000);
  if(outcome==='no-match'&&count!==0)fail('no-match events must have zero results.');
  if(typeof o.latencyMs!=='number'||!Number.isFinite(o.latencyMs)||o.latencyMs<0||o.latencyMs>60000)fail('latencyMs is invalid.');
  if(o.eventId!=null&&!UUID.test(o.eventId))fail('eventId is invalid.');
  return {id:o.eventId||randomUUID(),mode,engine,outcome,resultCount:count,latencyMs:Math.round(o.latencyMs*100)/100,corpusVersion:version(o.corpusVersion,'corpusVersion'),engineVersion:version(o.engineVersion,'engineVersion')};
}
export function validateFeedback(input) {
  const o=object(input);exactFields(o,['query','note','topIds','mode','status','resultCount','corpusVersion','engineVersion','website','religion']);
  if(o.website)fail('Submission rejected.');
  const religion=o.religion==null||o.religion===''?null:enumeration(o.religion,RELIGIONS,'religion');
  const status=plainText(o.status,'status',40);
  if(!/^[a-z_-]+$/i.test(status))fail('status is invalid.');
  return {id:randomUUID(),query:plainText(o.query,'query',160),note:plainText(o.note,'note',500,{multiline:true}),topIds:validateIds(o.topIds||[],'topIds'),mode:enumeration(o.mode,FEEDBACK_MODES,'mode'),religion,resultStatus:status,resultCount:integer(o.resultCount,'resultCount',100000),corpusVersion:version(o.corpusVersion,'corpusVersion'),engineVersion:version(o.engineVersion,'engineVersion')};
}
export function validateTriage(input) {
  const o=object(input);exactFields(o,['expectedVersion','status','cause','outcome','intendedIds','notes','privacyReviewed']);
  const status=enumeration(o.status,TRIAGE_STATUSES,'status');
  const approved=['confirmed','resolved'].includes(status);
  if(o.privacyReviewed!=null&&typeof o.privacyReviewed!=='boolean')fail('privacyReviewed must be boolean.');
  if(approved&&o.privacyReviewed!==true)fail('Human privacy review is required before confirming or resolving a report.');
  const cause=plainText(o.cause??'','cause',300,{required:approved||status==='rejected',multiline:true});
  const notes=plainText(o.notes??'','notes',1000,{required:false,multiline:true});
  const outcome=o.outcome==null?null:enumeration(o.outcome,['ranked','abstain'],'outcome');
  const intendedIds=validateIds(o.intendedIds||[],'intendedIds',{required:approved&&outcome==='ranked'});
  if(approved&&!outcome)fail('Human confirmation needs outcome=ranked or abstain.');
  if(outcome==='abstain'&&intendedIds.length)fail('Abstain cases cannot have intended IDs.');
  return {expectedVersion:integer(o.expectedVersion,'expectedVersion',1000000),status,cause,outcome,intendedIds,notes,privacyReviewed:o.privacyReviewed===true};
}
export function validateDeletion(input,id) {
  const o=object(input);exactFields(o,['expectedVersion','confirmId']);
  if(o.confirmId!==id)fail('confirmId must exactly match the feedback UUID.');
  return {expectedVersion:integer(o.expectedVersion,'expectedVersion',1000000)};
}
export function requireAdmin(request,token) {
  if(typeof token!=='string'||token.length<32)throw new ApiError(503,'admin_not_configured','Admin access has not been configured.');
  const header=request.headers.get('authorization')||'';
  const candidate=header.startsWith('Bearer ')?header.slice(7):'';
  const hash=s=>createHash('sha256').update(s).digest();
  if(candidate.length>512||!timingSafeEqual(hash(candidate),hash(token)))throw new ApiError(401,'unauthorized','Admin authentication required.');
}
export function requireOrigin(request,allowedOrigins='',{allowMissing=false}={}) {
  const origin=request.headers.get('origin');
  const allowed=new Set([new URL(request.url).origin,...allowedOrigins.split(',').map(x=>x.trim()).filter(Boolean)]);
  if((!origin&&!allowMissing)||(origin&&!allowed.has(origin))||request.headers.get('sec-fetch-site')==='cross-site')throw new ApiError(403,'origin_forbidden','Use this site to submit requests.');
}
export async function readJSON(request) {
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))throw new ApiError(415,'content_type','Send application/json.');
  const length=Number(request.headers.get('content-length')||0);
  if(length>MAX_BODY_BYTES)throw new ApiError(413,'payload_too_large','Request body is too large.');
  const reader=request.body?.getReader(); if(!reader)fail('Request body is required.');
  let size=0;const chunks=[];
  try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY_BYTES){await reader.cancel();throw new ApiError(413,'payload_too_large','Request body is too large.');}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  try{return object(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));}catch(e){if(e instanceof ApiError)throw e;fail('Malformed JSON.');}
}
export function bangkokDate(date=new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function dayRange(value) {
  const date=value||bangkokDate();
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(date))fail('date must be YYYY-MM-DD.');
  const start=new Date(`${date}T00:00:00+07:00`);
  if(!Number.isFinite(start.getTime())||bangkokDate(start)!==date)fail('date is invalid.');
  return {date,start:start.toISOString(),end:new Date(start.getTime()+86400000).toISOString(),timeZone:'Asia/Bangkok'};
}
export function pagination(params) {
  const limit=params.has('limit')?Number(params.get('limit')):50;
  const offset=params.has('offset')?Number(params.get('offset')):0;
  return {limit:integer(limit,'limit',200,1),offset:integer(offset,'offset',100000)};
}
export function feedbackId(value) {if(typeof value!=='string'||!UUID.test(value))fail('id is invalid.');return value;}
export function jsonResponse(value,status=200) {
  return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, private','x-content-type-options':'nosniff','referrer-policy':'no-referrer','vary':'Origin'}});
}
export function toFeedback(row) {
  if(!row)return null;
  const iso=value=>value instanceof Date?value.toISOString():value;
  return {id:row.id,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at),query:row.query,note:row.note,topIds:row.top_ids,mode:row.mode,religion:row.religion??null,resultStatus:row.result_status,resultCount:row.result_count,corpusVersion:row.corpus_version,engineVersion:row.engine_version,status:row.status,version:row.version,cause:row.cause,outcome:row.expected_outcome,intendedIds:row.intended_ids,notes:row.notes,privacyReviewed:row.privacy_reviewed===true};
}
export function toConfirmedCase(record) {
  if(!['confirmed','resolved'].includes(record.status))return null;
  if(!record.privacyReviewed||!record.cause||!['ranked','abstain'].includes(record.outcome))return null;
  if(record.outcome==='ranked'&&!record.intendedIds.length)return null;
  return {id:`feedback-${record.id}`,query:record.query,mode:record.mode,religion:record.religion??null,expectedIds:record.intendedIds,abstain:record.outcome==='abstain',cause:record.cause,source:{kind:'human_confirmed_feedback',feedbackId:record.id,reviewVersion:record.version,reviewedAt:record.updatedAt,corpusVersion:record.corpusVersion,engineVersion:record.engineVersion},labelStatus:'human_confirmed',privacyReviewed:true};
}
