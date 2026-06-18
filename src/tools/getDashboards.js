import { apiFetch } from '../auth.js';

export const getDashboardsTool = {
  name: 'get_dashboards',
  description: 'List dashboards with optional filters. Returns items[] with id, name, displayName, botName.',
  inputSchema: {
    type: 'object',
    properties: {
      botId:          { type: 'string', description: 'Bot UUID filter (optional)' },
      filter:         { type: 'string', description: 'Free-text name filter (optional)' },
      solutionFilter: { type: 'string', description: 'Solution UUID filter (optional)' },
      isLinking:      { type: 'boolean', description: 'List-for-link mode (optional)' }
    }
  },
  async execute(args) {
    const params = new URLSearchParams();
    if (args.botId)          params.set('BotId',          args.botId);
    if (args.filter)         params.set('Filter',         args.filter);
    if (args.solutionFilter) params.set('SolutionFilter', args.solutionFilter);
    if (args.isLinking != null) params.set('IsLinking',   String(args.isLinking));
    const data = await apiFetch(`/api/services/app/Dashboards/GetDashboards?${params}`);
    return data.result ?? data;
  }
};
