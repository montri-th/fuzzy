import {ApiError,CORPUS_VERSION,requireAdmin,requireOrigin,readJSON,validateStats,validateFeedback,validateTriage,validateDeletion,dayRange,pagination,feedbackId,jsonResponse} from './search-service-core.mjs';

export function createHandler({repository,getAdminToken=()=>'',getAllowedOrigins=()=>''}) {
  return async function handler(request) {
    try {
      const url=new URL(request.url);const action=url.searchParams.get('action')||'health';const method=request.method.toUpperCase();
      const publicWrite=method==='POST'&&['stats','feedback'].includes(action);
      const health=method==='GET'&&action==='health';
      if(health)return jsonResponse({service:'citymeter-search-service',schemaVersion:1,corpusVersion:CORPUS_VERSION,storage:'managed-postgres',storageStatus:'not_probed'});
      if(publicWrite)requireOrigin(request,getAllowedOrigins());
      else {requireAdmin(request,getAdminToken());requireOrigin(request,getAllowedOrigins(),{allowMissing:true});}
      if(method==='POST'&&action==='stats'){const input=validateStats(await readJSON(request));return jsonResponse(await repository().saveStats(input),201);}
      if(method==='POST'&&action==='feedback'){const input=validateFeedback(await readJSON(request));return jsonResponse(await repository().saveFeedback(input),201);}
      if(method==='GET'&&action==='stats')return jsonResponse(await repository().stats(dayRange(url.searchParams.get('date'))));
      if(method==='GET'&&action==='feedback') {
        if(url.searchParams.has('id'))return jsonResponse(await repository().getFeedback(feedbackId(url.searchParams.get('id'))));
        return jsonResponse(await repository().listFeedback(dayRange(url.searchParams.get('date')),pagination(url.searchParams)));
      }
      if(method==='PATCH'&&action==='triage'){const id=feedbackId(url.searchParams.get('id'));const input=validateTriage(await readJSON(request));return jsonResponse(await repository().triage(id,input));}
      if(method==='DELETE'&&action==='feedback'){const id=feedbackId(url.searchParams.get('id'));const input=validateDeletion(await readJSON(request),id);return jsonResponse(await repository().deleteFeedback(id,input));}
      if(method==='GET'&&action==='cases')return jsonResponse(await repository().cases(dayRange(url.searchParams.get('date')),pagination(url.searchParams)));
      throw new ApiError(405,'method_not_allowed','Unsupported method or action.');
    } catch(error) {
      if(error instanceof ApiError)return jsonResponse({saved:false,error:error.code,message:error.message},error.status);
      // Queries, notes, authorization headers and driver errors are never written to logs or returned.
      return jsonResponse({saved:false,error:'storage_unavailable',message:'The service could not save or read data. Try again later.'},503);
    }
  };
}
