import { apiFetch } from '../auth.js';

export const setEntityWebViewAsDefaultTool = {
  name: 'set_entity_web_view_as_default',
  description: 'Mark a view as the default view for its entity.',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', description: 'View UUID' }
    }
  },
  async execute(args) {
    const data = await apiFetch(`/api/services/app/EntityMetadata/SetEntityWebViewAsDefault?id=${args.id}`, {
      method: 'POST'
    });
    return data.result ?? data;
  }
};
