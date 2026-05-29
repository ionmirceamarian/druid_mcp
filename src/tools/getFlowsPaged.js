import { apiFetch } from '../auth.js';

export const getFlowsPagedTool = {
  name: 'get_flows_paged',
  description: 'Search and list flows with optional filtering by name, solution, type, and pagination.',
  inputSchema: {
    type: 'object',
    properties: {
      filter:          { type: 'string', description: 'Filter by flow name (optional)' },
      solutionFilter:  { type: 'string', description: 'Filter by solution ID (optional)' },
      sortingType:     { type: 'string', description: 'Sorting type (optional)' },
      maxResultCount:  { type: 'number', description: 'Max number of results (default 10)', default: 10 },
      skipCount:       { type: 'number', description: 'Number of records to skip for pagination', default: 0 }
    }
  },
  async execute(args) {
    const params = new URLSearchParams();
    if (args.filter)         params.set('Filter', args.filter);
    if (args.solutionFilter) params.set('SolutionFilter', args.solutionFilter);
    if (args.sortingType)    params.set('SortingType', args.sortingType);
    params.set('MaxResultCount', String(args.maxResultCount ?? 10));
    params.set('SkipCount',      String(args.skipCount ?? 0));

    const data = await apiFetch(`/api/services/app/Flow/GetFlowsPaged?${params}`);
    return {
      totalCount: data.result?.totalCount ?? 0,
      items: (data.result?.items ?? []).map(f => ({
        id:           f.id,
        name:         f.name,
        category:     f.category,
        botId:        f.botId,
        isDisabled:   f.isDisabled,
        isTask:       f.isTask,
        isForm:       f.isForm,
        isReport:     f.isReport,
        isAgentic:    f.isAgentic,
        creationTime: f.creationTime
      }))
    };
  }
};
