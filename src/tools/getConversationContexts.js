import fs from 'node:fs/promises';
import path from 'node:path';
import { apiFetch } from '../auth.js';

async function fetchAllMessages({ botId, conversationId, correlationId, decryptSensitiveData, pageSize }) {
  const all = [];
  let pageNumber = 1;
  while (true) {
    const params = new URLSearchParams();
    params.set('QueryParams.BotId', botId);
    if (conversationId) params.set('QueryParams.ConversationId', conversationId);
    if (correlationId)  params.set('QueryParams.CorrelationId',  correlationId);
    if (decryptSensitiveData != null) params.set('QueryParams.DecryptSensitiveData', String(decryptSensitiveData));
    params.set('PageSize',   String(pageSize));
    params.set('PageNumber', String(pageNumber));

    const data = await apiFetch(`/api/services/app/ConversationHistory/GetAdminConversationHistoryPaged?${params}`);
    const body  = data.result ?? data;
    const items = body.items ?? [];
    all.push(...items);
    const total = body.totalCount ?? all.length;
    if (all.length >= total || items.length === 0) break;
    pageNumber++;
    if (pageNumber > 200) break; // safety cap (200 pages × pageSize)
  }
  return all;
}

async function fetchActivityDebugDetail({ botId, activityId, correlationId, pageSize }) {
  const params = new URLSearchParams();
  params.set('QueryParams.BotId', botId);
  if (activityId)    params.set('QueryParams.ActivityId',    activityId);
  if (correlationId) params.set('QueryParams.CorrelationId', correlationId);
  params.set('PageSize',   String(pageSize));
  params.set('PageNumber', '1');

  const data = await apiFetch(`/api/services/app/DebuggingTool/GetDebuggingToolChatActivityDetailPaged?${params}`);
  const body = data.result ?? data;
  return {
    integrations:     body.integrations     ?? [],
    nluHistory:       body.nluHistory       ?? [],
    conversationPath: body.conversationPath ?? []
  };
}

async function fetchIntegrationLog({ botId, correlationId, pageSize }) {
  const all = [];
  let pageNumber = 1;
  while (true) {
    const params = new URLSearchParams();
    params.set('botId',         botId);
    params.set('correlationId', correlationId);
    params.set('pageSize',      String(pageSize));
    params.set('pageNumber',    String(pageNumber));

    const data  = await apiFetch(`/api/services/app/DebuggingTool/GetDebuggingToolChatActivityDetailMessageIntegrationLog?${params}`);
    const body  = data.result ?? data;
    const items = body.items ?? [];
    all.push(...items);
    const total = body.totalCount ?? all.length;
    if (all.length >= total || items.length === 0) break;
    pageNumber++;
    if (pageNumber > 200) break;
  }
  return all;
}

async function fetchHistoryRecord(id) {
  try {
    const params = new URLSearchParams();
    params.set('id', String(id));
    const data = await apiFetch(`/api/services/app/ConnectorAction/GetHistoryDataById?${params}`);
    const body = data.result ?? data;
    return body.data ?? body;
  } catch (err) {
    return { __error: err.message };
  }
}

