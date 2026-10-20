import {getDatabase} from '@netlify/database';
import {createPgRepository} from '../lib/search-service-repository.mjs';
import {jsonResponse} from '../lib/search-service-core.mjs';
import {createHandler} from '../lib/search-service-handler.mjs';

let repository;
const env=name=>globalThis.Netlify?.env?.get(name)??process.env[name]??'';
const handler=createHandler({
  repository:()=>repository??=(createPgRepository(getDatabase())),
  getAdminToken:()=>env('FUZZY_ADMIN_TOKEN'),
  getAllowedOrigins:()=>env('FUZZY_ALLOWED_ORIGINS')
});

// Explicit route checking also denies any platform default-function alias.
export default async function(request,context) {
  if(new URL(request.url).pathname!=='/api/search-service')return jsonResponse({saved:false,error:'not_found',message:'Route not found.'},404);
  return handler(request,context);
}

// Platform enforcement, not an unreliable per-process counter. No IP is stored in application data.
export const config={path:'/api/search-service',rateLimit:{action:'rate_limit',aggregateBy:['ip','domain'],windowSize:60,windowLimit:120}};
