import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readTenants, publicTenant } from './tools/setConfig.js';

const url = new URL(process.env.DRUID_MCP_URL);
const client = new Client({ name: 'druid-bridge', version: '0.1.0' });
await client.connect(url.pathname.endsWith('/sse') ? new SSEClientTransport(url) : new StreamableHTTPClientTransport(url));

const text = obj => ({ content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] });

const setConfigSchema = {
  type: 'object',
  properties: {
    listTenants: { type: 'boolean', description: 'Return the tenants defined in the local .env (no passwords)' },
    tenant: { type: 'string', description: 'Tenant host (e.g. asiacellqa) or .env label (e.g. ASIACELL QA); credentials are read from the local .env and sent to the server by the bridge' }
  }
};

const server = new Server({ name: 'druid', version: '0.1.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const { tools } = await client.listTools();
  return {
    tools: tools.map(t => t.name === 'set_config'
      ? { ...t, description: 'Switch the Druid tenant. Credentials stay in the local .env and never pass through the conversation.', inputSchema: setConfigSchema }
      : t)
  };
});

server.setRequestHandler(CallToolRequestSchema, async req => {
  const { name, arguments: args = {} } = req.params;
  if (name !== 'set_config') return client.callTool({ name, arguments: args });

  const tenants = readTenants();
  if (args.listTenants) return text({ tenants: tenants.map(publicTenant) });
  if (!args.tenant) return text({ success: false, message: 'Pass tenant or listTenants' });

  const q = args.tenant.trim().toLowerCase();
  const matches = tenants.filter(t => t.host.toLowerCase() === q || (t.label || '').toLowerCase() === q);
  if (matches.length !== 1) {
    return text({ success: false, message: matches.length ? `Ambiguous tenant "${args.tenant}"` : `Unknown tenant "${args.tenant}"`, tenants: tenants.map(publicTenant) });
  }

  const t = matches[0];
  const r = await client.callTool({ name: 'set_config', arguments: { apiBaseUrl: t.url, apiUsername: t.username, apiPassword: t.password } });
  if (r.isError) return r;
  return text({ success: true, active: publicTenant(t), message: 'Tenant switched. Token cache cleared.' });
});

await server.connect(new StdioServerTransport());
