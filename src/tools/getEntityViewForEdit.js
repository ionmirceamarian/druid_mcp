import { apiFetch } from '../auth.js';

export const getEntityViewForEditTool = {
  name: 'get_entity_view_for_edit',
  description: 'Fetch the full definition of a view (columns, filters, sort, type, flows, roles, etc.) by its UUID, ready for editing.',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', description: 'View UUID' }
    }
  },
  async execute(args) {
    const data = await apiFetch(`/api/services/app/EntityMetadata/GetEntityViewForEdit?id=${args.id}`);
    return data.result ?? data;
  }
};
