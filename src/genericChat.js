// Druid Generic Chat client — lets the MCP send test messages to an AI Agent
// through the "Druid Generic Chat" channel and read its replies.
//
// Docs: https://docs.druidai.com/docs/Content/Channels/Druid_Generic_Chat.htm
//
// The channel dialog in the portal (AI Agent settings -> Channels -> "Druid Generic Chat")
// shows the two URLs this client needs. They live on DIFFERENT hosts than the portal:
//
//   Authorize URL : https://druidapi.<domain>/api/services/app/Chat/AuthorizeAnonymousAsync
//   AI Agent URL  : https://druidbotapp-po<N>.<domain>/api/generic-chat/{botId}/messages
//   Long polling  : <AI Agent URL>/getMessages
//
// Paste them with chat_set_endpoints (or CHAT_AUTHORIZE_URL / CHAT_AGENT_URL in .env)
// for an exact match. If you don't, the client probes a short list of candidates
// derived from API_BASE_URL and from the authorize response, and pins whichever works.

import fetch from 'node-fetch';
import { getToken, apiFetch } from './auth.js';

export const CHANNEL_ID = 'GenericChat';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const AUTHORIZE_PATH = '/api/services/app/Chat/AuthorizeAnonymousAsync';

// botId (lowercase) -> session
const sessions = new Map();
// botId (lowercase) | '*' -> { authorizeUrl, agentUrl }
const endpointOverrides = new Map();

function portalBase() {
  return (process.env.API_BASE_URL || '').replace(/\/+$/, '');
}

function trim(text, max = 500) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function parseUrl(url) {
  try { return new URL(url); } catch { return null; }
}

function uniq(list) {
  return [...new Set(list.filter(Boolean))];
}

/* ------------------------------------------------------------------ *
 * Endpoint configuration
 * ------------------------------------------------------------------ */

export function setEndpoints(botId, { authorizeUrl, agentUrl } = {}) {
  const key = botId ? String(botId).toLowerCase() : '*';
  const current = endpointOverrides.get(key) ?? {};
  if (authorizeUrl) current.authorizeUrl = authorizeUrl.trim();
  if (agentUrl)     current.agentUrl     = agentUrl.trim();
  endpointOverrides.set(key, current);
  return { scope: botId ?? 'all bots', ...current };
}

export function getEndpointOverrides() {
  return [...endpointOverrides.entries()].map(([scope, v]) => ({
    scope: scope === '*' ? 'all bots' : scope, ...v
  }));
}

export function clearEndpoints(botId) {
  return endpointOverrides.delete(botId ? String(botId).toLowerCase() : '*');
}

function overrideFor(botId) {
  const own = endpointOverrides.get(String(botId).toLowerCase()) ?? {};
  const all = endpointOverrides.get('*') ?? {};
  return {
    authorizeUrl: own.authorizeUrl ?? all.authorizeUrl ?? process.env.CHAT_AUTHORIZE_URL,
    agentUrl:     own.agentUrl     ?? all.agentUrl     ?? process.env.CHAT_AGENT_URL
  };
}

/** Swap the first DNS label, e.g. mytenant.eu.druidplatform.com -> druidapi.eu.druidplatform.com */
function swapFirstLabel(url, label) {
  const u = parseUrl(url);
  if (!u) return null;
  const parts = u.hostname.split('.');
  if (parts.length < 3) return null;
  parts[0] = label;
  return `${u.protocol}//${parts.join('.')}`;
}

function originOf(url) {
  const u = parseUrl(url);
  return u ? u.origin : null;
}

/** Candidate authorize URLs, best guess first. */
function authorizeCandidates(botId) {
  const { authorizeUrl } = overrideFor(botId);
  const explicit = authorizeUrl
    ? (/AuthorizeAnonymousAsync/i.test(authorizeUrl)
        ? authorizeUrl
        : `${authorizeUrl.replace(/\/+$/, '')}${AUTHORIZE_PATH}`)
    : null;

  const portal = portalBase();
  const druidapi = swapFirstLabel(portal, 'druidapi');

  return uniq([
    explicit,
    portal   ? `${portal}${AUTHORIZE_PATH}`   : null,
    druidapi ? `${druidapi}${AUTHORIZE_PATH}` : null
  ]);
}

