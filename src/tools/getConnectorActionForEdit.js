import { apiFetch } from '../auth.js';

export const getConnectorActionForEditTool = {
  name: 'get_connector_action_for_edit',
  description: 'View a single integration (connector action) for editing. Pass no Id with `type` to get a blank template for that task type. Returns ConnectorActionForEditOutputDto (the connector action header — task body is fetched separately via the per-task-type endpoints).',
  inputSchema: {
    type: 'object',
    properties: {
      id:   { type: 'string', description: 'Connector action ID (UUID). Omit for a blank template.' },
      type: { type: 'string', description: 'Connector task type (e.g. "Rest", "Sql", "Soap") — required when creating new.' }
    }
  },
  async execute(args) {
    const params = new URLSearchParams();
    if (args.type) params.set('Type', args.type);
    if (args.id)   params.set('Id',   args.id);

    const data = await apiFetch(`/api/services/app/ConnectorAction/GetConnectorActionForEdit?${params}`);
    return data.result ?? data;
  }
};
