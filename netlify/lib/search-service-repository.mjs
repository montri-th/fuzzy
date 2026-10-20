import {randomUUID} from 'node:crypto';
import {ApiError,toFeedback,toConfirmedCase} from './search-service-core.mjs';

export function createPgRepository(db) {
  return {
    async saveStats(event) {
      const rows=await db.sql`INSERT INTO fuzzy_search_events (id,mode,engine,outcome,result_count,latency_ms,corpus_version,engine_version)
        VALUES (${event.id},${event.mode},${event.engine},${event.outcome},${event.resultCount},${event.latencyMs},${event.corpusVersion},${event.engineVersion})
        ON CONFLICT (id) DO NOTHING RETURNING id,created_at`;
      return {saved:true,id:event.id,duplicate:rows.length===0,...(rows[0]?{createdAt:rows[0].created_at}:{})};
    },
    async saveFeedback(feedback) {
      const rows=await db.sql`INSERT INTO fuzzy_search_feedback (id,query,note,top_ids,mode,religion,result_status,result_count,corpus_version,engine_version)
        VALUES (${feedback.id},${feedback.query},${feedback.note},${JSON.stringify(feedback.topIds)}::jsonb,${feedback.mode},${feedback.religion},${feedback.resultStatus},${feedback.resultCount},${feedback.corpusVersion},${feedback.engineVersion})
        RETURNING id,created_at,status,version`;
      return {saved:true,id:rows[0].id,createdAt:rows[0].created_at,status:rows[0].status,version:rows[0].version};
    },
    async stats(range) {
      const rows=await db.sql`SELECT mode,engine,COUNT(*)::integer AS searches,
        COUNT(*) FILTER (WHERE outcome='matched')::integer AS matched,
        COUNT(*) FILTER (WHERE outcome='ambiguous')::integer AS ambiguous,
        COUNT(*) FILTER (WHERE outcome='no-match')::integer AS no_match,
        COUNT(*) FILTER (WHERE outcome='error')::integer AS errors,
        ROUND(AVG(latency_ms),2) AS mean_latency_ms,
        percentile_cont(0.50) WITHIN GROUP (ORDER BY latency_ms) AS p50_latency_ms,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_latency_ms
        FROM fuzzy_search_events WHERE created_at>=${range.start}::timestamptz AND created_at<${range.end}::timestamptz GROUP BY mode,engine ORDER BY mode,engine`;
      const normalize=r=>({mode:r.mode,engine:r.engine,searches:Number(r.searches),matched:Number(r.matched),ambiguous:Number(r.ambiguous),noMatch:Number(r.no_match),errors:Number(r.errors),meanLatencyMs:Number(r.mean_latency_ms||0),p50LatencyMs:Number(r.p50_latency_ms||0),p95LatencyMs:Number(r.p95_latency_ms||0)});
      const byMode=rows.map(normalize);
      const totals={searches:0,matched:0,ambiguous:0,noMatch:0,errors:0};
      for(const row of byMode)for(const key of Object.keys(totals))totals[key]+=row[key];
      return {...range,totals,byMode,measurement:'client_reported_search_execution',containsRawQueries:false};
    },
    async listFeedback(range,{limit,offset}) {
      const rows=await db.sql`SELECT * FROM fuzzy_search_feedback WHERE created_at>=${range.start}::timestamptz AND created_at<${range.end}::timestamptz ORDER BY created_at DESC,id DESC LIMIT ${limit+1} OFFSET ${offset}`;
      const hasMore=rows.length>limit;
      return {...range,items:rows.slice(0,limit).map(toFeedback),hasMore,nextOffset:hasMore?offset+limit:null,limit,offset};
    },
    async getFeedback(id) {
      const rows=await db.sql`SELECT * FROM fuzzy_search_feedback WHERE id=${id}::uuid`;
      if(!rows[0])throw new ApiError(404,'not_found','Feedback record not found.');
      const history=await db.sql`SELECT id,created_at,previous_version,new_version,previous_status,status,cause,expected_outcome,intended_ids,notes,privacy_reviewed,reviewer_kind FROM fuzzy_search_triage_audit WHERE feedback_id=${id}::uuid ORDER BY new_version`;
      return {record:toFeedback(rows[0]),history};
    },
    async triage(id,change) {
      const client=await db.pool.connect();
      try {
        await client.query('BEGIN');
        const current=await client.query('SELECT * FROM fuzzy_search_feedback WHERE id=$1::uuid FOR UPDATE',[id]);
        if(!current.rows[0])throw new ApiError(404,'not_found','Feedback record not found.');
        const previous=current.rows[0];
        if(previous.version!==change.expectedVersion)throw new ApiError(409,'version_conflict','Another review changed this record. Reload before saving.');
        const updated=await client.query(`UPDATE fuzzy_search_feedback SET status=$2,cause=$3,expected_outcome=$4,intended_ids=$5::jsonb,notes=$6,privacy_reviewed=$8,version=version+1,updated_at=now() WHERE id=$1::uuid AND version=$7 RETURNING *`,[id,change.status,change.cause,change.outcome,JSON.stringify(change.intendedIds),change.notes,change.expectedVersion,change.privacyReviewed]);
        if(!updated.rows[0])throw new ApiError(409,'version_conflict','Another review changed this record. Reload before saving.');
        const revisionId=randomUUID();
        await client.query(`INSERT INTO fuzzy_search_triage_audit (id,feedback_id,previous_version,new_version,previous_status,status,cause,expected_outcome,intended_ids,notes,privacy_reviewed) VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)`,[revisionId,id,previous.version,updated.rows[0].version,previous.status,change.status,change.cause,change.outcome,JSON.stringify(change.intendedIds),change.notes,change.privacyReviewed]);
        await client.query('COMMIT');
        return {saved:true,revisionId,record:toFeedback(updated.rows[0])};
      } catch(error) {await client.query('ROLLBACK');throw error;}
      finally {client.release();}
    },
    async deleteFeedback(id,{expectedVersion}) {
      const client=await db.pool.connect();
      try {
        await client.query('BEGIN');
        const current=await client.query('SELECT id,version FROM fuzzy_search_feedback WHERE id=$1::uuid FOR UPDATE',[id]);
        if(!current.rows[0])throw new ApiError(404,'not_found','Feedback record not found.');
        if(current.rows[0].version!==expectedVersion)throw new ApiError(409,'version_conflict','Another review changed this record. Reload before deleting.');
        const audit=await client.query('DELETE FROM fuzzy_search_triage_audit WHERE feedback_id=$1::uuid',[id]);
        const removed=await client.query('DELETE FROM fuzzy_search_feedback WHERE id=$1::uuid AND version=$2',[id,expectedVersion]);
        if(removed.rowCount!==1)throw new ApiError(409,'version_conflict','The record changed before deletion.');
        await client.query('COMMIT');
        return {deleted:true,id,deletedAuditCount:audit.rowCount};
      } catch(error) {await client.query('ROLLBACK');throw error;}
      finally {client.release();}
    },
    async cases(range,{limit,offset}) {
      const rows=await db.sql`SELECT * FROM fuzzy_search_feedback WHERE status IN ('confirmed','resolved') AND privacy_reviewed=true AND updated_at>=${range.start}::timestamptz AND updated_at<${range.end}::timestamptz ORDER BY updated_at,id LIMIT ${limit+1} OFFSET ${offset}`;
      const hasMore=rows.length>limit;
      return {schemaVersion:1,...range,cases:rows.slice(0,limit).map(toFeedback).map(toConfirmedCase).filter(Boolean),hasMore,nextOffset:hasMore?offset+limit:null,limit,offset,source:'human_confirmed_feedback',automaticTraining:false};
    }
  };
}
