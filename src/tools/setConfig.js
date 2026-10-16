// In-memory config store — values set here override process.env at runtime.
// The MCP client (e.g. Claude Desktop) can call set_config to update
// API_BASE_URL, API_USERNAME, and API_PASSWORD without restarting the server.

import { resetToken } from '../auth.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ENV_PATH = process.env.DRUID_ENV_FILE || join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.env');

export function readTenants() {
  const blocks = [];
  let cur = null;
  let label = null;
  for (const raw of readFileSync(ENV_PATH, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('#')) {
      const m = line.match(/^#+\s*(.*?)\s*#*$/);
      if (m && m[1]) label = m[1];
      continue;
    }
    const i = line.indexOf('=');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k === 'API_BASE_URL') {
      if (cur) blocks.push(cur);
      const host = v.replace(/^https?:\/\//, '').split('/')[0].split('.')[0];
      cur = { label, host, url: v, env: /(qa|dev|test|uat|stg|staging|sandbox)/i.test(host) ? 'development' : 'production' };
      label = null;
    } else if (cur && k === 'API_USERNAME') cur.username = v;
    else if (cur && k === 'API_PASSWORD') cur.password = v;
  }
  if (cur) blocks.push(cur);
  return blocks;
}

export const publicTenant = t => ({ label: t.label, host: t.host, env: t.env, url: t.url, username: t.username });

export const configStore = {};

export const setConfigTool = {
  name: 'set_config',
  description:
    'Update the API connection settings for this MCP server at runtime. ' +
    'Call this first if you need to change the base URL, username, or password ' +
    'without restarting the server.',
  inputSchema: {
    type: 'object',
    properties: {
      listTenants: { type: 'boolean', description: 'Return the tenants defined in .env (no passwords) without changing anything' },
      tenant:      { type: 'string', description: 'Tenant host (e.g. asiacellqa) or .env label (e.g. ASIACELL QA); credentials are loaded from .env server-side' },
      apiBaseUrl:  { type: 'string', description: 'Base URL of the Druid application, e.g. https://myapp.example.com' },
      apiUsername: { type: 'string', description: 'Username (or email) for authentication' },
      apiPassword: { type: 'string', description: 'Password for authentication' }
    }
  },
  async execute(args) {
    if (args.listTenants) {
      return { tenants: readTenants().map(publicTenant) };
    }

    if (args.tenant) {
      const q = args.tenant.trim().toLowerCase();
      const matches = readTenants().filter(t => t.host.toLowerCase() === q || (t.label || '').toLowerCase() === q);
      if (matches.length !== 1) {
        return { success: false, message: matches.length ? `Ambiguous tenant "${args.tenant}"` : `Unknown tenant "${args.tenant}"`, tenants: readTenants().map(publicTenant) };
      }
      const t = matches[0];
      configStore.API_BASE_URL = process.env.API_BASE_URL = t.url;
      configStore.API_USERNAME = process.env.API_USERNAME = t.username;
      configStore.API_PASSWORD = process.env.API_PASSWORD = t.password;
      resetToken();
      return { success: true, active: publicTenant(t), message: 'Tenant switched. Token cache cleared.' };
    }

    const changed = [];

    if (args.apiBaseUrl) {
      configStore.API_BASE_URL = args.apiBaseUrl;
      process.env.API_BASE_URL = args.apiBaseUrl;
      changed.push('API_BASE_URL');
    }
    if (args.apiUsername) {
      configStore.API_USERNAME = args.apiUsername;
      process.env.API_USERNAME = args.apiUsername;
      changed.push('API_USERNAME');
    }
    if (args.apiPassword) {
      configStore.API_PASSWORD = args.apiPassword;
      process.env.API_PASSWORD = args.apiPassword;
      changed.push('API_PASSWORD');
    }

    // Invalidate cached token so next API call re-authenticates
    if (changed.includes('API_USERNAME') || changed.includes('API_PASSWORD') || changed.includes('API_BASE_URL')) {
      resetToken();
    }

    return {
      success: true,
      updated: changed,
      message: changed.length
        ? `Updated: ${changed.join(', ')}. Token cache cleared.`
        : 'No values provided — nothing changed.'
    };
  }
};