/**
 * Normalize whatever was pasted into the base of the messages endpoint:
 * ".../api/generic-chat/{botId}" (no trailing /messages).
 */
function normalizeAgentUrl(raw, botId) {
  if (!raw) return null;
  let u = raw.trim().replace(/\{\{?botId\}\}?/gi, botId).replace(/\/+$/, '');
  u = u.replace(/\/getmessages$/i, '').replace(/\/messages$/i, '');
  if (!/\/api\/generic-chat\//i.test(u)) {
    const origin = originOf(u) ?? u;
    u = `${origin}/api/generic-chat/${botId}`;
  }
  return u;
}

/** Candidate bot-app bases, best guess first. `dto` is the authorize response, if we have it. */
function agentCandidates(botId, authorizeUrl, dto) {
  const { agentUrl } = overrideFor(botId);
  const list = [normalizeAgentUrl(agentUrl, botId)];

  // The authorize response sometimes carries the runtime host.
  for (const hint of [dto?.serviceUrl, dto?.domain]) {
    const origin = originOf(hint);
    if (origin && /druid/i.test(origin) && !/directline|botframework/i.test(origin)) {
      list.push(`${origin}/api/generic-chat/${botId}`);
    }
  }

  // Portal convention: druidapi.<domain> -> druidbotapp-po<N>.<domain>
  const index = Number.isInteger(dto?.otherServicesEndpointIndex) ? dto.otherServicesEndpointIndex : 0;
  for (const base of [authorizeUrl, portalBase()]) {
    const derived = swapFirstLabel(base, `druidbotapp-po${index}`);
    if (derived) list.push(`${derived}/api/generic-chat/${botId}`);
  }

  const portal = portalBase();
  if (portal) list.push(`${portal}/api/generic-chat/${botId}`);

  return uniq(list);
}

/* ------------------------------------------------------------------ *
 * HTTP
 * ------------------------------------------------------------------ */

async function postJson(url, body, { bearer } = {}) {
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {})
      },
      body: JSON.stringify(body)
    });
  } catch (err) {
    const code = err.cause?.code ?? err.code ?? err.message;
    return { url, ok: false, unreachable: true, status: 0, error: code, data: null, text: String(code) };
  }

  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = null; } }
  return {
    url,
    ok: res.ok,
    status: res.status,
    contentType: res.headers.get('content-type') ?? null,
    data,
    text
  };
}

/** Compact description of a raw HTTP response, for when nothing parses into activities. */
export function describeResponse(res) {
  if (!res) return null;
  return {
    url:         res.url,
    status:      res.status,
    contentType: res.contentType,
    bodyLength:  res.text ? res.text.length : 0,
    body:        res.text ? trim(res.text, 800) : '(empty body)'
  };
}

/** true when the response means "wrong host / not this endpoint" — keep probing. */
function shouldTryNext(res) {
  return res.unreachable || res.status === 404 || res.status === 405 || res.status === 501 || res.status === 502;
}

/* ------------------------------------------------------------------ *
 * Authorize
 * ------------------------------------------------------------------ */

