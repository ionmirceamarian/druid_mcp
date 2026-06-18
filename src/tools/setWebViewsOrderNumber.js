import { apiFetch } from '../auth.js';

export const setWebViewsOrderNumberTool = {
  name: 'set_web_views_order_number',
  description: 'Reorder the views for an entity by providing an ordered list of view IDs.',
  inputSchema: {
    type: 'object',
    required: ['entityId', 'botId', 'orderedViewIds'],
    properties: {
      entityId:       { type: 'string', description: 'Entity UUID' },
      botId:          { type: 'string', description: 'Bot UUID' },
      orderedViewIds: { type: 'array', items: { type: 'string' }, description: 'View UUIDs in desired display order' }
    }
  },
  async execute(args) {
    const data = await apiFetch('/api/services/app/EntityMetadata/SetWebViewsOrderNumber', {
      method: 'POST',
      body: JSON.stringify(args)
    });
    return data.result ?? data;
  }
};
