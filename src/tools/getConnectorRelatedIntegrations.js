import { apiFetch } from '../auth.js';

export const getConnectorRelatedIntegrationsTool = {
  name: 'get_connector_related_integrations',
  description: 'List integration (connector action) names that use a given connector for a bot. Returns array of strings.',
  inputSchema: {
    type: 'object',
    properties: {
      connectorCode: { type: 'string', description: 'Connector code (max 20 chars)' },
      botId:         { type: 'string', description: 'Bot ID (UUID)' }
    },
    required: ['connectorCode', 'botId']
  },
  async execute(args) {
    const params = new URLSearchParams();
    params.set('connectorCode', args.connectorCode);
    params.set('botId',         args.botId);

    const data = await apiFetch(`/api/services/app/Connector/GetRelatedIntegrations?${params}`);
    return data.result ?? data;
  }
};
