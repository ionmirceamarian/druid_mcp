import { apiFetch } from '../auth.js';

export const deleteConnectorActionTool = {
  name: 'delete_connector_action',
  description: 'Delete an integration (connector action) by its ID.',
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

    await apiFetch(`/api/services/app/ConnectorAction/DeleteConnectorAction?${params}`, { method: 'DELETE' });
    return { deleted: args.id };
  }
};
