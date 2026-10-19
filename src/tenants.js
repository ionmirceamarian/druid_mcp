import { AsyncLocalStorage } from 'node:async_hooks';

export const tenantContext = new AsyncLocalStorage();
export const configStore = {};

const DEV_HOST = /(qa|dev|test|uat|stg|staging|sandbox)/i;

export function listProfiles() {
  const profiles = {};
  for (const key of Object.keys(process.env)) {
    const m = key.match(/^([A-Z0-9_]+?)_API_BASE_URL$/);
    if (!m) continue;
    const prefix = m[1];
    const id = prefix.toLowerCase().replace(/_/g, '-');
    profiles[id] = {
      id,
      baseUrl:  (process.env[`${prefix}_API_BASE_URL`] || '').replace(/\/+$/, ''),
      username: process.env[`${prefix}_API_USERNAME`],
      password: process.env[`${prefix}_API_PASSWORD`]
    };
  }
  return profiles;
}

export function getProfile(id) {
  const profiles = listProfiles();
  const p = profiles[String(id).toLowerCase()];
  if (!p) throw new Error(`Unknown tenant "${id}". Available: ${Object.keys(profiles).join(', ')}`);
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
      password: process.env.API_PASSWORD
    };
  }
  throw new Error(`No tenant selected. Pass "tenant" (one of: ${Object.keys(listProfiles()).join(', ')}) or call set_config.`);
}

export function isProd(cfg) {
  if (cfg.id) return !/-(dev|qa|test|uat|stg|staging|sandbox)$/.test(cfg.id);
  const host = cfg.baseUrl.replace(/^https?:\/\//, '').split('/')[0].split('.')[0];
  return !DEV_HOST.test(host);
}

export const listTenantsTool = {
  name: 'list_tenants',
  description: 'List the Druid tenant profiles configured in .env (id, base URL, username, prod/dev). Pass the id as "tenant" on any other tool call.',
  inputSchema: { type: 'object', properties: {} },
  async execute() {
    return Object.values(listProfiles()).map(p => ({
      tenant: p.id,
      baseUrl: p.baseUrl,
      username: p.username,
      environment: isProd(p) ? 'production' : 'development'
    }));
  }
};
