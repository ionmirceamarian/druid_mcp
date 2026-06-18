import { apiFetch } from '../auth.js';

export const getEntityWebViewsTool = {
  name: 'get_entity_web_views',
  description: 'List all views (Table, Kanban, Calendar, Tree, etc.) defined for a given entity. Returns an array of EntityWebViewListDto items with id, name, displayName, type, isDefault.',
  inputSchema: {
    type: 'object',
    required: ['entityId', 'botId'],
    properties: {
      entityId: { type: 'string', description: 'Entity UUID' },
      botId:    { type: 'string', description: 'Bot / application UUID' }
    }
  },
  async execute(args) {
    const params = new URLSearchParams({ entityId: args.entityId, botId: args.botId });
    const data = await apiFetch(`/api/services/app/EntityMetadata/GetEntityWebViews?${params}`);
    return data.result ?? data;
  }
};
