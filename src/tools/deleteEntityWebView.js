import { apiFetch } from '../auth.js';

export const deleteEntityWebViewTool = {
  name: 'delete_entity_web_view',
  description: 'Delete an entity view by its UUID.',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', description: 'View UUID to delete' }
    }
  },
  async execute(args) {
    const data = await apiFetch(`/api/services/app/EntityMetadata/DeleteEntityWebView?id=${args.id}`, {
      method: 'DELETE'
    });
    return data.result ?? data;
  }
};
