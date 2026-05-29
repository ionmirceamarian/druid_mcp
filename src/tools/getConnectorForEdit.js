import { apiFetch } from '../auth.js';

export const getConnectorForEditTool = {
  name: 'get_connector_for_edit',
  description: 'View a single connector ("app") for editing. Pass no Id with a connectorType to get a blank template for that type. Returns TenantConnectorForEditOutputDto with connector (CreateTenantConnectorInput) and connectorType.',
  inputSchema: {
    type: 'object',
    properties: {
      id:                { type: 'string', description: 'Connector ID (UUID). Omit to get a blank template.' },
      connectorType:     { type: 'string', description: 'Connector type name (e.g. "Rest", "Sql", "Soap", required when creating new)' },
      fromObjectHistory: { type: 'boolean', description: 'Load from object history (default false)' }
    }
  },
  async execute(args) {
    const params = new URLSearchParams();
    if (args.id)            params.set('Id',                args.id);
    if (args.connectorType) params.set('connectorType',     args.connectorType);
    if (args.fromObjectHistory != null) params.set('fromObjectHistory', String(args.fromObjectHistory));

    const data = await apiFetch(`/api/services/app/Connector/GetConnectorForEdit?${params}`);
    return data.result ?? data;
  }
};
