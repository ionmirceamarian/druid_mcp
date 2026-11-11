import { AsyncLocalStorage } from 'node:async_hooks';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash, generateKeyPairSync, privateDecrypt, createDecipheriv, constants } from 'node:crypto';
import { homedir } from 'node:os';

export const tenantContext = new AsyncLocalStorage();
export const configStore = {};

const localProfiles = {};
const registry = new Map();
const REGISTRY_TTL_MS = 24 * 60 * 60 * 1000;
const sealKeys = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

function unseal(sealed) {
  const o = JSON.parse(Buffer.from(String(sealed), 'base64').toString('utf8'));
  const key = privateDecrypt({ key: sealKeys.privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(o.k, 'base64'));
  const d = createDecipheriv('aes-256-gcm', key, Buffer.from(o.iv, 'base64'));
  d.setAuthTag(Buffer.from(o.t, 'base64'));
  return Buffer.concat([d.update(Buffer.from(o.d, 'base64')), d.final()]).toString('utf8');
}

function registryKey(p) {
  return createHash('sha256').update(`${p.baseUrl}\n${p.username}\n${p.password}`).digest('hex').slice(0, 24);
}

function registryGet(key) {
  const entry = registry.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { registry.delete(key); return null; }
  entry.expires = Date.now() + REGISTRY_TTL_MS;
  return entry.profile;
}
const API_KEYS = { API_BASE_URL: 'baseUrl', API_USERNAME: 'username', API_PASSWORD: 'password', API_2FA_REMEMBER: 'rememberBlob' };

function slug(label) {
  return String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function finish(p) {
  return { ...p, baseUrl: (p.baseUrl || '').replace(/\/+$/, '') };
}

export function parseEnvText(text) {
  const profiles = {};
  const plain = {};
  let label = null;
  let current = null;
  for (const raw of String(text).replace(/^﻿/, '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      const m = line.match(/^#+\s*(.*?)\s*#*$/);
      if (m && m[1]) { label = m[1]; current = null; }
      continue;
    }
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, '');
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);

    const pre = key.match(/^([A-Za-z0-9_]+?)_(API_BASE_URL|API_USERNAME|API_PASSWORD|API_2FA_REMEMBER)$/);
    if (pre) {
      const id = slug(pre[1]);
      profiles[id] = profiles[id] || { id };
      profiles[id][API_KEYS[pre[2]]] = val;
      continue;
    }
    if (API_KEYS[key] && label) {
      if (key === 'API_BASE_URL' || !current) {
        const id = slug(label);
        current = profiles[id] = { id, label };
      }
      current[API_KEYS[key]] = val;
      continue;
    }
    plain[key] = val;
  }
  for (const id of Object.keys(profiles)) profiles[id] = finish(profiles[id]);
  return { profiles, plain };
}

