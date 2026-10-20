import {createEngine, ENGINE_VERSION} from './search-engine.js';
let engine = null;
let indexVersion = null;
self.addEventListener('message', event => {
  const message = event.data || {};
  const requestId = message.requestId ?? message.id ?? null;
  try {
    if (message.type === 'init') {
      indexVersion = message.version || ENGINE_VERSION;
      engine = createEngine(message.records || message.data || [], {version: indexVersion});
      self.postMessage({type: 'ready', requestId, version: indexVersion, stats: engine.stats});
      return;
    }
    if (!engine) throw new Error('Search index is not initialized.');
    if (message.version && message.version !== indexVersion) {
      self.postMessage({type: 'stale', requestId, version: indexVersion});
      return;
    }
    if (message.type === 'search' || message.type === 'legacy') {
      const result = message.type === 'legacy' ? engine.legacySearch(message.query, message.options) : engine.search(message.query, message.options);
      self.postMessage({type: 'result', method: message.type, requestId, version: indexVersion, result});
    } else if (message.type === 'compare') {
      const result = engine.search(message.query, message.options);
      const legacyResult = engine.legacySearch(message.query, message.options);
      self.postMessage({type: 'result', method: 'compare', requestId, version: indexVersion, result, legacyResult});
    } else throw new Error(`Unknown search message: ${String(message.type)}`);
  } catch (error) {
    self.postMessage({type: 'error', requestId, version: indexVersion, error: error instanceof Error ? error.message : String(error)});
  }
});
