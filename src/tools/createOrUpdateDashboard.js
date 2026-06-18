import { apiFetch } from '../auth.js';

export const createOrUpdateDashboardTool = {
  name: 'create_or_update_dashboard',
  description: 'Create or update a dashboard. Omit `id` to create. Returns the dashboard UUID.',
  inputSchema: {
    type: 'object',
    required: ['botId'],
    properties: {
      id:          { type: 'string', description: 'Dashboard UUID — omit to create' },
      botId:       { type: 'string', description: 'Bot UUID' },
      solutionId:  { type: 'string', description: 'Solution UUID (optional)' },
      name:        { type: 'string', description: 'Internal name' },
      displayName: { type: 'object', description: 'Localized display name map e.g. {"en":"My Dashboard"}', additionalProperties: { type: 'string' } },
      url:         { type: 'string', description: 'Custom URL slug (optional)' },
      pages: {
        type: 'array',
        description: 'Dashboard pages',
        items: {
          type: 'object',
          properties: {
            id:      { type: 'string', description: 'Page UUID' },
            name:    { type: 'string', description: 'Page name' },
            widgets: { type: 'array', description: 'Widget definitions', items: { type: 'object' } }
          }
        }
      }
    }
  },
  async execute(args) {
    const data = await apiFetch('/api/services/app/Dashboards/CreateOrUpdateDashboard', {
      method: 'POST',
      body: JSON.stringify(args)
    });
    return data.result ?? data;
  }
};
