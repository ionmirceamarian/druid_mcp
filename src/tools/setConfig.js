import { resetToken } from '../auth.js';
import { configStore, getProfile } from '../tenants.js';

export { configStore };

export const setConfigTool = {
  name: 'set_config',
  description:
    'Set the default Druid tenant for calls that do not pass "tenant". ' +
    'Prefer passing "tenant" on each call instead: the default is shared by every session using this server. ' +
    'Use either tenant (a profile id from list_tenants) or apiBaseUrl/apiUsername/apiPassword.',
  inputSchema: {
    type: 'object',
    properties: {
      tenant:      { type: 'string', description: 'Id of a tenant configured on the server (not one registered with register_tenants)' },
      apiBaseUrl:  { type: 'string', description: 'Base URL of the Druid application, e.g. https://myapp.example.com' },
      apiUsername: { type: 'string', description: 'Username (or email) for authentication' },
      apiPassword: { type: 'string', description: 'Password for authentication' }
    }
  },
  async execute(args) {
    const changed = [];

    if (args.tenant) {
      const p = getProfile(args.tenant, { includeSession: false });
      Object.assign(configStore, p);
      changed.push(`tenant=${p.id}`);
    }
    if (args.apiBaseUrl) {
      configStore.id = null;
      configStore.baseUrl = args.apiBaseUrl.replace(/\/+$/, '');
      changed.push('API_BASE_URL');
    }
    if (args.apiUsername) {
      configStore.username = args.apiUsername;
      changed.push('API_USERNAME');
    }
    if (args.apiPassword) {
      configStore.password = args.apiPassword;
      changed.push('API_PASSWORD');
    }

    if (changed.length) resetToken();

    return {
      success: true,
      updated: changed,
      message: changed.length
        ? `Updated: ${changed.join(', ')}. Token cache cleared.`
        : 'No values provided — nothing changed.'
    };
  }
};
