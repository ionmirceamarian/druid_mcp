import { apiFetch } from '../auth.js';

export const cloneEntityWebViewTool = {
  name: 'clone_entity_web_view',
  description: 'Clone an existing entity view. Returns the new view UUID.',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', description: 'Source view UUID to clone' }
    }
  },
  async execute(args) {
    const data = await apiFetch(`/api/services/app/EntityMetadata/CloneEntityWebView?id=${args.id}`, {
      method: 'POST'
    });
    return data.result ?? data;
  }
};
