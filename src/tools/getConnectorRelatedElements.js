import { apiFetch } from '../auth.js';

export const getConnectorRelatedElementsTool = {
  name: 'get_connector_related_elements',
  description: 'View all elements related to a connector ("app"). Returns array of RelatedElementDto (typically integrations / flow steps / other objects that reference this connector).',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Connector ID (UUID)' }
    },
    required: ['id']
  },
  async execute(args) {
    const params = new URLSearchParams();
    params.set('Id', args.id);

    const data = await apiFetch(`/api/services/app/Connector/GetRelatedElements?${params}`);
    return data.result ?? data;
  }
};
