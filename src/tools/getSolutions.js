import { apiFetch } from '../auth.js';

export const getSolutionsTool = {
  name: 'get_solutions',
  description: 'List solutions available in the application.',
  inputSchema: {
    type: 'object',
    properties: {
      botId: { type: 'string', description: 'Filter solutions by bot ID (UUID, optional)' },
      filter: { type: 'string', description: 'Text filter on solution name (optional)' },
      maxResultCount: { type: 'number', default: 20 },
      skipCount: { type: 'number', default: 0 }
    }
  },
  async execute(args) {
    const params = new URLSearchParams();
    if (args.botId) params.set('botId', args.botId);
    if (args.filter) params.set('filter', args.filter);
    params.set('MaxResultCount', String(args.maxResultCount ?? 20));
    params.set('SkipCount', String(args.skipCount ?? 0));

    // Solutions are listed via the Solution service
    const data = await apiFetch(`/api/services/app/Dictionary/GetNavigationMenuSolutions?${params}`);
    // GetNavigationMenuSolutions returns result as a plain array (not paginated)
    const items = Array.isArray(data.result) ? data.result : (data.result?.items ?? []);
    return {
      totalCount: items.length,
      items: items.map(s => ({
        id: s.id,
        name: s.name,
        botId: s.botId,
        category: s.category,
        description: s.description
      }))
    };
  }
};
