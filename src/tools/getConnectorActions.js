import { apiFetch } from '../auth.js';

export const getConnectorActionsTool = {
  name: 'get_connector_actions',
  description: 'List integrations (connector actions). Supports filtering by name, solution, task type, connector code, etc. Returns PagedResultDtoOfConnectorActionListDto.',
  inputSchema: {
    type: 'object',
    properties: {
      filter:               { type: 'string', description: 'Free-text filter by name (optional)' },
      solutionFilter:       { type: 'string', description: 'Solution ID (UUID) (optional)' },
      isLinking:            { type: 'boolean', description: 'List-for-link mode (optional)' },
      createdOnStartDate:   { type: 'string', description: 'ISO date-time (optional)' },
      createdOnEndDate:     { type: 'string', description: 'ISO date-time (optional)' },
      createdByUserId:      { type: 'number', description: 'AbpUserId int64 (optional)' },
      modifiedOnStartDate:  { type: 'string', description: 'ISO date-time (optional)' },
      modifiedOnEndDate:    { type: 'string', description: 'ISO date-time (optional)' },
      modifiedByUserId:     { type: 'number', description: 'AbpUserId int64 (optional)' },
      taskType:             { type: 'array', items: { type: 'string' }, description: 'Filter by ConnectorTaskType names (e.g. Rest, Sql, Soap, …) (optional)' },
      connectionCode:       { type: 'string', description: 'Filter by parent connector code (optional)' },
      publishState:         { type: 'number', description: 'Filter by publish state (int32) (optional)' },
      entityNames:          { type: 'array', items: { type: 'string' }, description: 'Filter by Druid entity names (optional)' },
      sortingType:          { type: 'string', description: 'Sorting key (optional)' },
      responseIsCollection: { type: 'boolean', description: 'Filter by ResponseIsCollection (optional)' },
      skipPaging:           { type: 'boolean', description: 'Return all rows ignoring paging (optional)' },
      integrationLocalScope:{ type: 'boolean', description: 'Restrict to integration local scope (optional)' },
      maxResultCount:       { type: 'number', description: 'Page size (default 10, max 1000)', default: 10 },
      skipCount:            { type: 'number', description: 'Records to skip (default 0)', default: 0 }
    }
  },
  async execute(args) {
    const params = new URLSearchParams();
    if (args.filter)               params.set('Filter',              args.filter);
    if (args.solutionFilter)       params.set('SolutionFilter',      args.solutionFilter);
    if (args.isLinking != null)    params.set('IsLinking',           String(args.isLinking));
    if (args.createdOnStartDate)   params.set('CreatedOnStartDate',  args.createdOnStartDate);
    if (args.createdOnEndDate)     params.set('CreatedOnEndDate',    args.createdOnEndDate);
    if (args.createdByUserId != null) params.set('CreatedByUserId',  String(args.createdByUserId));
    if (args.modifiedOnStartDate)  params.set('ModifiedOnStartDate', args.modifiedOnStartDate);
    if (args.modifiedOnEndDate)    params.set('ModifiedOnEndDate',   args.modifiedOnEndDate);
    if (args.modifiedByUserId != null) params.set('ModifiedByUserId', String(args.modifiedByUserId));
    if (Array.isArray(args.taskType))    args.taskType.forEach(t    => params.append('TaskType',    t));
    if (args.connectionCode)       params.set('ConnectionCode',      args.connectionCode);
    if (args.publishState != null) params.set('PublishState',        String(args.publishState));
    if (Array.isArray(args.entityNames)) args.entityNames.forEach(e => params.append('EntityNames', e));
    if (args.sortingType)          params.set('SortingType',         args.sortingType);
    if (args.responseIsCollection != null) params.set('ResponseIsCollection', String(args.responseIsCollection));
    if (args.skipPaging != null)   params.set('SkipPaging',          String(args.skipPaging));
    if (args.integrationLocalScope != null) params.set('IntegrationLocalScope', String(args.integrationLocalScope));
    params.set('MaxResultCount', String(args.maxResultCount ?? 10));
    params.set('SkipCount',      String(args.skipCount      ?? 0));

    const data = await apiFetch(`/api/services/app/ConnectorAction/GetConnectorActions?${params}`);
    return data.result ?? data;
  }
};
