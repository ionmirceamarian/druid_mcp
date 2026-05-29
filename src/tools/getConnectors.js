import { apiFetch } from '../auth.js';

export const getConnectorsTool = {
  name: 'get_connectors',
  description: 'List "apps" / connectors (REST, SQL, SOAP, CRM, UiPath, etc.) with optional filters. Returns TenantConnectorListDto: items[] with id, code, name, connectorType, botName, configurationMissing, plus connectorTypes[] combobox.',
  inputSchema: {
    type: 'object',
    properties: {
      filter:               { type: 'string', description: 'Free-text filter by connector name/code (optional)' },
      solutionFilter:       { type: 'string', description: 'Solution ID (UUID) to filter by (optional)' },
      isLinking:            { type: 'boolean', description: 'List-for-link mode (optional)' },
      createdOnStartDate:   { type: 'string', description: 'ISO date-time (optional)' },
      createdOnEndDate:     { type: 'string', description: 'ISO date-time (optional)' },
      createdByUserId:      { type: 'number', description: 'AbpUserId int64 (optional)' },
      modifiedOnStartDate:  { type: 'string', description: 'ISO date-time (optional)' },
      modifiedOnEndDate:    { type: 'string', description: 'ISO date-time (optional)' },
      modifiedByUserId:     { type: 'number', description: 'AbpUserId int64 (optional)' },
      securityType:         { type: 'array', items: { type: 'string' }, description: 'Filter by ConnectorSecurityType (optional)' },
      sortingType:          { type: 'string', description: 'Sorting key (optional)' },
      connectorType:        { type: 'array', items: { type: 'string' }, description: 'Filter by ConnectorType ID (UUID) (optional)' },
      maxResultCount:       { type: 'number', description: 'Page size (default 10, max 1000)', default: 10 },
      skipCount:            { type: 'number', description: 'Records to skip (default 0)', default: 0 }
    }
  },
  async execute(args) {
    const params = new URLSearchParams();
    if (args.filter)              params.set('Filter',              args.filter);
    if (args.solutionFilter)      params.set('SolutionFilter',      args.solutionFilter);
    if (args.isLinking != null)   params.set('IsLinking',           String(args.isLinking));
    if (args.createdOnStartDate)  params.set('CreatedOnStartDate',  args.createdOnStartDate);
    if (args.createdOnEndDate)    params.set('CreatedOnEndDate',    args.createdOnEndDate);
    if (args.createdByUserId != null) params.set('CreatedByUserId', String(args.createdByUserId));
    if (args.modifiedOnStartDate) params.set('ModifiedOnStartDate', args.modifiedOnStartDate);
    if (args.modifiedOnEndDate)   params.set('ModifiedOnEndDate',   args.modifiedOnEndDate);
    if (args.modifiedByUserId != null) params.set('ModifiedByUserId', String(args.modifiedByUserId));
    if (Array.isArray(args.securityType))  args.securityType.forEach(s => params.append('SecurityType',  s));
    if (args.sortingType)         params.set('SortingType',         args.sortingType);
    if (Array.isArray(args.connectorType)) args.connectorType.forEach(c => params.append('ConnectorType', c));
    params.set('MaxResultCount', String(args.maxResultCount ?? 10));
    params.set('SkipCount',      String(args.skipCount      ?? 0));

    const data = await apiFetch(`/api/services/app/Connector/GetConnectors?${params}`);
    return data.result ?? data;
  }
};
