import { apiFetch } from '../auth.js';

export const getConnectorHistoryPagedTool = {
  name: 'get_connector_history_paged',
  description: 'Debug: list execution history rows for an integration (connector action). Filter by date range, correlationId, hasException, etc. Returns PagedResultDtoOfConnectorHistoryListItemData; drill into a specific row with get_connector_action_history_data_by_id.',
  inputSchema: {
    type: 'object',
    properties: {
      startDate:         { type: 'string', description: 'ISO date-time (optional)' },
      endDate:           { type: 'string', description: 'ISO date-time (optional)' },
      hasException:      { type: 'boolean', description: 'Only failing rows (optional)' },
      connectorActionId: { type: 'string', description: 'Connector action ID (UUID) (optional)' },
      correlationId:     { type: 'string', description: 'Correlation ID (UUID) (optional)' },
      userName:          { type: 'string', description: 'Filter by user name (optional)' },
      pageSize:          { type: 'number', description: 'Page size (default 100)', default: 100 },
      skipCount:         { type: 'number', description: 'Records to skip (default 0)', default: 0 }
    }
  },
  async execute(args) {
    const params = new URLSearchParams();
    if (args.startDate)              params.set('StartDate',         args.startDate);
    if (args.endDate)                params.set('EndDate',           args.endDate);
    if (args.hasException != null)   params.set('HasException',      String(args.hasException));
    if (args.connectorActionId)      params.set('ConnectorActionId', args.connectorActionId);
    if (args.correlationId)          params.set('CorrelationId',     args.correlationId);
    if (args.userName)               params.set('UserName',          args.userName);
    params.set('PageSize',  String(args.pageSize  ?? 100));
    params.set('SkipCount', String(args.skipCount ?? 0));

    const data = await apiFetch(`/api/services/app/ConnectorAction/GetHistoryPaged?${params}`);
    return data.result ?? data;
  }
};