export async function authorize(botId, opts = {}) {
  const body = {
    botId,
    channelId: CHANNEL_ID,
    queryString: opts.queryString ?? ''
  };
  if (opts.userId)         body.userId = opts.userId;
  if (opts.conversationId) body.conversationId = opts.conversationId;

  const candidates = authorizeCandidates(botId);
  if (!candidates.length) {
    throw new Error('No authorize URL. Set API_BASE_URL, or pass the Authorize URL from the channel dialog to chat_set_endpoints.');
  }

  const tried = [];
  for (const url of candidates) {
    let res = await postJson(url, body);

    // The endpoint is anonymous, but some deployments still want an identity.
    if (!res.ok && (res.status === 401 || res.status === 403)) {
      let adminToken = null;
      try { adminToken = await getToken(); } catch { /* no creds configured */ }
      if (adminToken) res = await postJson(url, body, { bearer: adminToken });
    }

    if (shouldTryNext(res)) {
      tried.push(`${url} -> ${res.unreachable ? res.error : res.status}`);
      continue;
    }

    if (!res.ok) {
      throw new Error(`Generic Chat authorize failed at ${url} (${res.status}): ${trim(res.text)}`);
    }

    const dto = res.data?.result ?? res.data;
    if (!dto || !dto.token) {
      throw new Error(
        `Generic Chat authorize returned no token from ${url}. Check that the "Druid Generic Chat" ` +
        `channel is added AND published on AI Agent ${botId}. Response: ${trim(res.text)}`
      );
    }
    return { dto, authorizeUrl: url };
  }

  throw new Error(
    `Could not reach the authorize endpoint. Tried:\n  ${tried.join('\n  ')}\n` +
    `Copy the "Authorize URL" from the agent's Druid Generic Chat channel dialog and pass it to chat_set_endpoints.`
  );
}

/* ------------------------------------------------------------------ *
 * Sessions
 * ------------------------------------------------------------------ */

export async function getSession(botId, opts = {}) {
  const key = String(botId).toLowerCase();
  let existing = sessions.get(key);

  if (opts.reset) {
    sessions.delete(key);
    existing = null;
  }

  if (existing && Date.now() < existing.tokenExpiresAt - 60_000) {
    return existing;
  }

  // Token lives 1h. On refresh, reuse conversationId/userId so context is kept.
  const { dto, authorizeUrl } = await authorize(botId, {
    queryString:    opts.queryString ?? existing?.queryString ?? '',
    userId:         existing?.userId ?? opts.userId,
    conversationId: existing?.conversationId
  });

  const expiresInSec = dto.tokenExpiresIn > 0 ? dto.tokenExpiresIn : 3600;
  const session = {
    botId,
    key,
    botName:        dto.botDto?.name ?? dto.botDto?.displayName ?? null,
    userId:         dto.userId,
    conversationId: dto.conversationId,
    token:          dto.token,
    tokenExpiresAt: Date.now() + expiresInSec * 1000,
    queryString:    opts.queryString ?? existing?.queryString ?? '',
    createdAt:      existing?.createdAt ?? new Date().toISOString(),
    turns:          existing?.turns ?? 0,
    authorizeUrl,
    agentBase:      existing?.agentBase ?? null,             // pinned once a call succeeds
    agentCandidates: agentCandidates(botId, authorizeUrl, dto)
  };

  sessions.set(key, session);
  return session;
}

export function listSessions() {
  return [...sessions.values()].map(publicSession);
}

export function dropSession(botId) {
  return sessions.delete(String(botId).toLowerCase());
}

export function dropAllSessions() {
  const n = sessions.size;
  sessions.clear();
  return n;
}

export function publicSession(s) {
  return {
    botId:             s.botId,
    botName:           s.botName,
    conversationId:    s.conversationId,
    userId:            s.userId,
    channelId:         CHANNEL_ID,
    createdAt:         s.createdAt,
    turns:             s.turns,
    tokenExpiresInSec: Math.max(0, Math.round((s.tokenExpiresAt - Date.now()) / 1000)),
    authorizeUrl:      s.authorizeUrl,
    agentUrl:          s.agentBase ? `${s.agentBase}/messages` : null
  };
}

/* ------------------------------------------------------------------ *
 * Activities
 * ------------------------------------------------------------------ */

/** Normalize whatever the runtime returns into a flat array of activities. */
export function toActivities(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data.flatMap(toActivities);
  if (Array.isArray(data.activities)) return data.activities;
  if (Array.isArray(data.messages))   return data.messages;
  if (Array.isArray(data.result))     return data.result;
  if (data.result && typeof data.result === 'object') return toActivities(data.result);
  if (typeof data === 'object' && (data.text || data.type || data.attachments)) return [data];
  return [];
}

