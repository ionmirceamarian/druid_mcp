// In-memory config store — values set here override process.env at runtime.
// The MCP client (e.g. Claude Desktop) can call set_config to update
// API_BASE_URL, API_USERNAME, and API_PASSWORD without restarting the server.

import { resetToken } from '../auth.js';

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
      apiBaseUrl:  { type: 'string', description: 'Base URL of the Druid application, e.g. https://myapp.example.com' },
      apiUsername: { type: 'string', description: 'Username (or email) for authentication' },
      apiPassword: { type: 'string', description: 'Password for authentication' }
    }
  },
  async execute(args) {
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
