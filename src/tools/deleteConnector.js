import { apiFetch } from '../auth.js';

export const deleteConnectorTool = {
  name: 'delete_connector',
  description: 'Delete a connector ("app") by its ID. Use `fromSolution=true` when removing only the link from a solution.',
  inputSchema: {
    type: 'object',
    properties: {
      id:           { type: 'string', description: 'Connector ID (UUID)' },
      fromSolution: { type: 'boolean', description: 'If true, only unlink from a solution (optional)' }
    },
    required: ['id']
  },
  async execute(args) {
    const params = new URLSearchParams();
    params.set('Id', args.id);
    if (args.fromSolution != null) params.set('fromSolution', String(args.fromSolution));

    await apiFetch(`/api/services/app/Connector/DeleteConnector?${params}`, { method: 'DELETE' });
    return { deleted: args.id };
  }
};