/** Compact, human-readable view of a bot reply. */
export function summarize(activity) {
  const out = {};
  if (activity.text) out.text = activity.text;
  if (activity.speak && activity.speak !== activity.text) out.speak = activity.speak;

  const actions = activity.suggestedActions?.actions ?? activity.suggestedActions;
  if (Array.isArray(actions) && actions.length) {
    out.choices = actions.map(a => a?.title ?? a?.value ?? a).filter(Boolean);
  }

  if (Array.isArray(activity.attachments) && activity.attachments.length) {
    out.attachments = activity.attachments.map(a => ({
      contentType: a.contentType,
      name:        a.name ?? a.content?.title ?? undefined,
      contentUrl:  a.contentUrl ?? undefined
    }));
  }

  if (activity.type && activity.type !== 'message') out.type = activity.type;
  return out;
}

function isMeaningful(activity) {
  if (!activity || typeof activity !== 'object') return false;
  if (activity.type === 'typing') return false;
  if (activity.type && !['message', 'event'].includes(activity.type)) return true;
  return Boolean(activity.text || activity.attachments?.length || activity.suggestedActions);
}

export function filterActivities(activities) {
  return activities.filter(isMeaningful);
}

/* ------------------------------------------------------------------ *
 * Send / poll
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * ConversationHistory fallback
 *
 * Some runtimes answer the synchronous POST with an empty activity
 * envelope and produce the real reply a few seconds later (LLM/agentic
 * steps). When the agent also has no /getMessages route, the replies are
 * still recorded against the conversation in ConversationHistory — so we
 * read them from there. Needs the admin API credentials (set_config).
 * ------------------------------------------------------------------ */

/** One page of bot-authored Generic Chat messages for this conversation. */
async function fetchHistoryPage(session) {
  const params = new URLSearchParams();
  params.set('QueryParams.BotId',          session.botId);
  params.set('QueryParams.ConversationId', session.conversationId);
  params.set('PageSize',   '50');
  params.set('PageNumber', '1');

  const data = await apiFetch(`/api/services/app/ConversationHistory/GetAdminConversationHistoryPaged?${params}`);
  const items = (data.result ?? data)?.items ?? [];

  return items.filter(i =>
    i.originator === 1 &&                       // the agent, not us
    i.channelId === 'generic-chat' &&           // not the DirectLine mirror
    i.message &&
    !i.isSystemMessage
  );
}

/** Shape a history row like an activity, so replies look the same either way. */
function historyRowToActivity(row) {
  return {
    type: 'message',
    text: row.message,
    channelId: CHANNEL_ID,
    source: 'conversation-history',
    flowName: row.flowName ?? undefined,
    flowStepName: row.flowStepName ?? undefined,
    language: row.language ?? undefined,
    timestamp: row.dateUtc,
    historyId: row.id
  };
}

/**
 * Poll ConversationHistory until the agent goes quiet.
 * Only rows newer than what this session has already reported are returned.
 */
export async function readHistoryReplies(session, { waitSeconds = 20, intervalMs = 1500 } = {}) {
  const deadline = Date.now() + waitSeconds * 1000;
  const collected = [];
  let emptyStreak = 0;
  let polls = 0;
  let lastError = null;

  while (Date.now() < deadline) {
    polls += 1;
    let rows = [];
    try {
      rows = await fetchHistoryPage(session);
    } catch (err) {
      lastError = err.message;                  // no admin creds / API down
      break;
    }

    const fresh = rows
      .filter(r => r.id > (session.lastHistoryId ?? 0))
      .sort((a, b) => a.id - b.id);

    if (fresh.length) {
      session.lastHistoryId = fresh[fresh.length - 1].id;
      collected.push(...fresh.map(historyRowToActivity));
      emptyStreak = 0;
    } else {
      emptyStreak += 1;
      if (collected.length && emptyStreak >= 2) break;
    }

    await sleep(intervalMs);
  }

  return { activities: collected, polls, error: lastError };
}

/**
 * Mark everything already in the conversation as seen, so the next read
 * returns only what the agent says from now on.
 */