export const getConversationContextsTool = {
  name: 'get_conversation_contexts',
  description: 'One-call aggregator: fetch every integration (connector execution) context for a conversation. Pages messages from ConversationHistory, groups them into turns, then per-turn calls /DebuggingTool/GetDebuggingToolChatActivityDetailMessageIntegrationLog?botId=&correlationId= (the same endpoint the Druid UI uses to list connector executions) to get connector history rows, then /ConnectorAction/GetHistoryDataById per row for the full request/response payload. Optionally also captures NLU history + conversation path. Returns a compact tree, or (with saveToFile) writes a { response, messages, nluHistory, flowPath } file and returns just a summary with diagnostics.',
  inputSchema: {
    type: 'object',
    properties: {
      botId:                { type: 'string', description: 'Bot ID (UUID)' },
      conversationId:       { type: 'string', description: 'Conversation ID (string). One of conversationId or correlationId is required.' },
      correlationId:        { type: 'string', description: 'Limit to a single turn by correlationId (UUID). Optional.' },
      includePayloads:      { type: 'boolean', description: 'If true (default), fetch request/response payloads for every integration. Set false to get just the metadata (much smaller, faster).', default: true },
      onlyErrors:           { type: 'boolean', description: 'If true, return only integrations where isError=true.', default: false },
      integrationNameFilter:{ type: 'string', description: 'Case-insensitive substring filter on connectorActionName / connectorTaskName. Optional.' },
      maxTurns:             { type: 'number', description: 'Safety cap on the number of turns processed (default 50). Excess turns appear in result with truncated:true.', default: 50 },
      decryptSensitiveData: { type: 'boolean', description: 'Pass-through to the history endpoint (optional).' },
      pageSize:             { type: 'number', description: 'Page size for the underlying paged calls (default 100).', default: 100 },
      saveToFile:           { description: 'Save a context dump locally instead of returning the full tree in chat. true → auto-named file under ./dumps/. Pass a string for a custom file path (absolute or relative to server cwd). When set, includePayloads and includeContext are both forced to true. File format: { response: [...deduped entities], messages: [...], nluHistory: [...], flowPath: [...] } — request payloads/task content are skipped; entities deduped by $entityTypeName$, keeping the latest by creationTime. Returns only a summary.' },
      includeContext:       { type: 'boolean', description: 'If true, also fetch NLU history and conversation path per turn from /DebuggingTool/GetDebuggingToolChatActivityDetailPaged. Forced to true when saveToFile is set; default false otherwise (to keep chat results small).', default: false }
    },
    required: ['botId']
  },
  async execute(args) {
    const {
      botId,
      conversationId,
      correlationId,
      onlyErrors = false,
      integrationNameFilter,
      maxTurns = 50,
      decryptSensitiveData,
      pageSize = 100,
      saveToFile
    } = args;
    // When saving to file we MUST fetch payloads and extra context; otherwise honor user choice.
    const includePayloads = saveToFile ? true : (args.includePayloads ?? true);
    const includeContext  = saveToFile ? true : (args.includeContext  ?? false);

    if (!conversationId && !correlationId) {
      throw new Error('Either conversationId or correlationId is required');
    }

    const messages = await fetchAllMessages({
      botId, conversationId, correlationId, decryptSensitiveData, pageSize
    });

    // Group messages by activityId (one activity = one turn).
    const turnsMap = new Map();
    for (const m of messages) {
      const key = m.activityId || m.correlationId || `msg-${m.id}`;
      if (!turnsMap.has(key)) {
        turnsMap.set(key, {
          activityId:    m.activityId,
          correlationId: m.correlationId,
          dateUtc:       m.dateUtc,
          messages:      []
        });
      }
      const turn = turnsMap.get(key);
      // earliest dateUtc wins
      if (m.dateUtc && (!turn.dateUtc || m.dateUtc < turn.dateUtc)) turn.dateUtc = m.dateUtc;
      turn.messages.push({
        id:            m.id,
        originator:    m.originator,
        message:       m.message,
        flowName:      m.flowName,
        flowStepName:  m.flowStepName,
        flowStepType:  m.flowStepType,
        status:        m.status,
        dateUtc:       m.dateUtc,
        isSystemMessage: m.isSystemMessage
      });
    }

    const turns = [...turnsMap.values()]
      .sort((a, b) => (a.dateUtc ?? '').localeCompare(b.dateUtc ?? ''));

    const truncated = turns.length > maxTurns;
    const processedTurns = turns.slice(0, maxTurns);

    // Step 2: discover integration records via /DebuggingTool/GetDebuggingToolChatActivityDetailMessageIntegrationLog.
    // A conversation turn can span MULTIPLE correlationIds (each connector execution gets its own),
    // so collect every unique correlationId across all messages and fetch one log per unique correlation.
    let integrationLogCalls = 0, integrationLogHits = 0;
    let turnsWithContext = 0;
    const idToRecord = new Map(); // record.id -> { meta }
    const idToCorr   = new Map(); // record.id -> correlationId (for grouping back to turns)
    const corrToTurn = new Map(); // every correlationId on any message -> its turn

    for (const turn of processedTurns) {
      turn.integrations = [];
      for (const m of turn.messages) {
        if (m.correlationId && !corrToTurn.has(m.correlationId)) {
          corrToTurn.set(m.correlationId, turn);
        }
      }
    }

    // Always query the user-supplied correlationId, even if no message references it
    // (a connector execution can have a different correlationId than the surrounding messages).
    const allCorrs = [...new Set([
      ...corrToTurn.keys(),
      ...(correlationId ? [correlationId] : [])
    ])];

    await Promise.all(allCorrs.map(async (corr) => {
      integrationLogCalls++;
      try {
        const items = await fetchIntegrationLog({ botId, correlationId: corr, pageSize });
        for (const it of items) {
          integrationLogHits++;
          if (it.id != null && !idToRecord.has(it.id)) {
            idToRecord.set(it.id, { meta: it });
            idToCorr.set(it.id, it.correlationId ?? corr);
          }
        }
      } catch (err) {
        const turn = corrToTurn.get(corr);
        if (turn) turn.integrationLogError = err.message;
      }
    }));

    // Optional: NLU history + conversation path from the activity-detail endpoint, per turn (parallel).
    if (includeContext) {
      await Promise.all(processedTurns.map(async (turn) => {
        const corr = turn.correlationId
                  ?? turn.messages.find(m => m.correlationId)?.correlationId
                  ?? null;
        const aid = turn.activityId ?? null;
        if (!aid && !corr) return;
        try {
          const detail = await fetchActivityDebugDetail({
            botId, activityId: aid, correlationId: corr, pageSize
          });
          turn.nluHistory       = detail.nluHistory;
          turn.conversationPath = detail.conversationPath;
          turnsWithContext++;
        } catch (err) {
          turn.contextError = err.message;
        }
      }));
    }

    // Step 3: for each unique integration id, fetch the full record (payload included).
    const recordPayloads = new Map();
    if (includePayloads && idToRecord.size > 0) {
      await Promise.all([...idToRecord.keys()].map(async (id) => {
        const rec = await fetchHistoryRecord(id);
        if (rec && !rec.__error) recordPayloads.set(id, rec);
      }));
    }

    // Step 4: map records back onto turns by correlationId. corrToTurn was built earlier
    // from every message's correlationId, so multi-correlation turns are covered.
    const looseIntegrations = [];
    for (const [id, { meta }] of idToRecord) {
      const corr    = idToCorr.get(id);
      const payload = recordPayloads.get(id);
      const integration = {
        id,
        connectorActionId:    meta.connectorActionId    ?? payload?.connectorActionId,
        connectorActionName:  meta.connectorActionName  ?? payload?.connectorActionName,
        connectorTaskId:      meta.connectorTaskId      ?? payload?.connectorTaskId,
        connectorTaskName:    meta.connectorTaskName    ?? payload?.connectorTaskName,
        isError:              meta.isError              ?? payload?.isError ?? null,
        duration:             meta.duration             ?? payload?.duration ?? null,
        creationTime:         meta.creationTime         ?? payload?.creationTime,
        executionId:          meta.executionId          ?? payload?.executionId,
        correlationId:        corr
      };
      if (includePayloads) {
        integration.request = {
          entityContent: payload?.requestEntityContent ?? null,
          taskContent:   payload?.requestTaskContent   ?? null
        };
        integration.response = {
          entityContent: payload?.responseEntityContent ?? null,
          taskContent:   payload?.responseTaskContent   ?? null
        };
        if (!payload) integration.payloadError = 'GetHistoryDataById returned no record';
      }
      const target = corr ? corrToTurn.get(corr) : null;
      if (target) target.integrations.push(integration);
      else        looseIntegrations.push(integration);
    }
    if (looseIntegrations.length > 0) {
      processedTurns.push({
        activityId:    null,
        correlationId: null,
        dateUtc:       null,
        messages:      [],
        integrations:  looseIntegrations,
        loose:         true
      });
    }

    // Apply per-turn filters.
    const filterIntegration = (i) => {
      if (onlyErrors && !i.isError) return false;
      if (integrationNameFilter) {
        const f = integrationNameFilter.toLowerCase();
        if (!(i.connectorActionName ?? '').toLowerCase().includes(f)
         && !(i.connectorTaskName   ?? '').toLowerCase().includes(f)) return false;
      }
      return true;
    };
    const rawIntegrationsBeforeFilter = processedTurns.reduce((n, t) => n + t.integrations.length, 0);
    for (const turn of processedTurns) {
      turn.integrations = turn.integrations.filter(filterIntegration);
    }

    // Payloads are already inline on each integration (GetHistoryDataById returned them).
    // If includePayloads is false, strip them to keep the chat response small.
    if (!includePayloads) {
      for (const turn of processedTurns) {
        for (const integration of turn.integrations ?? []) {
          delete integration.request;
          delete integration.response;
        }
      }
    }

    const totalIntegrations = processedTurns.reduce((n, t) => n + (t.integrations?.length ?? 0), 0);

    if (saveToFile) {
      // Dedup response entities by $entityTypeName$, keeping the latest by creationTime.
      const entityMap = new Map(); // typeName -> { entity, creationTime }
      let parseErrors = 0;
      let missingTypeName = 0;
      for (const turn of processedTurns) {
        for (const integration of turn.integrations ?? []) {
          const raw = integration.response?.entityContent;
          if (!raw) continue;
          let entity;
          try { entity = JSON.parse(raw); }
          catch { parseErrors++; continue; }
          const typeName = entity?.$entityTypeName$;
          if (!typeName) { missingTypeName++; continue; }
          const ts = integration.creationTime ?? '';
          const existing = entityMap.get(typeName);
          if (!existing || ts > existing.creationTime) {
            entityMap.set(typeName, { entity, creationTime: ts });
          }
        }
      }
      const fileContent = {
        response: [...entityMap.values()].map(v => v.entity),
        messages: processedTurns.flatMap(t =>
          (t.messages ?? []).map(m => ({
            turnActivityId:    t.activityId    ?? null,
            turnCorrelationId: t.correlationId ?? null,
            id:                m.id,
            originator:        m.originator,
            message:           m.message,
            flowName:          m.flowName,
            flowStepName:      m.flowStepName,
            flowStepType:      m.flowStepType,
            status:            m.status,
            dateUtc:           m.dateUtc,
            isSystemMessage:   m.isSystemMessage
          }))),
        nluHistory: processedTurns.flatMap(t =>
          (t.nluHistory ?? []).map(n => ({
            turnActivityId:    t.activityId    ?? null,
            turnCorrelationId: t.correlationId ?? null,
            ...n
          }))),
        flowPath: processedTurns.flatMap(t =>
          (t.conversationPath ?? []).map(p => ({
            turnActivityId:    t.activityId    ?? null,
            turnCorrelationId: t.correlationId ?? null,
            ...p
          })))
      };

      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const idPart = (conversationId ?? correlationId ?? 'unknown').replace(/[^a-zA-Z0-9-]/g, '_');
      const defaultName = `${botId}-${idPart}-${stamp}.json`;
      const filePath = (typeof saveToFile === 'string' && saveToFile.length > 0)
        ? (path.isAbsolute(saveToFile) ? saveToFile : path.resolve(process.cwd(), saveToFile))
        : path.resolve(process.cwd(), 'dumps', defaultName);

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      const json = JSON.stringify(fileContent, null, 2);
      await fs.writeFile(filePath, json, 'utf8');

      return {
        savedTo:                filePath,
        fileSizeBytes:          Buffer.byteLength(json, 'utf8'),
        botId,
        conversationId:         conversationId ?? null,
        correlationId:          correlationId  ?? null,
        totalMessages:          messages.length,
        totalTurns:             turns.length,
        processedTurns:         processedTurns.length,
        truncated,
        totalIntegrations,
        rawIntegrationsBeforeFilter,
        uniqueIntegrationIds:   idToRecord.size,
      integrationLogCalls,
      integrationLogHits,
      payloadsFetched:        recordPayloads.size,
      payloadsMissing:        idToRecord.size - recordPayloads.size,
      looseIntegrations:      looseIntegrations.length,
      turnsWithContext,
        uniqueResponseEntities: entityMap.size,
        entityTypes:            [...entityMap.keys()],
        messagesInFile:         fileContent.messages.length,
        nluHistoryInFile:       fileContent.nluHistory.length,
        flowPathInFile:         fileContent.flowPath.length,
        skippedParseErrors:     parseErrors,
        skippedMissingTypeName: missingTypeName
      };
    }

    return {
      botId,
      conversationId: conversationId ?? null,
      correlationId:  correlationId  ?? null,
      totalMessages:  messages.length,
      totalTurns:     turns.length,
      processedTurns: processedTurns.length,
      truncated,
      totalIntegrations,
      rawIntegrationsBeforeFilter,
      uniqueIntegrationIds:   idToRecord.size,
      debugCalls,
      debugIntegrationsFound,
      historyCalls,
      historyIntegrationsFound,
      payloadsFetched:        recordPayloads.size,
      payloadsMissing:        idToRecord.size - recordPayloads.size,
      looseIntegrations:      looseIntegrations.length,
      turnsWithContext,
      turns: processedTurns
    };
  }
};