export function loadLocalEnv(fileUrl) {
  const path = fileURLToPath(fileUrl);
  if (!existsSync(path)) return;
  const { profiles, plain } = parseEnvText(readFileSync(path, 'utf8'));
  Object.assign(localProfiles, profiles);
  for (const [k, v] of Object.entries(plain)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

function serverProfiles() {
  const fromEnv = {};
  for (const key of Object.keys(process.env)) {
    const m = key.match(/^([A-Za-z0-9_]+?)_API_BASE_URL$/);
    if (!m) continue;
    const id = slug(m[1]);
    fromEnv[id] = finish({
      id,
      baseUrl:  process.env[`${m[1]}_API_BASE_URL`],
      username: process.env[`${m[1]}_API_USERNAME`],
      password: process.env[`${m[1]}_API_PASSWORD`],
      rememberBlob: process.env[`${m[1]}_API_2FA_REMEMBER`]
    });
  }
  return { ...fromEnv, ...localProfiles };
}

function sessionProfiles() {
  return tenantContext.getStore()?.profiles || new Map();
}

export function availableTenantIds() {
  return [...new Set([...sessionProfiles().keys(), ...Object.keys(serverProfiles())])];
}

export function getProfile(id, { includeSession = true } = {}) {
  const [base, handle] = String(id).split('@');
  const key = slug(base);
  const fromRegistry = includeSession && handle ? registryGet(handle) : null;
  const p = (fromRegistry && fromRegistry.id === key ? fromRegistry : null)
    || (!handle && includeSession && sessionProfiles().get(key))
    || (!handle && serverProfiles()[key]);
  if (!p) {
    const ids = includeSession ? availableTenantIds() : Object.keys(serverProfiles());
    throw new Error(`Unknown tenant "${id}". Available: ${ids.join(', ') || 'none'}. Call register_tenants and pass the returned id (e.g. asiacell-prod@<key>) as tenant.`);
  }
  return p;
}

export function resolveConfig() {
  const tenant = tenantContext.getStore()?.tenant;
  if (tenant) return getProfile(tenant);
  if (configStore.baseUrl) return { ...configStore };
  if (process.env.API_BASE_URL) {
    return {
      id: null,
      baseUrl:  process.env.API_BASE_URL.replace(/\/+$/, ''),
      username: process.env.API_USERNAME,
      password: process.env.API_PASSWORD,
      rememberBlob: process.env.API_2FA_REMEMBER
    };
  }
  throw new Error(`No tenant selected. Pass "tenant" (available: ${availableTenantIds().join(', ') || 'none'}) or call set_config.`);
}

export function isProd(cfg) {
  if (cfg.id) return !/-(dev|qa|test|uat|stg|staging|sandbox)$/.test(cfg.id);
  const host = cfg.baseUrl.replace(/^https?:\/\//, '').split('/')[0].split('.')[0];
  return !/(qa|dev|test|uat|stg|staging|sandbox)/i.test(host);
}

function describe(p, source) {
  return {
    tenant: p.handle ? `${p.id}@${p.handle}` : p.id,
    baseUrl: p.baseUrl,
    username: p.username,
    environment: isProd(p) ? 'production' : 'development',
    source
  };
}

export const listTenantsTool = {
  name: 'list_tenants',
  description: 'List the Druid tenants available to this connection: ones registered with register_tenants (visible only to this connection) and any configured on the server. Pass the id as "tenant" on any other tool call.',
  inputSchema: { type: 'object', properties: {} },
  async execute() {
    const session = sessionProfiles();
    const server = serverProfiles();
    return [
      ...[...session.values()].map(p => describe(p, 'this connection')),
      ...Object.values(server).filter(p => !session.has(p.id)).map(p => describe(p, 'server'))
    ];
  }
};

export const registrationKeyTool = {
  name: 'get_registration_key',
  description: 'Public key for sealing a local .env (scripts/seal-env.mjs) before register_tenants with envSealed, so credentials never pass through the chat in clear text. The key changes on every server restart.',
  inputSchema: { type: 'object', properties: {} },
  async execute() {
    return { publicKey: sealKeys.publicKey };
  }
};

export const registerTenantsTool = {
  name: 'register_tenants',
  description:
    'Register Druid tenants for this connection only, from the text of a local .env file. ' +
    'Accepts "### LABEL ###" blocks with API_BASE_URL/API_USERNAME/API_PASSWORD (id = slug of the label, e.g. ASIACELL PROD -> asiacell-prod) ' +
    'or prefixed keys like ASIACELL_PROD_API_BASE_URL. Returns private tenant ids like asiacell-prod@<key> (no passwords): pass that full id as "tenant" on later calls. ' +
    'The key is derived from the credentials, so only someone who registered the same credentials can use it, and re-registering returns the same id. ' +
    'Credentials stay in server memory only, never change the set_config default, expire after 24h unused, and are lost on server restart (register again then).',
  inputSchema: {
    type: 'object',
    properties: {
      envText: { type: 'string', description: 'Full text of the local .env file' },
      envSealed: { type: 'string', description: 'Output of scripts/seal-env.mjs: the local .env encrypted with the get_registration_key public key. Use when this server cannot read the .env file itself.' },
      envFile: { type: 'string', description: 'Path of a .env file on the machine running this server (~ allowed). The server reads it itself, so credentials never pass through the chat. Use instead of envText.' },
      labels: { type: 'array', items: { type: 'string' }, description: 'Only register these blocks, by label or id (e.g. "ASIACELL PROD" or "asiacell-prod"). Default: all.' }
    }
  },
  async execute(args) {
    const store = tenantContext.getStore();
    if (!store?.profiles) throw new Error('No connection context available');
    let text = args.envText || '';
    if (args.envSealed) {
      try {
        text = unseal(args.envSealed);
      } catch {
        throw new Error('envSealed could not be decrypted: the server restarted or the key is wrong. Call get_registration_key again and reseal.');
      }
    }
    if (args.envFile) {
      const path = String(args.envFile).replace(/^~(?=\/|$)/, homedir());
      if (!existsSync(path)) throw new Error(`envFile not found: ${path}. The path is read on the machine running this server; if the .env is elsewhere, use get_registration_key and envSealed.`);
      text = readFileSync(path, 'utf8');
    }
    const { profiles } = parseEnvText(text);
    const wanted = (args.labels || []).map(slug);
    const valid = Object.values(profiles)
      .filter(p => p.baseUrl && p.username && p.password)
      .filter(p => !wanted.length || wanted.includes(p.id));
    if (!valid.length) throw new Error('No complete tenant blocks (base URL, username, password) found in envText');
    for (const p of valid) {
      p.handle = registryKey(p);
      registry.set(p.handle, { profile: p, expires: Date.now() + REGISTRY_TTL_MS });
      store.profiles.set(p.id, p);
    }
    return valid.map(p => describe(p, 'this connection'));
  }
};
