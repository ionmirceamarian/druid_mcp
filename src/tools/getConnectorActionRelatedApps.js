import { apiFetch } from '../auth.js';

export const getConnectorActionRelatedAppsTool = {
  name: 'get_connector_action_related_apps',
  description: 'List names of "apps" (connectors) related to an integration. Returns array of strings.',
  inputSchema: {
    type: 'object',
    properties: {
      connectorActionId: { type: 'string', description: 'Connector action ID (UUID)' }
    },
    required: ['connectorActionId']
  },
  async execute(args) {
    const params = new URLSearchParams();
    params.set('connectorActionId', args.connectorActionId);

    const data = await apiFetch(`/api/services/app/ConnectorAction/GetRelatedApps?${params}`);
    return data.result ?? data;
  }
};
