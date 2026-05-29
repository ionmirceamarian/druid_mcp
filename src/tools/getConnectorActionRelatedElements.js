import { apiFetch } from '../auth.js';

export const getConnectorActionRelatedElementsTool = {
  name: 'get_connector_action_related_elements',
  description: 'View all elements related to an integration (connector action). Returns array of RelatedElementDto (flow steps, apps, webviews that reference this integration).',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Connector action ID (UUID)' }
    },
    required: ['id']
  },
  async execute(args) {
    const params = new URLSearchParams();
    params.set('Id', args.id);

    const data = await apiFetch(`/api/services/app/ConnectorAction/GetRelatedElements?${params}`);
    return data.result ?? data;
  }
};
