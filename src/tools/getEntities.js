import { apiFetch } from '../auth.js';

export const getEntitiesTool = {
  name: 'get_entities',
  description: 'List entity metadata (data models) in the application. Can filter by bot, solution, or name.',
  inputSchema: {
    type: 'object',
    properties: {
      filter: { type: 'string', description: 'Text filter on entity name (optional)' },
      botId: { type: 'string', description: 'Filter by bot ID (UUID, optional)' },
      solutionFilter: { type: 'string', description: 'Filter by solution ID (UUID, optional)' },
      maxResultCount: { type: 'number', default: 20 },
      skipCount: { type: 'number', default: 0 }
    }
  },
  async execute(args) {
    const params = new URLSearchParams();
    params.set('SolutionFilter', args.solutionFilter ?? '');
    params.set('BotId', '');
    params.set('SortingType', '');
    if (args.filter) params.set('Filter', args.filter);
    params.set('MaxResultCount', String(args.maxResultCount ?? 10));
    params.set('SkipCount', String(args.skipCount ?? 0));

    const data = await apiFetch(`/api/services/app/EntityMetadata/GetEntityMetadataListPaged?${params}`);
    return {
      totalCount: data.result?.totalCount ?? 0,
      items: (data.result?.items ?? []).map(e => ({
        id: e.id,
        name: e.name,
        category: e.category,
        utterances: e.utterances,
        publishState: e.publishState,
        creationTime: e.creationTime
      }))
    };
  }
};