export async function markHistorySeen(session) {
  try {
    const rows = await fetchHistoryPage(session);
    session.lastHistoryId = rows.reduce((m, r) => Math.max(m, r.id), session.lastHistoryId ?? 0);
  } catch {
    // fallback unavailable; the caller surfaces the error if it is needed
  }
}

/**
 * POST to the AI Agent URL, probing candidate hosts on the first call
 * and pinning the one that answers.
 */
async function callAgent(session, suffix, body) {
  // Pin per endpoint kind: on some deployments /messages and /messages/getMessages
  // are not served by the same host, so a host proven for one must not
  // short-circuit the search for the other.
  session.pinned = session.pinned ?? {};

  const pinned = session.pinned[suffix];
  const bases = pinned
    ? [pinned]
    : uniq([session.agentBase, ...session.agentCandidates]);

  if (!bases.length) {
    throw new Error('No AI Agent URL. Copy it from the Druid Generic Chat channel dialog and pass it to chat_set_endpoints.');
  }

  const tried = [];
  for (const base of bases) {
    const url = `${base}${suffix}`;
    let res = await postJson(url, body, { bearer: session.token });

    if (res.status === 401) {
      const fresh = await getSession(session.botId, {});
      res = await postJson(url, body, { bearer: fresh.token });
    }

    if (shouldTryNext(res)) {
      tried.push(`${url} -> ${res.unreachable ? res.error : res.status}`);
      continue;
    }

    if (!res.ok) {
      // A real answer from a reachable endpoint — report it rather than
      // masking it by probing on, but do not pin a failing host.
      throw new Error(`Generic Chat request failed at ${url} (${res.status}): ${trim(res.text)}`);
    }

    session.pinned[suffix] = base;
    if (suffix === '/messages') session.agentBase = base;
    return res;
  }

  const allNotFound = tried.every(t => t.endsWith('404'));
  const hint = (suffix.includes('getMessages') && allNotFound)
    ? `Every candidate returned 404 for getMessages. This runtime does not serve the long-polling ` +
      `endpoint documented for the Druid Generic Chat channel — use the synchronous path ` +
      `(longPolling=false); chat_send_message will read late replies from ConversationHistory.`
    : `Copy the "AI Agent URL" from the agent's Druid Generic Chat channel dialog and pass it to chat_set_endpoints.`;

  throw new Error(`Could not reach the AI Agent URL. Tried:\n  ${tried.join('\n  ')}\n${hint}`);
}

/** POST {agentUrl}  — synchronous send */
export async function sendActivity(session, text, { timeout = 50 } = {}) {
  const res = await callAgent(session, '/messages', {
    type: 'message',
    channelId: CHANNEL_ID,
    conversation: { id: session.conversationId },
    from: { id: session.userId },
    text,
    attachments: [],
    timeout
  });

  session.turns += 1;
  return { activities: toActivities(res.data), http: res };
}

/** POST {agentUrl}/getMessages — long polling */
export async function pollMessages(session) {
  const res = await callAgent(session, '/messages/getMessages', {
    conversationId: session.conversationId
  });
  return { activities: toActivities(res.data), http: res };
}

/**
 * Poll until the agent goes quiet: stops after `waitSeconds`, or once
 * something was received and two consecutive polls come back empty.
 */
export async function drainMessages(session, { waitSeconds = 15, intervalMs = 1000 } = {}) {
  const deadline = Date.now() + waitSeconds * 1000;
  const collected = [];
  let emptyStreak = 0;
  let lastHttp = null;
  let polls = 0;

  while (Date.now() < deadline) {
    const { activities, http } = await pollMessages(session);
    lastHttp = http;
    polls += 1;

    const batch = filterActivities(activities);
    if (batch.length) {
      collected.push(...batch);
      emptyStreak = 0;
    } else {
      emptyStreak += 1;
      if (collected.length && emptyStreak >= 2) break;
    }
    await sleep(intervalMs);
  }

  return { activities: collected, http: lastHttp, polls };
}
